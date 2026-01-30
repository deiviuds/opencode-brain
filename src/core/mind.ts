/**
 * OpenCode Brain - Core Mind Engine
 * 
 * The brain behind OpenCode's persistent memory.
 * Stores everything in ONE portable .mv2 file.
 * Compatible with claude-brain - shares the same .claude/mind.mv2 file.
 */

import { existsSync, statSync, readdirSync, unlinkSync, renameSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { mkdir } from "node:fs/promises"
import {
  type Observation,
  type ObservationType,
  type SessionSummary,
  type InjectedContext,
  type MindConfig,
  type MindStats,
  type MemorySearchResult,
  type RememberInput,
  DEFAULT_CONFIG,
} from "../types.js"
import { generateId, estimateTokens, normalizeTimestamp, debug } from "../utils/helpers.js"
import { withMindLock } from "../utils/lock.js"

// Lazy-loaded SDK
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Memvid = any
let sdkLoaded = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let use: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let create: any

async function loadSDK(): Promise<void> {
  if (sdkLoaded) return
  const sdk = await import("@memvid/sdk")
  use = sdk.use
  create = sdk.create
  sdkLoaded = true
}

// Corruption detection patterns
const CORRUPTION_PATTERNS = [
  "Deserialization",
  "UnexpectedVariant",
  "Invalid",
  "corrupt",
  "validation failed",
  "unable to recover",
  "table of contents",
  "version mismatch",
]

const MAX_FILE_SIZE_MB = 100

/**
 * Prune old backup files
 */
function pruneBackups(memoryPath: string, keepCount: number): void {
  try {
    const dir = dirname(memoryPath)
    const baseName = memoryPath.split("/").pop() || "mind.mv2"
    const backupPattern = new RegExp(`^${baseName.replace(".", "\\.")}\\.backup-\\d+$`)
    
    const files = readdirSync(dir)
    const backups = files
      .filter(f => backupPattern.test(f))
      .map(f => ({
        name: f,
        path: resolve(dir, f),
        time: parseInt(f.split("-").pop() || "0", 10),
      }))
      .sort((a, b) => b.time - a.time)
    
    for (let i = keepCount; i < backups.length; i++) {
      try {
        unlinkSync(backups[i].path)
        debug(`Pruned old backup: ${backups[i].name}`)
      } catch {
        // Ignore errors deleting backups
      }
    }
  } catch {
    // Ignore errors during pruning
  }
}

/**
 * Mind - OpenCode's portable memory engine
 */
export class Mind {
  private memvid: Memvid
  private config: MindConfig
  private sessionId: string
  private directory: string
  private initialized = false
  private sessionStartTime: number

  private constructor(memvid: Memvid, config: MindConfig, directory: string) {
    this.memvid = memvid
    this.config = config
    this.directory = directory
    this.sessionId = generateId()
    this.sessionStartTime = Date.now()
  }

  /**
   * Open or create a Mind instance
   */
  static async open(directory: string, configOverrides: Partial<MindConfig> = {}): Promise<Mind> {
    await loadSDK()
    
    const config = { ...DEFAULT_CONFIG, ...configOverrides }
    const memoryPath = resolve(directory, config.memoryPath)
    const memoryDir = dirname(memoryPath)
    
    // Ensure directory exists
    await mkdir(memoryDir, { recursive: true })
    
    let memvid: Memvid
    
    await withMindLock(memoryPath, async () => {
      if (!existsSync(memoryPath)) {
        debug(`Creating new memory file: ${memoryPath}`)
        memvid = await create(memoryPath, "basic")
        return
      }
      
      // Check file size
      const fileSize = statSync(memoryPath).size
      const fileSizeMB = fileSize / (1024 * 1024)
      
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        debug(`Memory file too large (${fileSizeMB.toFixed(1)}MB), creating fresh memory`)
        const backupPath = `${memoryPath}.backup-${Date.now()}`
        try {
          renameSync(memoryPath, backupPath)
        } catch {
          // Ignore
        }
        memvid = await create(memoryPath, "basic")
        return
      }
      
      try {
        memvid = await use("basic", memoryPath)
        debug(`Opened existing memory: ${memoryPath}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        
        if (CORRUPTION_PATTERNS.some(p => msg.includes(p))) {
          debug(`Memory file corrupted, creating fresh memory`)
          const backupPath = `${memoryPath}.backup-${Date.now()}`
          try {
            renameSync(memoryPath, backupPath)
          } catch {
            try {
              unlinkSync(memoryPath)
            } catch {
              // Ignore
            }
          }
          memvid = await create(memoryPath, "basic")
          return
        }
        throw err
      }
    })

    const mind = new Mind(memvid!, config, directory)
    mind.initialized = true
    
    // Prune old backups
    pruneBackups(memoryPath, 3)
    
    return mind
  }

  /**
   * Execute with lock
   */
  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const memoryPath = resolve(this.directory, this.config.memoryPath)
    return withMindLock(memoryPath, fn)
  }

  /**
   * Set session ID (for external session tracking)
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId
  }

  /**
   * Remember an observation
   * 
   * IMPORTANT: Re-opens memvid inside the lock to prevent stale SDK state
   * when multiple processes write concurrently.
   */
  async remember(input: RememberInput): Promise<string> {
    // Allow override of sessionId from input metadata
    const effectiveSessionId = (input.metadata?.sessionId as string) || this.sessionId
    
    // Validate source type
    const VALID_SOURCES = ["opencode", "claude-code"] as const
    type Source = typeof VALID_SOURCES[number]
    const rawSource = input.metadata?.source as string | undefined
    const effectiveSource: Source = 
      rawSource && (VALID_SOURCES as readonly string[]).includes(rawSource)
        ? (rawSource as Source)
        : "opencode"
    
    const observation: Observation = {
      id: generateId(),
      timestamp: Date.now(),
      type: input.type,
      tool: input.tool,
      summary: input.summary,
      content: input.content,
      metadata: {
        ...input.metadata,
        sessionId: effectiveSessionId,
        source: effectiveSource,
      },
    }

    const frameId = await this.withLock(async () => {
      // Re-open memvid to get fresh state (prevents stale SDK state corruption)
      await loadSDK()
      const memoryPath = this.getMemoryPath()
      const freshMemvid = await use("basic", memoryPath)
      
      return freshMemvid.put({
        title: `[${observation.type}] ${observation.summary}`,
        label: observation.type,
        text: observation.content,
        metadata: {
          observationId: observation.id,
          timestamp: observation.timestamp,
          tool: observation.tool,
          sessionId: effectiveSessionId,
          source: effectiveSource,
          ...observation.metadata,
        },
        tags: [observation.type, observation.tool].filter(Boolean) as string[],
      })
    })

    debug(`Remembered: ${observation.summary}`)
    return frameId
  }

  /**
   * Search memories by query
   */
  async search(query: string, limit = 10): Promise<MemorySearchResult[]> {
    return this.withLock(async () => {
      return this.searchUnlocked(query, limit)
    })
  }

  private async searchUnlocked(query: string, limit: number): Promise<MemorySearchResult[]> {
    const results = await this.memvid.find(query, { k: limit, mode: "lex" })
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (results.frames || []).map((frame: any) => ({
      observation: {
        id: frame.metadata?.observationId || frame.frame_id,
        timestamp: normalizeTimestamp(frame.metadata?.timestamp || 0),
        type: frame.label as ObservationType,
        tool: frame.metadata?.tool,
        summary: frame.title?.replace(/^\[.*?\]\s*/, "") || "",
        content: frame.text || "",
        metadata: frame.metadata,
      },
      score: frame.score || 0,
      snippet: frame.snippet || frame.text?.slice(0, 200) || "",
    }))
  }

  /**
   * Ask the memory a question
   */
  async ask(question: string): Promise<string> {
    return this.withLock(async () => {
      const result = await this.memvid.ask(question, { k: 5, mode: "lex" })
      return result.answer || "No relevant memories found."
    })
  }

  /**
   * Get context for session
   */
  async getContext(query?: string): Promise<InjectedContext> {
    return this.withLock(async () => {
      const timeline = await this.memvid.timeline({
        limit: this.config.maxContextObservations,
        reverse: true,
      })
      
      const frames = Array.isArray(timeline) ? timeline : (timeline.frames || [])
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recentObservations: Observation[] = frames.map((frame: any) => {
        const ts = normalizeTimestamp(frame.metadata?.timestamp || frame.timestamp || 0)
        return {
          id: frame.metadata?.observationId || frame.frame_id,
          timestamp: ts,
          type: (frame.label || frame.metadata?.type || "observation") as ObservationType,
          tool: frame.metadata?.tool,
          summary: frame.title?.replace(/^\[.*?\]\s*/, "") || frame.preview?.slice(0, 100) || "",
          content: frame.text || frame.preview || "",
          metadata: frame.metadata,
        }
      })
      
      let relevantMemories: Observation[] = []
      if (query) {
        const searchResults = await this.searchUnlocked(query, 10)
        relevantMemories = searchResults.map(r => r.observation)
      }
      
      // Build context with token limit
      let tokenCount = 0
      for (const obs of recentObservations) {
        const text = `[${obs.type}] ${obs.summary}`
        const tokens = estimateTokens(text)
        if (tokenCount + tokens > this.config.maxContextTokens) break
        tokenCount += tokens
      }
      
      return {
        recentObservations,
        relevantMemories,
        sessionSummaries: [],
        tokenCount,
      }
    })
  }

  /**
   * Save a session summary
   * 
   * IMPORTANT: Re-opens memvid inside the lock to prevent stale SDK state.
   */
  async saveSessionSummary(summary: {
    keyDecisions: string[]
    filesModified: string[]
    summary: string
  }): Promise<string> {
    // Get actual observation count for this session
    const context = await this.getContext()
    const sessionObs = context.recentObservations.filter(
      obs => obs.metadata?.sessionId === this.sessionId
    )
    
    const sessionSummary: SessionSummary = {
      id: this.sessionId,
      startTime: this.sessionStartTime,
      endTime: Date.now(),
      observationCount: sessionObs.length,
      keyDecisions: summary.keyDecisions,
      filesModified: summary.filesModified,
      summary: summary.summary,
    }

    return this.withLock(async () => {
      // Re-open memvid to get fresh state (prevents stale SDK state corruption)
      await loadSDK()
      const memoryPath = this.getMemoryPath()
      const freshMemvid = await use("basic", memoryPath)
      
      return freshMemvid.put({
        title: `Session Summary: ${new Date().toISOString().split("T")[0]}`,
        label: "session",
        text: JSON.stringify(sessionSummary, null, 2),
        metadata: {
          ...sessionSummary,
          source: "opencode",
        },
        tags: ["session", "summary"],
      })
    })
  }

  /**
   * Get memory statistics
   */
  async stats(): Promise<MindStats> {
    return this.withLock(async () => {
      const stats = await this.memvid.stats()
      
      // Get all frames for type aggregation
      // Limit to 1000 to avoid performance issues on large memories
      const allTimeline = await this.memvid.timeline({ limit: 1000, reverse: true })
      const allFrames = Array.isArray(allTimeline) ? allTimeline : (allTimeline.frames || [])
      
      // Get oldest and newest for timestamps
      const timeline = await this.memvid.timeline({ limit: 1, reverse: false })
      const recentTimeline = await this.memvid.timeline({ limit: 1, reverse: true })
      
      const oldestFrames = Array.isArray(timeline) ? timeline : (timeline.frames || [])
      const newestFrames = Array.isArray(recentTimeline) ? recentTimeline : (recentTimeline.frames || [])
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldest = oldestFrames[0] as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newest = newestFrames[0] as any
      
      // Count sessions and aggregate types
      let totalSessions = 0
      const topTypes: Partial<Record<ObservationType, number>> = {}
      
      // Valid observation types (not session summaries)
      const validTypes = new Set<string>([
        "discovery", "decision", "problem", "solution", "pattern",
        "warning", "success", "refactor", "bugfix", "feature"
      ])
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const frame of allFrames as any[]) {
        const label = frame.label
        
        // Count sessions
        if (label === "session") {
          totalSessions++
          continue
        }
        
        // Aggregate observation types
        if (label && validTypes.has(label)) {
          const type = label as ObservationType
          topTypes[type] = (topTypes[type] || 0) + 1
        }
      }
      
      return {
        totalObservations: (stats.frame_count as number) || 0,
        totalSessions,
        oldestMemory: normalizeTimestamp(oldest?.metadata?.timestamp || oldest?.timestamp || 0),
        newestMemory: normalizeTimestamp(newest?.metadata?.timestamp || newest?.timestamp || 0),
        fileSize: (stats.size_bytes as number) || 0,
        topTypes,
      }
    })
  }

  getSessionId(): string {
    return this.sessionId
  }

  getMemoryPath(): string {
    return resolve(this.directory, this.config.memoryPath)
  }

  getConfig(): MindConfig {
    return this.config
  }

  isInitialized(): boolean {
    return this.initialized
  }
}

// Singleton instance
let mindInstance: Mind | null = null

/**
 * Get or create the Mind singleton
 */
export async function getMind(directory: string, config?: Partial<MindConfig>): Promise<Mind> {
  if (!mindInstance) {
    mindInstance = await Mind.open(directory, config)
  }
  return mindInstance
}

/**
 * Reset the Mind singleton
 */
export function resetMind(): void {
  mindInstance = null
}
