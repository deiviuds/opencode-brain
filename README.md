![OpenCode Brain Banner](./opencodeBrain-banner.png)

<div align="center">

### Give OpenCode photographic memory in ONE portable file.

[![npm version](https://badge.fury.io/js/opencode-brain.svg)](https://www.npmjs.com/package/opencode-brain)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/deiviuds/opencode-brain/workflows/CI/badge.svg)](https://github.com/deiviuds/opencode-brain/actions)

**Compatible with Claude Code** - shares the same `.claude/mind.mv2` file.

**[Install in 30 seconds](#installation)** · [How it Works](#how-it-works) · [Commands](#commands) · [FAQ](#faq)

</div>

<br />

## The Problem

```
You: "Remember that auth bug we fixed?"
OpenCode: "I don't have memory of previous conversations."
You: "We spent 3 hours on it yesterday"
OpenCode: "I'd be happy to help debug from scratch!"
```

**Large context window. Zero memory between sessions.**

<br />

## The Fix

```
You: "What did we decide about auth?"
OpenCode: "We chose JWT over sessions for your microservices.
          The refresh token issue - here's exactly what we fixed..."
```

One file. OpenCode remembers everything.

<br />

## Installation

### Prerequisites
- Node.js 18.0.0 or higher
- OpenCode 0.1.0 or higher

### Install

```bash
npm install opencode-brain
```

Add to your `opencode.json`:
```json
{
  "plugin": ["opencode-brain"]
}
```

Restart OpenCode. Done.

<br />

## How it Works

After install, OpenCode's memory lives in one file:

```
your-project/
└── .claude/
    └── mind.mv2   # OpenCode's brain. That's it.
```

No database. No cloud. No API keys.

**What gets captured:**
- Tool outputs (files read, commands run, searches)
- Session context, decisions, bugs, solutions
- Auto-injected at session start
- Searchable anytime

**Why one file?**
- `git commit` → version control OpenCode's brain
- `scp` → transfer anywhere
- Send to teammate → instant onboarding
- **Compatible with claude-brain** → Use both tools on the same project

<br />

## Commands

**In OpenCode:**
```bash
/mind:stats                         # memory statistics
/mind:search "authentication"       # find past context
/mind:ask "why did we choose X?"    # ask your memory
/mind:recent                        # what happened lately
```

Or just ask naturally: *"mind stats"*, *"search my memory for auth bugs"*, etc.

<br />

## Tools

| Tool | Description |
|------|-------------|
| `mind_search` | Search memories by query with relevance scoring |
| `mind_ask` | Ask questions about past work using context |
| `mind_stats` | View memory statistics and health |
| `mind_timeline` | View recent observations chronologically |

<br />

## Examples

### Search for Past Errors
```bash
/mind:search "database connection error"
```

**Output:**
```
1. [problem] Database connection timeout
   Score: 0.85 | 2h ago | via opencode
   Failed to connect to PostgreSQL: connection timeout after 30s
   File: src/db/connection.ts
   
2. [solution] Fixed connection pool configuration
   Score: 0.72 | 2h ago | via opencode
   Increased pool size to 20, added retry logic with exponential backoff
   File: src/db/connection.ts
```

### Ask About Decisions
```bash
/mind:ask "Why did we switch from REST to GraphQL?"
```

**Output:**
```
Based on recent observations:

We switched to GraphQL to solve the over-fetching problem in the mobile app. 
The REST endpoints were returning entire user objects when the app only needed 
names and avatars, causing slow load times. GraphQL allows the mobile team to 
request exactly what they need.

Decision made 3 days ago during API redesign discussion.
```

### View Recent Activity
```bash
/mind:recent 5
```

**Output:**
```
📅 Recent Observations (last 5):

1. 5 minutes ago | [feature] Added user authentication endpoints
   Implemented JWT-based auth with refresh tokens
   
2. 15 minutes ago | [discovery] Found existing auth middleware
   Located reusable auth middleware in src/middleware/
   
3. 1 hour ago | [problem] TypeScript errors in auth service
   Missing types for User interface
   
4. 1 hour ago | [solution] Fixed TypeScript errors
   Added proper type definitions
   
5. 2 hours ago | [decision] Chose PostgreSQL for user data
   Better suited for relational user data than MongoDB
```

<br />

## Cross-Tool Compatibility

**opencode-brain** and **[claude-brain](https://github.com/memvid/claude-brain)** share the same `.claude/mind.mv2` file.

### How it Works
- Both plugins read/write the same memory file
- Source attribution shows which tool created each memory
- File locking prevents corruption from concurrent access
- Completely transparent - just works

### Use Cases

**Scenario 1: Research + Implementation**
1. Use Claude Code to research an architecture decision → Stored in `.claude/mind.mv2`
2. Use OpenCode to implement it → Reads the same file, sees the decision
3. Both tools maintain a shared memory

**Scenario 2: Team Collaboration**
1. Developer A uses Claude Code to debug an issue
2. Developer A commits `.claude/mind.mv2` to git
3. Developer B pulls the repo and uses OpenCode
4. Developer B sees all of Developer A's debugging context

**Scenario 3: Multi-Tool Workflow**
1. Use Claude Code for complex reasoning tasks
2. Use OpenCode for rapid coding
3. Both see the same project context
4. No context loss when switching tools

<br />

## Memory Types

Observations are automatically classified as:

- **discovery** - New information found (files, patterns, APIs)
- **decision** - Choices made (architecture, libraries, approaches)
- **problem** - Errors encountered (bugs, failures, issues)
- **solution** - Fixes implemented (bug fixes, workarounds)
- **pattern** - Patterns recognized (code smells, best practices)
- **warning** - Concerns noted (tech debt, security issues)
- **success** - Successful outcomes (passing tests, deployments)
- **refactor** - Code refactoring (improvements, cleanups)
- **bugfix** - Bugs fixed (specific issues resolved)
- **feature** - Features added (new functionality)

<br />

## FAQ

<details>
<summary><b>How big is the file?</b></summary>

Empty: ~70KB. Grows ~1KB per memory. A year of use stays under 5MB.

Large outputs are automatically compressed to ~500 tokens using ENDLESS MODE compression.

</details>

<details>
<summary><b>Is it private?</b></summary>

100% local. Nothing leaves your machine. Ever.

The `.mv2` file is stored in your project directory with full control.

</details>

<details>
<summary><b>How fast?</b></summary>

Sub-millisecond. Native Rust core via memvid. Searches 10K+ memories in <1ms.

</details>

<details>
<summary><b>Does it work with claude-brain?</b></summary>

Yes! 100% compatible. Both use `.claude/mind.mv2` and can be used interchangeably on the same project.

File locking ensures safe concurrent access.

</details>

<details>
<summary><b>What gets compressed?</b></summary>

Tool outputs over 3000 characters are automatically compressed using tool-specific strategies:
- **File reads**: Extract structure, imports, exports, functions, classes
- **Bash commands**: Focus on errors, success indicators, key output
- **Grep results**: Summarize matches and files
- **Glob results**: Group by directory, show samples
- **Edits/Writes**: Capture summary and confirmation

Compression reduces to ~500 tokens while preserving key information.

</details>

<details>
<summary><b>Can I disable compression?</b></summary>

Compression is automatic for large outputs. The `autoCompress` config option exists but compression is recommended to avoid context limits.

</details>

<details>
<summary><b>Reset memory?</b></summary>

```bash
rm .claude/mind.mv2
```

The file will be recreated automatically on next use.

</details>

<details>
<summary><b>Can I commit the .mv2 file to git?</b></summary>

Yes! It's designed for version control. Your team can share the same project context.

Just add it to git:
```bash
git add .claude/mind.mv2
git commit -m "Share project context"
```

</details>

<details>
<summary><b>What if the file gets corrupted?</b></summary>

opencode-brain automatically detects corruption and creates a backup before starting fresh.

Backups are stored as `.claude/mind.mv2.backup-{timestamp}` (keeps 3 most recent).

</details>

<br />

## Troubleshooting

### Memory file is corrupted
If you see deserialization errors, opencode-brain automatically:
1. Creates a backup: `.claude/mind.mv2.backup-{timestamp}`
2. Starts a fresh memory file
3. Keeps the 3 most recent backups

Check backup files if you need to recover data.

### Memory file too large
Files over 100MB are automatically detected and archived. Consider:
- Deleting old `.mv2` files periodically
- Starting fresh for new projects
- Checking for runaway observation creation

### Enable debug logging
```bash
export OPENCODE_BRAIN_DEBUG=1
```

This shows detailed logging of:
- Observations being captured
- Compression operations
- File locking activity
- SDK operations

### Plugin not loading
1. Check `opencode.json` has correct plugin name: `"opencode-brain"`
2. Verify Node.js version: `node --version` (needs 18+)
3. Rebuild: `npm run build` in plugin directory
4. Check OpenCode logs for errors

### Observations not being captured
1. Enable debug logging (see above)
2. Check if tools are being used (Read, Bash, Grep, etc.)
3. Verify `.claude/` directory is writable
4. Check for file locking issues (shouldn't happen with proper-lockfile)

<br />

## API Reference

### Tools

#### mind_search
Search memories by query using fast lexical search.

**Parameters:**
- `query` (string, required) - Search terms or question
- `limit` (number, optional) - Max results, default 10

**Returns:** Array of search results with observation, score, and snippet

#### mind_ask
Ask questions about past work using memory context.

**Parameters:**
- `question` (string, required) - Natural language question

**Returns:** String answer based on relevant memories

#### mind_stats
View memory statistics.

**Parameters:** None

**Returns:** Statistics object with:
- `totalObservations` - Total memory count
- `totalSessions` - Session count
- `oldestMemory` - Timestamp of oldest memory
- `newestMemory` - Timestamp of newest memory
- `fileSize` - Size in bytes
- `topTypes` - Observation type counts

#### mind_timeline
View recent observations chronologically.

**Parameters:**
- `limit` (number, optional) - Max results, default 20

**Returns:** Array of observations in chronological order

<br />

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start
```bash
git clone https://github.com/deiviuds/opencode-brain.git
cd opencode-brain
npm install
npm run build
npm test
```

<br />

## License

MIT - see [LICENSE](LICENSE)

<br />

---

<div align="center">

**If this saved you time, [⭐ star the repo](https://github.com/deiviuds/opencode-brain)**

<br />

Built with ❤️ for the OpenCode community

<br />

**Related:** [claude-brain](https://github.com/memvid/claude-brain) - The original for Claude Code

</div>

