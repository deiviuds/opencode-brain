# Contributing to opencode-brain

Thanks for your interest in contributing!

## Development Setup

```bash
# Clone the repo
git clone https://github.com/deiviuds/opencode-brain.git
cd opencode-brain

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## Project Structure

```
opencode-brain/
├── src/
│   ├── core/           # Mind engine
│   ├── hooks/          # OpenCode plugin hooks
│   ├── tools/          # Custom tools
│   ├── utils/          # Helpers
│   └── types.ts        # Type definitions
├── .opencode/
│   ├── commands/       # Slash commands
│   └── skills/         # Skills (optional)
└── dist/               # Built output
```

## How Hooks Work

- **session.created**: Initializes Mind instance when OpenCode starts
- **session.idle**: Saves session summary when OpenCode session ends
- **tool.executed**: Captures observations from tool usage

## Making Changes

1. Fork the repo
2. Create a branch: `git checkout -b my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Push and open a PR

## Releasing

Releases are automated via GitHub Actions. To release:

1. Update version in `package.json`
2. Create a tag: `git tag v1.0.1`
3. Push the tag: `git push origin v1.0.1`

The CI will build and publish to npm automatically.

## Questions?

Open an issue or start a discussion on GitHub.
