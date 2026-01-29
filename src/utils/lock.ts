/**
 * OpenCode Brain - File Locking
 * 
 * Uses proper-lockfile for cross-process safety.
 * Identical to claude-brain implementation.
 */

import lockfile from "proper-lockfile"
import { mkdir, open } from "node:fs/promises"
import { dirname } from "node:path"

/**
 * Lock options - same as claude-brain
 */
const LOCK_OPTIONS = {
  stale: 30000,
  retries: {
    retries: 1000,
    minTimeout: 5,
    maxTimeout: 50,
  },
} as const

/**
 * Execute function with file lock
 * 
 * @param memoryPath - Path to the memory file
 * @param fn - Function to execute while holding lock
 */
export async function withMindLock<T>(
  memoryPath: string,
  fn: () => Promise<T>
): Promise<T> {
  const lockPath = `${memoryPath}.lock`
  
  // Ensure directory exists
  await mkdir(dirname(lockPath), { recursive: true })
  
  // Create lock file if it doesn't exist
  const handle = await open(lockPath, "a")
  await handle.close()
  
  // Acquire lock
  const release = await lockfile.lock(lockPath, LOCK_OPTIONS)
  
  try {
    return await fn()
  } finally {
    await release()
  }
}
