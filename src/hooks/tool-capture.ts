/**
 * OpenCode Brain - Tool Capture Hook
 * 
 * Captures observations after each tool execution.
 * Uses compression and cross-process deduplication for efficient storage.
 */

import { compressToolOutput } from "../utils/compression.js"
import { classifyObservationType, debug } from "../utils/helpers.js"
import { isDuplicateAcrossProcesses } from "../utils/dedup.js"
import { detectSource, getSessionId } from "../utils/session.js"
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

/**
 * Handle tool output capture
 */
export async function handleToolCapture(
  input: { tool: string; sessionID: string; callID: string },
  output: { title: string; output: string; metadata: Record<string, unknown> },
  getMind: () => Promise<Mind>,
  directory?: string
): Promise<void> {
  const toolName = input.tool.toLowerCase()
  
  // Skip non-observed tools
  if (!OBSERVED_TOOLS.has(toolName)) {
    return
  }
  
  // Get directory for dedup
  const dir = directory || process.env.OPENCODE_DIR || process.cwd()
  const source = detectSource()
  
  // Cross-process deduplication check
  const toolInput = output.metadata || {}
  if (await isDuplicateAcrossProcesses(dir, source, toolName, toolInput)) {
    debug(`Skipping duplicate (cross-process): ${toolName}`)
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
  
  // Store with source attribution
  const mind = await getMind()
  
  // Get persistent session ID
  const sessionId = await getSessionId(dir, input.sessionID)
  
  // Compress (respecting config)
  const { compressed, wasCompressed, originalSize } = compressToolOutput(
    toolName,
    output.metadata,
    effectiveOutput,
    mind.getConfig().autoCompress
  )
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
      sessionId,
      source,
    },
  })
  
  debug(`Captured: [${type}] ${output.title || toolName}${wasCompressed ? " (compressed)" : ""}`)
}
