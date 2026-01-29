/**
 * OpenCode Brain - Compression
 * 
 * Compresses tool outputs to ~500 tokens for efficient storage.
 * Ported from claude-brain for 1:1 feature parity.
 */

const TARGET_COMPRESSED_SIZE = 2000   // ~500 tokens
const COMPRESSION_THRESHOLD = 3000    // Only compress if larger

/**
 * Compress tool output
 */
export function compressToolOutput(
  toolName: string,
  toolInput: Record<string, unknown> | undefined,
  output: string,
  autoCompress = true
): { compressed: string; wasCompressed: boolean; originalSize: number } {
  const originalSize = output.length
  
  // Respect autoCompress config
  if (!autoCompress || originalSize < COMPRESSION_THRESHOLD) {
    return { compressed: output, wasCompressed: false, originalSize }
  }
  
  let compressed: string
  const tool = toolName.toLowerCase()
  
  switch (tool) {
    case "read":
      compressed = compressFileRead(toolInput, output)
      break
    case "bash":
      compressed = compressBashOutput(toolInput, output)
      break
    case "grep":
      compressed = compressGrepOutput(toolInput, output)
      break
    case "glob":
      compressed = compressGlobOutput(toolInput, output)
      break
    case "edit":
    case "write":
    case "update":
      compressed = compressEditOutput(toolInput, output)
      break
    default:
      compressed = compressGeneric(output)
  }
  
  return {
    compressed: truncateToTarget(compressed),
    wasCompressed: true,
    originalSize,
  }
}

/**
 * Get compression statistics
 */
export function getCompressionStats(
  originalSize: number,
  compressedSize: number
): { ratio: number; saved: number; savedPercent: string } {
  const saved = originalSize - compressedSize
  const ratio = originalSize / compressedSize
  const savedPercent = ((saved / originalSize) * 100).toFixed(1)
  
  return { ratio, saved, savedPercent }
}

// --- Compression Functions ---

function compressFileRead(
  toolInput: Record<string, unknown> | undefined,
  output: string
): string {
  const lines = output.split("\n")
  const parts: string[] = []
  
  const filePath = toolInput?.file_path as string || toolInput?.filePath as string
  if (filePath) {
    parts.push(`File: ${filePath}`)
  }
  
  // Extract imports
  const imports = extractImports(output)
  if (imports.length > 0) {
    parts.push(`\nImports:\n${imports.slice(0, 10).join("\n")}`)
  }
  
  // Extract exports
  const exports = extractExports(output)
  if (exports.length > 0) {
    parts.push(`\nExports:\n${exports.slice(0, 10).join("\n")}`)
  }
  
  // Extract function signatures
  const functions = extractFunctionSignatures(output)
  if (functions.length > 0) {
    parts.push(`\nFunctions:\n${functions.slice(0, 15).join("\n")}`)
  }
  
  // Extract class names
  const classes = extractClassNames(output)
  if (classes.length > 0) {
    parts.push(`\nClasses: ${classes.join(", ")}`)
  }
  
  // Extract errors/TODOs
  const errors = extractErrorPatterns(output)
  if (errors.length > 0) {
    parts.push(`\nNotes:\n${errors.slice(0, 5).join("\n")}`)
  }
  
  // Add first and last lines for context
  if (lines.length > 15) {
    parts.push(`\nFirst 10 lines:\n${lines.slice(0, 10).join("\n")}`)
    parts.push(`\nLast 5 lines:\n${lines.slice(-5).join("\n")}`)
  }
  
  return parts.join("\n")
}

function compressBashOutput(
  toolInput: Record<string, unknown> | undefined,
  output: string
): string {
  const lines = output.split("\n")
  const parts: string[] = []
  
  const command = toolInput?.command as string
  if (command) {
    parts.push(`Command: ${command.split("\n")[0].slice(0, 100)}`)
  }
  
  // Extract error lines
  const errorLines = lines.filter(l => 
    /error|failed|exception|warning/i.test(l)
  )
  if (errorLines.length > 0) {
    parts.push(`\nErrors/Warnings:\n${errorLines.slice(0, 10).join("\n")}`)
  }
  
  // Extract success lines
  const successLines = lines.filter(l =>
    /success|passed|completed|done/i.test(l)
  )
  if (successLines.length > 0) {
    parts.push(`\nSuccess:\n${successLines.slice(0, 5).join("\n")}`)
  }
  
  // First and last lines
  if (lines.length > 20) {
    parts.push(`\nOutput (${lines.length} lines):`)
    parts.push(lines.slice(0, 10).join("\n"))
    parts.push("...")
    parts.push(lines.slice(-5).join("\n"))
  } else {
    parts.push(`\nOutput:\n${output}`)
  }
  
  return parts.join("\n")
}

