/**
 * OpenCode Brain - Session Management
 * 
 * Provides persistent session ID tracking across hook invocations.
 * Works with claude-brain for cross-tool compatibility.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { withMindLock } from "./lock.js"

export interface SessionInfo {
  sessionId: string
  source: "opencode" | "claude-code" | "unknown"
  startTime: number
}

/**
 * Get session file path for a specific source
 */
function getSessionPath(directory: string, source: string): string {
  return `${directory}/.claude/mind-session-${source}.json`
}

/**
 * Detect which tool we're running under
 */
export function detectSource(): "opencode" | "claude-code" | "unknown" {
  // OpenCode sets OPENCODE_SESSION_ID or similar
  if (process.env.OPENCODE_SESSION_ID) return "opencode"
  if (process.env.OPENCODE_DIR) return "opencode"
  // Claude Code sets CLAUDE_PROJECT_DIR
  if (process.env.CLAUDE_PROJECT_DIR && !process.env.OPENCODE_SESSION_ID) return "claude-code"
  // Default to opencode if running as opencode plugin
  return "opencode"
}

/**
 * Write session info (called at session start)
 */
export async function writeSessionInfo(
  directory: string,
  sessionId: string,
  source: "opencode" | "claude-code" | "unknown"
): Promise<void> {
  const sessionPath = getSessionPath(directory, source)
  const lockPath = `${sessionPath}.lock`
  
  await mkdir(dirname(sessionPath), { recursive: true })
  
  await withMindLock(lockPath, async () => {
    const info: SessionInfo = {
      sessionId,
      source,
      startTime: Date.now(),
    }
    await writeFile(sessionPath, JSON.stringify(info))
  })
}

/**
 * Read session info (called by tool hooks)
 */
export async function readSessionInfo(
  directory: string,
  source: "opencode" | "claude-code" | "unknown"
): Promise<SessionInfo | null> {
  const sessionPath = getSessionPath(directory, source)
  
  try {
    const content = await readFile(sessionPath, "utf8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Get or create session ID for current context
 */
export async function getSessionId(
  directory: string,
  fallbackId?: string
): Promise<string> {
  const source = detectSource()
  const info = await readSessionInfo(directory, source)
  
  if (info?.sessionId) {
    return info.sessionId
  }
  
  // Return fallback or generate new
  return fallbackId || `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
