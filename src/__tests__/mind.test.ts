import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { Mind, getMind, resetMind } from "../core/mind.js"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { rm, mkdir } from "node:fs/promises"

describe("Mind", () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `opencode-brain-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
    resetMind()
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
    resetMind()
  })

  it("creates new memory file", async () => {
    const mind = await Mind.open(testDir)
    expect(mind.isInitialized()).toBe(true)
    expect(mind.getMemoryPath()).toContain(".claude/mind.mv2")
  })

  it("stores observations with opencode source", async () => {
    const mind = await Mind.open(testDir)
    const id = await mind.remember({
      type: "discovery",
      summary: "Test observation",
      content: "Test content",
    })
    expect(id).toBeDefined()

    // Verify via stats
    const stats = await mind.stats()
    expect(stats.totalObservations).toBeGreaterThan(0)
  })

  it("retrieves observations via timeline", async () => {
    const mind = await Mind.open(testDir)
    await mind.remember({
      type: "discovery",
      summary: "Test observation",
      content: "Test content",
    })

    const context = await mind.getContext()
    expect(context.recentObservations.length).toBeGreaterThan(0)
  })

  it("asks questions about memories", async () => {
    const mind = await Mind.open(testDir)
    await mind.remember({
      type: "discovery",
      summary: "Important finding",
      content: "The answer is 42",
    })

    const answer = await mind.ask("What is the answer?")
    expect(answer).toBeTruthy()
    expect(answer.length).toBeGreaterThan(0)
  })

  it("generates statistics", async () => {
    const mind = await Mind.open(testDir)
    await mind.remember({
      type: "feature",
      summary: "Test feature",
      content: "Feature content",
    })

    const stats = await mind.stats()
    expect(stats.totalObservations).toBeGreaterThan(0)
    expect(stats.fileSize).toBeGreaterThan(0)
  })

  it("gets context with recent observations", async () => {
    const mind = await Mind.open(testDir)
    await mind.remember({
      type: "discovery",
      summary: "Recent discovery",
      content: "Found something interesting",
    })

    const context = await mind.getContext()
    expect(context.recentObservations.length).toBeGreaterThan(0)
  })

  it("saves session summaries", async () => {
    const mind = await Mind.open(testDir)
    const summary = {
      keyDecisions: ["Decision 1", "Decision 2"],
      filesModified: ["file1.ts", "file2.ts"],
      summary: "Test session summary",
    }

    const id = await mind.saveSessionSummary(summary)
    expect(id).toBeDefined()

    // Verify via stats
    const stats = await mind.stats()
    expect(stats.totalObservations).toBeGreaterThan(0)
  })

  it("handles singleton pattern correctly", async () => {
    const mind1 = await getMind(testDir)
    const mind2 = await getMind(testDir)
    expect(mind1).toBe(mind2)

    resetMind()
    const mind3 = await getMind(testDir)
    expect(mind3).not.toBe(mind1)
  })

  it("returns session ID", async () => {
    const mind = await Mind.open(testDir)
    const sessionId = mind.getSessionId()
    expect(sessionId).toBeDefined()
    expect(sessionId.length).toBe(16) // 16 hex chars
  })

  it("stores multiple observations", async () => {
    const mind = await Mind.open(testDir)
    
    for (let i = 0; i < 5; i++) {
      await mind.remember({
        type: "discovery",
        summary: `Observation ${i}`,
        content: `Content ${i}`,
      })
    }

    const stats = await mind.stats()
    expect(stats.totalObservations).toBe(5)
  })

  it("handles concurrent writes without corruption", async () => {
    const writes = 20
    const tasks = Array.from({ length: writes }, async (_, i) => {
      const mind = await Mind.open(testDir)
      await mind.remember({
        type: "discovery",
        summary: `concurrent-${i}`,
        content: `content-${i}`,
      })
    })

    const results = await Promise.allSettled(tasks)
    const failed = results.filter((r) => r.status === "rejected")
    expect(failed.length).toBe(0)

    const mind = await Mind.open(testDir)
    const stats = await mind.stats()
    expect(stats.totalObservations).toBe(writes)
  }, 30000)

  it("distinguishes observations by source tool", async () => {
    // Simulate Claude Code observation
    const mind1 = await Mind.open(testDir)
    await mind1.remember({
      type: "discovery",
      summary: "Read file.ts",
      content: "file contents from claude-code",
      metadata: { source: "claude-code", sessionId: "cc-session-1" },
    })

    // Simulate OpenCode observation (same file)
    const mind2 = await Mind.open(testDir)
    await mind2.remember({
      type: "discovery",
      summary: "Read file.ts",
      content: "file contents from opencode",
      metadata: { source: "opencode", sessionId: "oc-session-1" },
    })

    const mind = await Mind.open(testDir)
    const stats = await mind.stats()

    // Both should be stored (different sources)
    expect(stats.totalObservations).toBe(2)
  })

  it("uses consistent session ID when provided", async () => {
    const sessionId = "test-session-123"

    // Write with explicit sessionId in metadata
    const mind = await Mind.open(testDir)
    await mind.remember({
      type: "discovery",
      summary: "test with custom session",
      content: "content with session id",
      metadata: { sessionId },
    })

    // Verify observation was stored
    const stats = await mind.stats()
    expect(stats.totalObservations).toBe(1)
  })

  it("allows setSessionId for external tracking", async () => {
    const mind = await Mind.open(testDir)
    const originalId = mind.getSessionId()
    
    mind.setSessionId("custom-session-id")
    expect(mind.getSessionId()).toBe("custom-session-id")
    expect(mind.getSessionId()).not.toBe(originalId)
  })
})
