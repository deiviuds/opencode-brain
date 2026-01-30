/**
 * OpenCode Brain - Cross-Process Deduplication
 * 
 * Prevents duplicate observations across parallel hook invocations.
 * Tool-aware: dedup within each tool, allow cross-tool observations.
 */

import { createHash } from "node:crypto"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { withMindLock } from "./lock.js"

interface DedupEntry {
  timestamp: number
  hash: string
  source: string
}

const DEDUP_WINDOW_MS = 60000 // 1 minute

/**
 * Get dedup file path
 */
function getDedupPath(directory: string): string {
  return `${directory}/.claude/mind-dedup.log`
}

/**
 * Check if observation is duplicate
 * 
 * Dedup key includes source (tool), so:
 * - Claude Code reading file.ts + OpenCode reading file.ts = BOTH stored (different sources)
 * - Same tool reading file.ts twice in parallel = ONE stored (same source)
 */
export async function isDuplicateAcrossProcesses(
  directory: string,
  source: string,
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<boolean> {
  // Include source in hash so cross-tool reads are NOT deduplicated
  const hash = createHash("md5")
    .update(`${source}:${toolName}:${JSON.stringify(toolInput).slice(0, 200)}`)
    .digest("hex")
  
  const dedupPath = getDedupPath(directory)
  const lockPath = `${dedupPath}.lock`
  
  await mkdir(dirname(dedupPath), { recursive: true })
  
  return withMindLock(lockPath, async () => {
    const content = await readFile(dedupPath, "utf8").catch(() => "")
    const now = Date.now()
    
    // Parse and filter old entries
    const entries: DedupEntry[] = content.trim().split("\n")
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter((e): e is DedupEntry => e !== null && now - e.timestamp < DEDUP_WINDOW_MS)
    
    // Check for duplicate (same hash = same source + tool + input)
    if (entries.some(e => e.hash === hash)) {
      return true
    }
    
    // Add new entry
    entries.push({ timestamp: now, hash, source })
    await writeFile(
      dedupPath,
      entries.map(e => JSON.stringify(e)).join("\n")
    )
    
    return false
  })
}
