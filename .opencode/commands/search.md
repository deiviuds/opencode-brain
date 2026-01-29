---
description: Search memories for relevant context (shared with Claude Code)
---

# Mind Search

Search through stored observations and memories using fast lexical search.

## Usage

Use the mind_search tool with query: $ARGUMENTS

## What it Searches

- All observations captured from tool usage
- Session summaries
- Both opencode and claude-code memories (if using both tools)

## Examples

**Search for errors:**
```
/mind:search "authentication error"
```

**Search for specific files:**
```
/mind:search "database.ts"
```

**Search for decisions:**
```
/mind:search "why did we choose"
```

**Search for recent changes:**
```
/mind:search "refactored API endpoints"
```

## Output Format

Results include:
- **Observation type** (discovery, problem, solution, etc.)
- **Summary** text
- **Relevance score** (0-1, higher is more relevant)
- **Timestamp** (relative, e.g., "2h ago")
- **Source** (opencode or claude-code)
- **Content snippet**

## Tips

- Use specific terms for better results
- Search works on both title and content
- Results are ranked by relevance
- Limited to 10 results by default

## See Also

- `/mind:ask` - Ask natural language questions
- `/mind:recent` - View chronological timeline
- `/mind:stats` - View memory statistics
