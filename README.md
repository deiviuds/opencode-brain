# OpenCode Brain

Give OpenCode photographic memory in ONE portable file.

**Compatible with Claude Code** - shares the same `.claude/mind.mv2` file.

## Installation

```bash
# Add to your opencode.json
{
  "plugin": ["opencode-brain"]
}
```

Or install globally:

```bash
npm install -g opencode-brain
```

## Features

- **Automatic Memory Capture** - Observations from tool use are stored automatically
- **Cross-Tool Compatibility** - Share memories between OpenCode and Claude Code
- **Compression** - Large outputs are compressed to ~500 tokens
- **Multi-Agent Safe** - File locking prevents corruption from concurrent access
- **Per-Project Isolation** - Each project gets its own memory file
- **Portable** - Single `.mv2` file you can share with teammates

## Usage

### Tools

| Tool | Description |
|------|-------------|
| `mind_search` | Search memories by query |
| `mind_ask` | Ask questions about past work |
| `mind_stats` | View memory statistics |
| `mind_timeline` | View recent observations |

### Commands

| Command | Description |
|---------|-------------|
| `/mind:search <query>` | Search memories |
| `/mind:ask <question>` | Ask questions |
| `/mind:stats` | View statistics |
| `/mind:recent [count]` | View timeline |

## Memory Types

Observations are classified as:

- `discovery` - New information found
- `decision` - Choices made
- `problem` - Errors encountered
- `solution` - Fixes implemented
- `pattern` - Patterns recognized
- `warning` - Concerns noted
- `success` - Successful outcomes
- `refactor` - Code refactoring
- `bugfix` - Bugs fixed
- `feature` - Features added

## Storage

Memories are stored in `.claude/mind.mv2` (same location as claude-brain).

This file is:
- **Portable** - Copy it anywhere, share with teammates
- **Git-friendly** - Commit to version control
- **Self-contained** - Everything in ONE file
- **Searchable** - Instant lexical search

## Cross-Tool Compatibility

When using both OpenCode and Claude Code on the same project:

1. Both tools read/write the same `.claude/mind.mv2` file
2. Observations include a `source` field ("opencode" or "claude-code")
3. File locking prevents corruption from concurrent access
4. Search results show which tool created each memory

## Configuration

Set `OPENCODE_BRAIN_DEBUG=1` to enable debug logging.

## License

MIT
