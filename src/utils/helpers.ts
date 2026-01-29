/**
 * OpenCode Brain - Helper Utilities
 * 
 * Ported from claude-brain for 1:1 feature parity.
 */

import { randomBytes } from "node:crypto"
import type { ObservationType } from "../types.js"

/**
 * Generate a unique ID (16 hex chars)
 */
export function generateId(): string {
  return randomBytes(8).toString("hex")
}

/**
 * Estimate tokens (~4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Truncate text to max tokens
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + "..."
}

/**
 * Format timestamp as relative time
 */
export function formatTimestamp(ts: number): string {
  if (!ts || ts <= 0) return "unknown"
  
  // Normalize timestamp (SDK may return seconds)
  const normalized = ts > 0 && ts < 4102444800 ? ts * 1000 : ts
  const now = Date.now()
  const diff = now - normalized
  
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  
  return new Date(normalized).toLocaleDateString()
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

/**
 * Classify observation type based on tool and output
 */
export function classifyObservationType(
  toolName: string,
  output: string
): ObservationType {
  const lower = output.toLowerCase()
  
  // Error patterns
  if (lower.includes("error") || lower.includes("failed") || lower.includes("exception")) {
    return "problem"
  }
  
  // Success patterns
  if (lower.includes("success") || lower.includes("passed") || lower.includes("completed")) {
    return "success"
  }
  
  // Warning patterns
  if (lower.includes("warning") || lower.includes("deprecated")) {
    return "warning"
  }
  
  // Tool-specific classification
  const tool = toolName.toLowerCase()
  
  if (tool === "read" || tool === "glob" || tool === "grep") {
    return "discovery"
  }
  
  if (tool === "edit" || tool === "update") {
    if (lower.includes("fix") || lower.includes("bug")) {
      return "bugfix"
    }
    return "refactor"
  }
  
  if (tool === "write") {
    return "feature"
  }
  
  return "discovery"
}

/**
 * Normalize timestamp from SDK (may be seconds or milliseconds)
 */
export function normalizeTimestamp(ts: number): number {
  if (ts > 0 && ts < 4102444800) {
    return ts * 1000
  }
  return ts
}

/**
 * Debug logging (respects OPENCODE_BRAIN_DEBUG env)
 */
export function debug(message: string): void {
  if (process.env.OPENCODE_BRAIN_DEBUG === "1") {
    console.error(`[opencode-brain] ${message}`)
  }
}
