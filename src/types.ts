/**
 * OpenCode Brain - Types
 * 
 * Identical to claude-brain types for full interoperability.
 * Both tools share the same .claude/mind.mv2 file.
 */

/**
 * Observation types - same as claude-brain
 */
export type ObservationType =
  | "discovery"
  | "decision"
  | "problem"
  | "solution"
  | "pattern"
  | "warning"
  | "success"
  | "refactor"
  | "bugfix"
  | "feature"

/**
 * An observation stored in memory
 */
export interface Observation {
  id: string
  timestamp: number
  type: ObservationType
  tool?: string
  summary: string
  content: string
  metadata?: ObservationMetadata
}

/**
 * Metadata attached to observations
 */
export interface ObservationMetadata {
  files?: string[]
  functions?: string[]
  error?: string
  confidence?: number
  tags?: string[]
  sessionId?: string
  source?: "opencode" | "claude-code"
  compressed?: boolean
  originalSize?: number
  [key: string]: unknown
}

/**
 * Mind configuration
 */
export interface MindConfig {
  memoryPath: string
  maxContextObservations: number
  maxContextTokens: number
  autoCompress: boolean
  minConfidence: number
  debug: boolean
}

/**
 * Default configuration - uses .claude/mind.mv2 for compatibility with claude-brain
 */
export const DEFAULT_CONFIG: MindConfig = {
  memoryPath: ".claude/mind.mv2",
  maxContextObservations: 20,
  maxContextTokens: 2000,
  autoCompress: true,
  minConfidence: 0.6,
  debug: false,
}

/**
 * Search result from memory
 */
export interface MemorySearchResult {
  observation: Observation
  score: number
  snippet: string
}

/**
 * Memory statistics
 */
export interface MindStats {
  totalObservations: number
  totalSessions: number
  oldestMemory: number
  newestMemory: number
  fileSize: number
  topTypes: Partial<Record<ObservationType, number>>
}

/**
 * Context to inject into sessions
 */
export interface InjectedContext {
  recentObservations: Observation[]
  relevantMemories: Observation[]
  sessionSummaries: SessionSummary[]
  tokenCount: number
}

/**
 * Session summary
 */
export interface SessionSummary {
  id: string
  startTime: number
  endTime: number
  observationCount: number
  keyDecisions: string[]
  filesModified: string[]
  summary: string
}

/**
 * Input for remember operation
 */
export interface RememberInput {
  type: ObservationType
  summary: string
  content: string
  tool?: string
  metadata?: Record<string, unknown>
}
