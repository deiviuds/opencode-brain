import { describe, it, expect } from "vitest"
import { compressToolOutput } from "../utils/compression.js"
import { estimateTokens } from "../utils/helpers.js"

describe("Compression", () => {
  it("compresses large outputs", () => {
    const largeOutput = "x".repeat(5000)
    const result = compressToolOutput("read", { file: "test.ts" }, largeOutput)
    expect(result.wasCompressed).toBe(true)
    expect(result.compressed.length).toBeLessThan(largeOutput.length)
    expect(result.originalSize).toBe(5000)
  })

  it("does not compress small outputs", () => {
    const smallOutput = "Small output"
    const result = compressToolOutput("read", {}, smallOutput)
    expect(result.wasCompressed).toBe(false)
    expect(result.compressed).toBe(smallOutput)
  })

  it("estimates tokens correctly", () => {
    expect(estimateTokens("")).toBe(0)
    expect(estimateTokens("test")).toBe(1)
    expect(estimateTokens("x".repeat(100))).toBe(25)
  })

  it("compresses read tool output specifically", () => {
    const fileContent = `
import { something } from "./module"
import { other } from "./other"

export function main() {
  return "hello"
}

export class MyClass {
  method() {}
}

// TODO: Fix this
// FIXME: This is broken
${"x".repeat(4000)}
`
    const result = compressToolOutput("read", { file: "test.ts" }, fileContent)
    expect(result.wasCompressed).toBe(true)
    expect(result.compressed).toContain("Imports:")
    expect(result.compressed).toContain("Exports:")
  })

  it("compresses bash tool output", () => {
    const bashOutput = `
Running command...
Error: something went wrong
Success!
${"x".repeat(3000)}
`
    const result = compressToolOutput("bash", { command: "npm test" }, bashOutput)
    expect(result.wasCompressed).toBe(true)
  })

  it("compresses grep tool output", () => {
    const grepOutput = `
file1.ts:10: const x = 1
file2.ts:20: const x = 2
file3.ts:30: const x = 3
${"x".repeat(3000)}
`
    const result = compressToolOutput("grep", { pattern: "const x" }, grepOutput)
    expect(result.wasCompressed).toBe(true)
  })

  it("compresses glob tool output", () => {
    // Create a large glob output to trigger compression
    const files = Array.from({ length: 100 }, (_, i) => `src/file${i}.ts`)
    const globOutput = files.join("\n") + "\n".repeat(3000)
    const result = compressToolOutput("glob", { pattern: "**/*.ts" }, globOutput)
    expect(result.wasCompressed).toBe(true)
    expect(result.compressed).toContain("Pattern:")
  })

  it("respects autoCompress=false config", () => {
    const largeOutput = "x".repeat(5000)
    const result = compressToolOutput("read", { file: "test.ts" }, largeOutput, false)
    expect(result.wasCompressed).toBe(false)
    expect(result.compressed).toBe(largeOutput)
    expect(result.originalSize).toBe(5000)
  })

  it("compresses when autoCompress=true", () => {
    const largeOutput = "x".repeat(5000)
    const result = compressToolOutput("read", { file: "test.ts" }, largeOutput, true)
    expect(result.wasCompressed).toBe(true)
    expect(result.compressed.length).toBeLessThan(largeOutput.length)
  })
})
