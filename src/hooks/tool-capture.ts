/**
 * OpenCode Brain - Tool Capture Hook
 * 
 * Captures observations after each tool execution.
 * Uses compression and deduplication for efficient storage.
 */

import { compressToolOutput } from "../utils/compression.js"
import { classifyObservationType, debug } from "../utils/helpers.js"
import type { Mind } from "../core/mind.js"

// Tools to observe
const OBSERVED_TOOLS = new Set([
  "read",
  "edit",
  "write",
  "bash",
  "grep",
  "glob",
  "webfetch",
  "websearch",
  "task",
  "codesearch",
  "notebookedit",
  "update",
])

// Always capture regardless of output length
const ALWAYS_CAPTURE_TOOLS = new Set([
  "edit",
  "write",
  "update",
  "notebookedit",
])

// Output thresholds
const MIN_OUTPUT_LENGTH = 50
const MAX_OUTPUT_LENGTH = 2500

// Skip patterns
const SKIP_PATTERNS = [
  "<system-reminder>",
  "<memvid-mind-context>",
  "<opencode-mind-context>",
]

// Deduplication cache
const recentObservations = new Map<string, number>()
const DEDUP_WINDOW_MS = 60000
const CACHE_MAX_SIZE = 100
const CACHE_STALE_MS = 120000

function getObservationKey(toolName: string, callId: string): string {
  return `${toolName}:${callId}`
}

function isDuplicate(key: string): boolean {
  const lastSeen = recentObservations.get(key)
  if (!lastSeen) return false
  return Date.now() - lastSeen < DEDUP_WINDOW_MS
}

function markObserved(key: string): void {
  recentObservations.set(key, Date.now())
  
  if (recentObservations.size > CACHE_MAX_SIZE) {
    const now = Date.now()
    for (const [k, v] of recentObservations.entries()) {
      if (now - v > CACHE_STALE_MS) {
        recentObservations.delete(k)
      }
    }
  }
}

/**
 * Handle tool output capture
 */
export async function handleToolCapture(
  input: { tool: string; sessionID: string; callID: string },
  output: { title: string; output: string; metadata: Record<string, unknown> },
  getMind: () => Promise<Mind>
): Promise<void> {
  const toolName = input.tool.toLowerCase()
  
  // Skip non-observed tools
  if (!OBSERVED_TOOLS.has(toolName)) {
    return
  }
  
  // Dedup check
  const key = getObservationKey(toolName, input.callID)
  if (isDuplicate(key)) {
    debug(`Skipping duplicate: ${toolName}`)
    return
  }
  
  const toolOutput = output.output || ""
  
  // Skip short outputs (except always-capture)
  if (!ALWAYS_CAPTURE_TOOLS.has(toolName) && toolOutput.length < MIN_OUTPUT_LENGTH) {
    return
  }
  
  // Skip system content
  if (SKIP_PATTERNS.some(p => toolOutput.includes(p))) {
    return
  }
  
  // For file modifications with minimal output
  let effectiveOutput = toolOutput
  if (ALWAYS_CAPTURE_TOOLS.has(toolName) && effectiveOutput.length < MIN_OUTPUT_LENGTH) {
    const filePath = output.metadata?.filePath as string || output.metadata?.file_path as string || "unknown"
    const fileName = filePath.split("/").pop() || "file"
    effectiveOutput = `File modified: ${fileName}\nPath: ${filePath}\nTool: ${toolName}`
  }
  
  // Compress
  const { compressed, wasCompressed, originalSize } = compressToolOutput(
    toolName,
    output.metadata,
    effectiveOutput
  )
  
  // Store with source attribution
  const mind = await getMind()
  const type = classifyObservationType(toolName, compressed)
  
  await mind.remember({
    type,
    summary: output.title || `${toolName} completed`,
    content: compressed.slice(0, MAX_OUTPUT_LENGTH),
    tool: toolName,
    metadata: {
      ...(output.metadata || {}),
      compressed: wasCompressed,
      originalSize: wasCompressed ? originalSize : undefined,
    },
  })
  
  markObserved(key)
  debug(`Captured: [${type}] ${output.title || toolName}${wasCompressed ? " (compressed)" : ""}`)
}
