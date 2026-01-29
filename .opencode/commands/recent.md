---
description: Show recent memory timeline
---

# Mind Recent

View recent observations in chronological order to see what work has been done lately.

## Usage

Use the mind_timeline tool to show recent memories: $ARGUMENTS

**Optional argument:** Number of observations to show (default: 20)

## Examples

**Show last 20 observations (default):**
```
/mind:recent
```

**Show last 5 observations:**
```
/mind:recent 5
```

**Show last 50 observations:**
```
/mind:recent 50
```

## Output Format

Displays observations in reverse chronological order (newest first):

```
📅 Recent Observations (last 5):

1. 5 minutes ago | [feature] Added user authentication endpoints
   Implemented JWT-based auth with refresh tokens
   Source: opencode
   
2. 15 minutes ago | [discovery] Found existing auth middleware
   Located reusable auth middleware in src/middleware/
   Source: opencode
   
3. 1 hour ago | [problem] TypeScript errors in auth service
   Missing types for User interface
   Source: opencode
```

## What You'll See

Each observation shows:
- **Timestamp** (relative: "5 minutes ago")
- **Type** (discovery, problem, solution, feature, etc.)
- **Summary** (one-line description)
- **Content** (detailed information)
- **Source** (opencode or claude-code)

## When to Use

- **Daily standup** - Review what you worked on
- **Context refresh** - Remember where you left off
- **Team handoff** - Share what was done
- **Progress tracking** - See recent accomplishments

## Tips

- Use smaller limits (5-10) for quick overview
- Use larger limits (50+) for detailed review
- Timeline includes both opencode and claude-code observations
- Observations are captured automatically from tool usage

## Observation Types

- **discovery** - New information found
- **decision** - Choices made
- **problem** - Errors encountered
- **solution** - Fixes implemented
- **feature** - Features added
- **refactor** - Code refactored
- **bugfix** - Bugs fixed

## See Also

- `/mind:search` - Find specific observations
- `/mind:ask` - Ask questions about your work
- `/mind:stats` - View memory statistics
