/**
 * OpenCode Brain - Session End Hook
 * 
 * Generates session summary and captures file changes.
 */

import type { Mind } from "../core/mind.js"
import { debug } from "../utils/helpers.js"

// BunShell type from OpenCode plugin context
interface BunShell {
  (strings: TemplateStringsArray, ...values: unknown[]): {
    cwd(dir: string): { text(): Promise<string> }
    text(): Promise<string>
  }
}

const MIN_OBSERVATIONS_FOR_SUMMARY = 3

// File patterns for find
const FILE_EXTENSIONS = [
  "*.ts", "*.tsx", "*.js", "*.jsx",
  "*.md", "*.json", "*.py", "*.rs",
  "*.go", "*.java", "*.c", "*.cpp",
]

// Important files that get individual entries
const IMPORTANT_FILE_PATTERN = /^(README|CHANGELOG|package\.json|Cargo\.toml|\.env)/i

/**
 * Handle session end
 */
export async function handleSessionEnd(
  directory: string,
  getMind: () => Promise<Mind>,
  $: BunShell
): Promise<void> {
  const mind = await getMind()
  
  // Capture file changes
  await captureFileChanges(mind, directory, $)
  
  // Get session observations
  const context = await mind.getContext()
  const sessionObs = context.recentObservations.filter(
    obs => obs.metadata?.sessionId === mind.getSessionId()
  )
  
  // Generate summary if enough observations
  if (sessionObs.length >= MIN_OBSERVATIONS_FOR_SUMMARY) {
    const summary = generateSessionSummary(sessionObs)
    await mind.saveSessionSummary(summary)
    debug(`Session summary saved: ${summary.keyDecisions.length} decisions, ${summary.filesModified.length} files`)
  }
}

/**
 * Capture file changes via git and find
 */
async function captureFileChanges(
  mind: Mind,
  directory: string,
  $: BunShell
): Promise<void> {
  try {
    const allFiles: string[] = []
    let gitDiffContent = ""
    
    // Git tracked changes
    try {
      const diff = await $`git diff --name-only HEAD 2>/dev/null || echo ''`.cwd(directory).text()
      allFiles.push(...diff.trim().split("\n").filter(Boolean))
    } catch {
      // Not a git repo
    }
    
    // Staged changes
    try {
      const staged = await $`git diff --cached --name-only 2>/dev/null || echo ''`.cwd(directory).text()
      allFiles.push(...staged.trim().split("\n").filter(Boolean))
    } catch {
      // Ignore
    }
    
    // Git diff stats
    if (allFiles.length > 0) {
      try {
        gitDiffContent = await $`git diff HEAD --stat 2>/dev/null | head -30`.cwd(directory).text()
      } catch {
        // Ignore
      }
    }
    
    // Recent files (last 30 minutes)
    try {
      const extPattern = FILE_EXTENSIONS.map(e => `-name "${e}"`).join(" -o ")
      const recent = await $`find . -maxdepth 4 -type f \( ${extPattern} \) -mmin -30 ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/build/*" ! -path "*/.next/*" ! -path "*/target/*" 2>/dev/null | head -30`.cwd(directory).text()
      const recentFiles = recent.trim().split("\n").filter(Boolean).map((f: string) => f.replace(/^\.\//, ""))
      
      for (const file of recentFiles) {
        if (!allFiles.includes(file)) {
          allFiles.push(file)
        }
      }
    } catch {
      // Ignore
    }
    
    // Deduplicate
    const uniqueFiles = [...new Set(allFiles)]
    
    if (uniqueFiles.length === 0) {
      debug("No file changes detected")
      return
    }
    
    debug(`Capturing ${uniqueFiles.length} changed files`)
    
    // Build content
    const contentParts = [
      `## Files Modified This Session\n\n${uniqueFiles.map(f => `- ${f}`).join("\n")}`
    ]
    
    if (gitDiffContent) {
      contentParts.push(`\n## Git Changes Summary\n\`\`\`\n${gitDiffContent.trim()}\n\`\`\``)
    }
    
    // Store the changes
    await mind.remember({
      type: "refactor",
      summary: `Session edits: ${uniqueFiles.length} file(s) modified`,
      content: contentParts.join("\n"),
      tool: "FileChanges",
      metadata: {
        files: uniqueFiles,
        fileCount: uniqueFiles.length,
        captureMethod: "git-diff-plus-recent",
        source: "opencode",
      },
    })
    
    // Store individual entries for important files
    for (const file of uniqueFiles) {
      const fileName = file.split("/").pop() || file
      if (IMPORTANT_FILE_PATTERN.test(fileName)) {
        await mind.remember({
          type: "refactor",
          summary: `Modified ${fileName}`,
          content: `File edited: ${file}\nThis file was modified during the session.`,
          tool: "FileEdit",
          metadata: {
            files: [file],
            fileName,
            source: "opencode",
          },
        })
        debug(`Stored individual edit: ${fileName}`)
      }
    }
    
    debug(`Stored file changes: ${uniqueFiles.length} files`)
  } catch (err) {
    debug(`Failed to capture file changes: ${err}`)
  }
}

/**
 * Generate session summary from observations
 */
function generateSessionSummary(observations: Array<{
  type: string
  summary: string
  content: string
  metadata?: { files?: string[]; sessionId?: string; [key: string]: unknown }
}>): {
  keyDecisions: string[]
  filesModified: string[]
  summary: string
} {
  const keyDecisions: string[] = []
  const filesModified = new Set<string>()
  const typeCounts: Record<string, number> = {}
  
  for (const obs of observations) {
    // Track decisions
    if (
      obs.type === "decision" ||
      obs.summary.toLowerCase().includes("chose") ||
      obs.summary.toLowerCase().includes("decided")
    ) {
      keyDecisions.push(obs.summary)
    }
    
    // Track files
    const files = obs.metadata?.files as string[] | undefined
    if (files) {
      files.forEach(f => filesModified.add(f))
    }
    
    // Count types
    typeCounts[obs.type] = (typeCounts[obs.type] || 0) + 1
  }
  
  // Generate summary
  const parts: string[] = []
  if (typeCounts.feature) parts.push(`Added ${typeCounts.feature} feature(s)`)
  if (typeCounts.bugfix) parts.push(`Fixed ${typeCounts.bugfix} bug(s)`)
  if (typeCounts.refactor) parts.push(`Refactored ${typeCounts.refactor} item(s)`)
  if (typeCounts.discovery) parts.push(`Made ${typeCounts.discovery} discovery(ies)`)
  if (typeCounts.problem) parts.push(`Encountered ${typeCounts.problem} problem(s)`)
  if (typeCounts.solution) parts.push(`Found ${typeCounts.solution} solution(s)`)
  
  const summary = parts.length > 0
    ? parts.join(". ") + "."
    : `Session with ${observations.length} observations.`
  
  return {
    keyDecisions: keyDecisions.slice(0, 10),
    filesModified: Array.from(filesModified).slice(0, 20),
    summary,
  }
}
