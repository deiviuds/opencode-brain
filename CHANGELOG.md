# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-29

### Added
- Initial release of opencode-brain
- Persistent memory system using .mv2 format (memvid)
- Four core tools: `mind_search`, `mind_ask`, `mind_stats`, `mind_timeline`
- Slash commands: `/mind:search`, `/mind:ask`, `/mind:stats`, `/mind:recent`
- Automatic observation capture from tool usage (Read, Bash, Grep, Glob, Edit, Write)
- ENDLESS MODE compression for large tool outputs
  - Tool-specific compression strategies for Read, Bash, Grep, Glob, Edit/Write
  - Reduces large outputs to ~500 tokens while preserving key information
- File locking for multi-agent safety using proper-lockfile
- Session summary generation at session end
- Cross-compatibility with claude-brain (shared `.claude/mind.mv2` file)
- Corruption detection and automatic recovery with backup creation
- Backup management (keeps 3 most recent backups)
- Source attribution (opencode vs claude-code)
- Deduplication system (60-second window, 100 entry cache)
- Comprehensive test suite (19 tests, 100% passing)

### Technical Details
- Built with TypeScript 5.7+
- Uses @memvid/sdk v2.0.149 for Rust-based memory engine
- OpenCode plugin system integration
- Works with Node.js 18+
- Uses proper-lockfile for concurrent access safety

### Compatibility
- 100% feature parity with claude-brain
- Shares `.claude/mind.mv2` file format
- Can be used simultaneously with claude-brain on the same project
- File locking prevents corruption from concurrent access

### Architecture
- Lazy-loaded SDK for fast startup
- Singleton pattern for Mind instance
- Event-driven hooks (session.created, session.idle)
- Tool capture with configurable compression
- LMDB-based storage via memvid

[1.0.0]: https://github.com/deiviuds/opencode-brain/releases/tag/v1.0.0