function compressGrepOutput(
  toolInput: Record<string, unknown> | undefined,
  output: string
): string {
  const lines = output.split("\n").filter(Boolean)
  const parts: string[] = []
  
  const pattern = toolInput?.pattern as string
  if (pattern) {
    parts.push(`Pattern: ${pattern}`)
  }
  
  // Count unique files
  const files = new Set(lines.map(l => l.split(":")[0]).filter(Boolean))
  parts.push(`Found ${lines.length} matches in ${files.size} files`)
  
  // Show top matches
  parts.push(`\nTop matches:\n${lines.slice(0, 10).join("\n")}`)
  
  if (lines.length > 10) {
    parts.push(`\n... and ${lines.length - 10} more matches`)
  }
  
  return parts.join("\n")
}

function compressGlobOutput(
  toolInput: Record<string, unknown> | undefined,
  output: string
): string {
  const lines = output.split("\n").filter(Boolean)
  const parts: string[] = []
  
  const pattern = toolInput?.pattern as string
  if (pattern) {
    parts.push(`Pattern: ${pattern}`)
  }
  
  parts.push(`Found ${lines.length} files`)
  
  // Group by directory
  const dirs: Record<string, string[]> = {}
  for (const line of lines) {
    const dir = line.split("/").slice(0, -1).join("/") || "."
    if (!dirs[dir]) dirs[dir] = []
    dirs[dir].push(line.split("/").pop() || line)
  }
  
  // Show top directories
  const sortedDirs = Object.entries(dirs)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)
  
  for (const [dir, files] of sortedDirs) {
    parts.push(`\n${dir}/ (${files.length} files)`)
    parts.push(files.slice(0, 5).map(f => `  ${f}`).join("\n"))
    if (files.length > 5) {
      parts.push(`  ... and ${files.length - 5} more`)
    }
  }
  
  return parts.join("\n")
}

function compressEditOutput(
  toolInput: Record<string, unknown> | undefined,
  output: string
): string {
  const filePath = toolInput?.file_path as string || toolInput?.filePath as string
  const fileName = filePath?.split("/").pop() || "file"
  
  return `File: ${fileName}\nPath: ${filePath || "unknown"}\nChanges applied.\n\n${output.slice(0, 500)}`
}

function compressGeneric(output: string): string {
  const lines = output.split("\n")
  
  if (lines.length <= 30) {
    return output
  }
  
  return [
    ...lines.slice(0, 15),
    `\n... (${lines.length - 25} lines omitted) ...\n`,
    ...lines.slice(-10),
  ].join("\n")
}

// --- Helper Functions ---

function extractImports(code: string): string[] {
  const patterns = [
    /^import\s+.+$/gm,
    /^const\s+\w+\s*=\s*require\(.+\)$/gm,
    /^use\s+.+;$/gm,
  ]
  
  const imports: string[] = []
  for (const pattern of patterns) {
    const matches = code.match(pattern) || []
    imports.push(...matches)
  }
  
  return imports
}

function extractExports(code: string): string[] {
  const patterns = [
    /^export\s+(default\s+)?(function|class|const|let|var|interface|type)\s+\w+/gm,
    /^pub\s+(fn|struct|enum|trait)\s+\w+/gm,
    /^module\.exports\s*=/gm,
  ]
  
  const exports: string[] = []
  for (const pattern of patterns) {
    const matches = code.match(pattern) || []
    exports.push(...matches)
  }
  
  return exports
}

function extractFunctionSignatures(code: string): string[] {
  const patterns = [
    /^(export\s+)?(async\s+)?function\s+\w+\s*\([^)]*\)/gm,
    /^\s*(public|private|protected)?\s*(async\s+)?\w+\s*\([^)]*\)\s*[:{]/gm,
    /^(pub\s+)?fn\s+\w+\s*[<(]/gm,
    /^def\s+\w+\s*\(/gm,
  ]
  
  const functions: string[] = []
  for (const pattern of patterns) {
    const matches = code.match(pattern) || []
    functions.push(...matches.map(m => m.trim()))
  }
  
  return [...new Set(functions)]
}

function extractClassNames(code: string): string[] {
  const pattern = /^(export\s+)?(abstract\s+)?class\s+(\w+)/gm
  const classes: string[] = []
  let match
  
  while ((match = pattern.exec(code)) !== null) {
    classes.push(match[3])
  }
  
  return classes
}

function extractErrorPatterns(code: string): string[] {
  const pattern = /^.*\b(TODO|FIXME|HACK|XXX|BUG|NOTE)\b.*$/gm
  const matches = code.match(pattern) || []
  return matches.map(m => m.trim())
}

function truncateToTarget(text: string): string {
  if (text.length <= TARGET_COMPRESSED_SIZE) return text
  return text.slice(0, TARGET_COMPRESSED_SIZE) + "\n... (truncated)"
}
