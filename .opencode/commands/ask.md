---
description: Ask questions about past work and decisions
---

# Mind Ask

Ask natural language questions about your project's history and get answers based on stored memories.

## Usage

Use the mind_ask tool with question: $ARGUMENTS

## How it Works

- Finds relevant memories using context search
- Synthesizes an answer from multiple observations
- Provides sources and timestamps

## Examples

**Ask about decisions:**
```
/mind:ask "Why did we switch from REST to GraphQL?"
```

**Ask about implementations:**
```
/mind:ask "How did we implement authentication?"
```

**Ask about problems:**
```
/mind:ask "What was the database connection issue?"
```

**Ask about recent work:**
```
/mind:ask "What features were added this week?"
```

## Output Format

Provides:
- **Natural language answer** based on observations
- **Context** from relevant memories
- **Timestamps** showing when events occurred
- **Source attribution** (opencode vs claude-code)

## Tips

- Use complete questions for best results
- More specific questions get better answers
- Combines information from multiple observations
- Works with both opencode and claude-brain memories

## Difference from Search

- **mind_search**: Returns raw observations with scores
- **mind_ask**: Returns synthesized answer from multiple sources

## See Also

- `/mind:search` - Find specific observations
- `/mind:recent` - View what happened lately
- `/mind:stats` - View memory statistics
