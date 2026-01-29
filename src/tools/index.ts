/**
 * OpenCode Brain - Custom Tools
 * 
 * Native OpenCode tools for interacting with the memory system.
 */

import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import type { Mind } from "../core/mind.js"
import { formatTimestamp } from "../utils/helpers.js"

// Tool context type
interface ToolContext {
  directory: string
  worktree: string
  abort: AbortSignal
  metadata(input: { title?: string; metadata?: Record<string, unknown> }): void
}

/**
 * Create mind_search tool
 */
export function createSearchTool(getMind: () => Promise<Mind>): ToolDefinition {
  return tool({
    description: "Search through stored memories and observations (shared with Claude Code)",
    args: {
      query: tool.schema.string().describe("Search query"),
      limit: tool.schema.number().optional().describe("Max results (default: 10)"),
    },
    async execute(args, ctx: ToolContext) {
      if (ctx.abort.aborted) return "Operation cancelled"
      
      ctx.metadata({ title: "Searching memories..." })
      
      const mind = await getMind()
      const results = await mind.search(args.query, args.limit ?? 10)
      
      if (results.length === 0) return "No memories found."
      
      ctx.metadata({ title: `Found ${results.length} memories` })
      
      return results.map((r, i) => {
        const source = (r.observation.metadata?.source as string) || "unknown"
        return `${i + 1}. [${r.observation.type}] ${r.observation.summary}\n` +
          `   Score: ${r.score.toFixed(2)} | ${formatTimestamp(r.observation.timestamp)} | via ${source}\n` +
          `   ${r.snippet}`
      }).join("\n\n")
    },
  })
}

/**
 * Create mind_ask tool
 */
export function createAskTool(getMind: () => Promise<Mind>): ToolDefinition {
  return tool({
    description: "Ask questions about past work and get context-aware answers (includes Claude Code memories)",
    args: {
      question: tool.schema.string().describe("Question to ask"),
    },
    async execute(args, ctx: ToolContext) {
      if (ctx.abort.aborted) return "Operation cancelled"
      
      ctx.metadata({ title: "Querying memories..." })
      
      const mind = await getMind()
      const answer = await mind.ask(args.question)
      
      ctx.metadata({ title: "Query complete" })
      
      return answer
    },
  })
}

/**
 * Create mind_stats tool
 */
export function createStatsTool(getMind: () => Promise<Mind>): ToolDefinition {
  return tool({
    description: "Show memory statistics (combined OpenCode + Claude Code)",
    args: {},
    async execute(_args, ctx: ToolContext) {
      if (ctx.abort.aborted) return "Operation cancelled"
      
      ctx.metadata({ title: "Loading statistics..." })
      
      const mind = await getMind()
      const stats = await mind.stats()
      
      ctx.metadata({ title: "Statistics loaded" })
      
      const lines = [
        `Memory: .claude/mind.mv2 (shared with Claude Code)`,
        `Total Observations: ${stats.totalObservations}`,
        `File Size: ${(stats.fileSize / 1024).toFixed(1)} KB`,
        `Oldest Memory: ${formatTimestamp(stats.oldestMemory)}`,
        `Newest Memory: ${formatTimestamp(stats.newestMemory)}`,
      ]
      
      const types = Object.entries(stats.topTypes)
      if (types.length > 0) {
        lines.push(`Top Types: ${types.map(([k, v]) => `${k}:${v}`).join(", ")}`)
      }
      
      return lines.join("\n")
    },
  })
}

/**
 * Create mind_timeline tool
 */
export function createTimelineTool(getMind: () => Promise<Mind>): ToolDefinition {
  return tool({
    description: "Show recent memories timeline (from both OpenCode and Claude Code)",
    args: {
      count: tool.schema.number().optional().describe("Number of entries (default: 10)"),
    },
    async execute(args, ctx: ToolContext) {
      if (ctx.abort.aborted) return "Operation cancelled"
      
      ctx.metadata({ title: "Loading timeline..." })
      
      const mind = await getMind()
      const context = await mind.getContext()
      const obs = context.recentObservations.slice(0, args.count ?? 10)
      
      ctx.metadata({ title: `Loaded ${obs.length} memories` })
      
      if (obs.length === 0) return "No memories found."
      
      return obs.map((o, i) => {
        const source = (o.metadata?.source as string) || "unknown"
        return `${i + 1}. [${o.type}] ${o.summary}\n` +
          `   ${formatTimestamp(o.timestamp)} | ${o.tool || "N/A"} | via ${source}`
      }).join("\n\n")
    },
  })
}
