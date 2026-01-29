/**
 * OpenCode Brain
 * 
 * Give OpenCode photographic memory in ONE portable file.
 * Compatible with claude-brain - shares the same .claude/mind.mv2 file.
 */

// Export plugin
export { OpenCodeBrain, default } from "./plugin.js"

// Export types
export type {
  Observation,
  ObservationType,
  ObservationMetadata,
  MindConfig,
  MindStats,
  MemorySearchResult,
  InjectedContext,
  SessionSummary,
  RememberInput,
} from "./types.js"

export { DEFAULT_CONFIG } from "./types.js"

// Export core
export { Mind, getMind, resetMind } from "./core/mind.js"

// Export utils
export { formatTimestamp, generateId, estimateTokens, classifyObservationType } from "./utils/helpers.js"
export { compressToolOutput, getCompressionStats } from "./utils/compression.js"
export { withMindLock } from "./utils/lock.js"
