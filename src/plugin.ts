/**
 * OpenCode Brain - Plugin Entry Point
 * 
 * OpenCode plugin that provides photographic memory in ONE portable file.
 * Compatible with claude-brain - shares the same .claude/mind.mv2 file.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { existsSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { getMind, resetMind } from "./core/mind.js"
import { handleToolCapture } from "./hooks/tool-capture.js"
import { handleSessionEnd } from "./hooks/session-end.js"
import { createSearchTool, createAskTool, createStatsTool, createTimelineTool } from "./tools/index.js"
import type { InjectedContext, Observation } from "./types.js"
import { debug } from "./utils/helpers.js"

/**
 * Format context for system prompt injection
 */
function formatContextForSystem(context: InjectedContext): string {
  const lines = ["<opencode-mind-context>"]
  lines.push("# Memory Context")
  lines.push("")
  lines.push(`Recent observations (${context.recentObservations.length}):`)
  
  for (const obs of context.recentObservations.slice(0, 10)) {
    const source = (obs.metadata?.source as string) || "unknown"
    lines.push(`- [${obs.type}] ${obs.summary} (via ${source})`)
  }
  
  lines.push("")
  lines.push("Use mind_search or mind_ask to query memories.")
  lines.push("</opencode-mind-context>")
  
  return lines.join("\n")
}

/**
 * OpenCode Brain Plugin
 */
export const OpenCodeBrain: Plugin = async (ctx) => {
  const { directory, $ } = ctx
  
  // Session state tracking
  let sessionSummaryGenerated = false
  
  // Initialize mind lazily
  let mind: Awaited<ReturnType<typeof getMind>> | null = null
  const ensureMind = async () => {
    if (!mind) mind = await getMind(directory)
    return mind
  }

  return {
    // Register custom tools
    tool: {
      mind_search: createSearchTool(ensureMind),
      mind_ask: createAskTool(ensureMind),
      mind_stats: createStatsTool(ensureMind),
      mind_timeline: createTimelineTool(ensureMind),
    },

    // Subscribe to events
    event: async ({ event }) => {
      // Lightweight session start
      if (event.type === "session.created") {
        sessionSummaryGenerated = false
        const memoryPath = resolve(directory, ".claude/mind.mv2")
        
        if (existsSync(memoryPath)) {
          try {
            const stats = statSync(memoryPath)
            debug(`Memory loaded: ${(stats.size / 1024).toFixed(1)} KB`)
          } catch {
            // Ignore
          }
        } else {
          debug("Memory will be created on first observation")
        }
      }
      
      // Session end - generate summary
      if (event.type === "session.idle" && !sessionSummaryGenerated) {
        try {
          // Use the Bun shell from context
          await handleSessionEnd(directory, ensureMind, $ as Parameters<typeof handleSessionEnd>[2])
          sessionSummaryGenerated = true
          resetMind()
        } catch (err) {
          debug(`Failed to generate session summary: ${err}`)
        }
      }
    },

    // Capture tool outputs
    "tool.execute.after": async (input, output) => {
      try {
        await handleToolCapture(input, output, ensureMind)
      } catch (err) {
        debug(`Failed to capture tool output for ${input.tool}: ${err}`)
      }
    },

    // Inject context into system prompt
    "experimental.chat.system.transform": async (_input, output) => {
      try {
        const memoryPath = resolve(directory, ".claude/mind.mv2")
        if (!existsSync(memoryPath)) return
        
        const mind = await ensureMind()
        const context = await mind.getContext()
        
        if (context.recentObservations.length > 0) {
          output.system.push(formatContextForSystem(context))
        }
      } catch {
        // Don't block chat on memory errors
      }
    },

    // Add context during compaction
    "experimental.session.compacting": async (_input, output) => {
      try {
        const mind = await ensureMind()
        const context = await mind.getContext()
        
        const keyObs = context.recentObservations
          .filter((o: Observation) => 
            o.type === "decision" || o.type === "pattern" || o.type === "problem"
          )
          .slice(0, 10)
        
        if (keyObs.length > 0) {
          output.context.push(`
## Memory Context (from .claude/mind.mv2)

Key observations from this session:
${keyObs.map((o: Observation) => `- [${o.type}] ${o.summary}`).join("\n")}
`)
        }
      } catch {
        // Don't block compaction on memory errors
      }
    },
  }
}

export default OpenCodeBrain
