import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { isDuplicateAcrossProcesses } from "../utils/dedup.js"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

describe("Cross-Process Deduplication", () => {
  let testDir: string

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "opencode-brain-dedup-"))
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it("returns false for first observation", async () => {
    const result = await isDuplicateAcrossProcesses(
      testDir,
      "opencode",
      "Read",
      { file_path: "/test/file.ts" }
    )
    expect(result).toBe(false)
  })

  it("returns true for duplicate within window", async () => {
    const toolInput = { file_path: "/test/file.ts" }

    // First observation
    const first = await isDuplicateAcrossProcesses(
      testDir,
      "opencode",
      "Read",
      toolInput
    )
    expect(first).toBe(false)

    // Duplicate
    const second = await isDuplicateAcrossProcesses(
      testDir,
      "opencode",
      "Read",
      toolInput
    )
    expect(second).toBe(true)
  })

  it("allows cross-tool observations (different sources)", async () => {
    const toolInput = { file_path: "/test/file.ts" }

    // OpenCode reads file
    const opencode = await isDuplicateAcrossProcesses(
      testDir,
      "opencode",
      "Read",
      toolInput
    )
    expect(opencode).toBe(false)

    // Claude Code reads same file - should NOT be duplicate
    const claude = await isDuplicateAcrossProcesses(
      testDir,
      "claude-code",
      "Read",
      toolInput
    )
    expect(claude).toBe(false)
  })

  it("treats different tools as different observations", async () => {
    const toolInput = { file_path: "/test/file.ts" }

    // Read file
    const read = await isDuplicateAcrossProcesses(
      testDir,
      "opencode",
      "Read",
      toolInput
    )
    expect(read).toBe(false)

    // Edit same file - different tool
    const edit = await isDuplicateAcrossProcesses(
      testDir,
      "opencode",
      "Edit",
      toolInput
    )
    expect(edit).toBe(false)
  })

  it("treats different inputs as different observations", async () => {
    // Read file1
    const file1 = await isDuplicateAcrossProcesses(
      testDir,
      "opencode",
      "Read",
      { file_path: "/test/file1.ts" }
    )
    expect(file1).toBe(false)

    // Read file2 - different input
    const file2 = await isDuplicateAcrossProcesses(
      testDir,
      "opencode",
      "Read",
      { file_path: "/test/file2.ts" }
    )
    expect(file2).toBe(false)
  })
})
