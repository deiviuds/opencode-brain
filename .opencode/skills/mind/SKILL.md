---
name: mind
description: Claude Mind - Persistent memory stored in a single portable .mv2 file (shared with Claude Code)
---

# Claude Mind (OpenCode)

You have access to a persistent memory system. All observations are stored in `.claude/mind.mv2`.

**This memory is SHARED with Claude Code** - observations from both tools are accessible.

## Available Tools

- `mind_search` - Search memories by query
- `mind_ask` - Ask questions about past work
- `mind_stats` - View memory statistics
- `mind_timeline` - View recent observations

## Slash Commands

- `/mind:search <query>` - Search memories
- `/mind:ask <question>` - Ask questions
- `/mind:stats` - View statistics
- `/mind:recent [count]` - View timeline

## Memory Types

Observations are classified as:
- **discovery** - New information found
- **decision** - Choices made
- **problem** - Errors encountered
- **solution** - Fixes implemented
- **pattern** - Patterns recognized
- **warning** - Concerns noted
- **success** - Successful outcomes
- **refactor** - Code refactoring
- **bugfix** - Bugs fixed
- **feature** - Features added

## Cross-Tool Compatibility

- Storage: `.claude/mind.mv2` (same as Claude Code)
- Format: Identical frame structure
- Attribution: `source: "opencode"` or `source: "claude-code"`
- Both tools can read/write the same memories

## Usage Tips

1. Memories are captured automatically from tool use
2. Use `mind_search` to find relevant past context
3. Use `mind_ask` for natural language questions
4. The `.mv2` file is portable - share with teammates
5. Switch between OpenCode and Claude Code seamlessly
