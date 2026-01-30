import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  writeSessionInfo,
  readSessionInfo,
  getSessionId,
  detectSource,
} from "../utils/session.js"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

describe("Session Management", () => {
  let testDir: string

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "opencode-brain-session-"))
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
    vi.unstubAllEnvs()
  })

  describe("detectSource", () => {
    it("detects opencode from OPENCODE_SESSION_ID", () => {
      vi.stubEnv("OPENCODE_SESSION_ID", "test-session")
      expect(detectSource()).toBe("opencode")
    })

    it("detects opencode from OPENCODE_DIR", () => {
      vi.stubEnv("OPENCODE_DIR", "/test/dir")
      expect(detectSource()).toBe("opencode")
    })

    it("detects claude-code from CLAUDE_PROJECT_DIR", () => {
      vi.stubEnv("CLAUDE_PROJECT_DIR", "/test/project")
      expect(detectSource()).toBe("claude-code")
    })

    it("prioritizes opencode over claude-code", () => {
      vi.stubEnv("OPENCODE_SESSION_ID", "test-session")
      vi.stubEnv("CLAUDE_PROJECT_DIR", "/test/project")
      expect(detectSource()).toBe("opencode")
    })

    it("defaults to opencode when no env vars set", () => {
      // Clear any existing env vars
      delete process.env.OPENCODE_SESSION_ID
      delete process.env.OPENCODE_DIR
      delete process.env.CLAUDE_PROJECT_DIR
      expect(detectSource()).toBe("opencode")
    })
  })

  describe("writeSessionInfo / readSessionInfo", () => {
    it("writes and reads session info correctly", async () => {
      const sessionId = "test-session-123"
      const source = "opencode" as const

      await writeSessionInfo(testDir, sessionId, source)
      const info = await readSessionInfo(testDir, source)

      expect(info).not.toBeNull()
      expect(info?.sessionId).toBe(sessionId)
      expect(info?.source).toBe(source)
      expect(info?.startTime).toBeTypeOf("number")
    })

    it("returns null for non-existent session", async () => {
      const info = await readSessionInfo(testDir, "opencode")
      expect(info).toBeNull()
    })

    it("keeps sessions separate by source", async () => {
      await writeSessionInfo(testDir, "opencode-session", "opencode")
      await writeSessionInfo(testDir, "claude-session", "claude-code")

      const opencodeInfo = await readSessionInfo(testDir, "opencode")
      const claudeInfo = await readSessionInfo(testDir, "claude-code")

      expect(opencodeInfo?.sessionId).toBe("opencode-session")
      expect(claudeInfo?.sessionId).toBe("claude-session")
    })

    it("overwrites existing session info", async () => {
      await writeSessionInfo(testDir, "first-session", "opencode")
      await writeSessionInfo(testDir, "second-session", "opencode")

      const info = await readSessionInfo(testDir, "opencode")
      expect(info?.sessionId).toBe("second-session")
    })
  })

  describe("getSessionId", () => {
    it("returns existing session ID if available", async () => {
      vi.stubEnv("OPENCODE_SESSION_ID", "env-session")
      await writeSessionInfo(testDir, "existing-session", "opencode")

      const sessionId = await getSessionId(testDir)
      expect(sessionId).toBe("existing-session")
    })

    it("returns fallback ID if no session exists", async () => {
      vi.stubEnv("OPENCODE_SESSION_ID", "env-session")
      const fallbackId = "fallback-123"

      const sessionId = await getSessionId(testDir, fallbackId)
      expect(sessionId).toBe(fallbackId)
    })

    it("generates new ID if no session and no fallback", async () => {
      vi.stubEnv("OPENCODE_SESSION_ID", "env-session")

      const sessionId = await getSessionId(testDir)
      expect(sessionId).toMatch(/^opencode-\d+-[a-z0-9]+$/)
    })

    it("uses correct source for session lookup", async () => {
      vi.stubEnv("CLAUDE_PROJECT_DIR", "/test/project")
      await writeSessionInfo(testDir, "claude-session", "claude-code")

      const sessionId = await getSessionId(testDir)
      expect(sessionId).toBe("claude-session")
    })
  })
})
