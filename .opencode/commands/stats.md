---
description: Show mind memory statistics
---

# Mind Stats

View statistics about your project's memory file including size, observation count, and health metrics.

## Usage

Use the mind_stats tool to display memory statistics.

## What You'll See

- **Total Observations** - Number of memories stored
- **Total Sessions** - Number of sessions tracked
- **File Size** - Size of the `.claude/mind.mv2` file
- **Oldest Memory** - Timestamp of first observation
- **Newest Memory** - Timestamp of latest observation
- **Top Types** - Distribution of observation types

## Example Output

```
📊 Memory Statistics

Total Observations: 247
Total Sessions: 12
File Size: 1.2 MB
Oldest Memory: 14 days ago
Newest Memory: 5 minutes ago

Top Types:
- discovery: 89 (36%)
- problem: 45 (18%)
- solution: 42 (17%)
- feature: 31 (13%)
- refactor: 24 (10%)
- decision: 16 (6%)
```

## When to Use

- **Check memory health** - Ensure observations are being captured
- **Monitor file size** - Large files (>100MB) are automatically archived
- **Understand usage** - See what types of observations dominate
- **Debugging** - Verify the plugin is working correctly

## File Size Guidelines

- **Empty**: ~70KB
- **Normal usage**: 1-5MB for a year
- **Large outputs compressed**: ~1KB per observation
- **Warning**: >100MB triggers automatic archival

## Tips

- Run stats regularly to monitor memory health
- If observation count isn't growing, check debug logs
- File size growth is normal and expected
- Compression keeps size manageable

## See Also

- `/mind:recent` - View latest observations
- `/mind:search` - Find specific memories
- `/mind:ask` - Ask questions about your project
