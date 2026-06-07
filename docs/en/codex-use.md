# Codex Maintainer Use

This document explains how Codex, ChatGPT Pro with Codex, Codex Security, and API credits would help maintain Lumina Reading Room.

## Maintainer role

Linxi is the primary maintainer of Lumina Reading Room. The repository is public and maintained at `linxi8590-jpg/lumina-reading-room`.

## How Codex would be used

- Maintain the MCP server and connector compatibility across ChatGPT, Claude.ai, Codex, Claude Code, and HTTP MCP clients.
- Review and test changes to the reading-waterline logic that prevents AI from reading future passages.
- Improve deployment scripts and documentation for non-engineer users.
- Add regression tests for imports, notes, connector auth, SSE transport, and locked-content rejection.
- Review pull requests and keep installation, troubleshooting, and release notes accurate.
- Use Codex Security to inspect the self-hosted server boundary, connector token handling, and note/write-tool behavior.

## Why API credits help

API credits would support maintainer automation and integration testing. The project can use OpenAI-compatible agent workflows to test MCP tools, connector behavior, note persistence, and documentation examples without requiring every check to be performed manually through a chat UI.

## Application-ready short answers

### What is the project?

Lumina Reading Room is an open-source AI reading room. It lets ChatGPT/Codex-compatible agents read only the passages a human has unlocked, track reading progress, and save private structured notes through MCP tools.

### Maintainer role

I am the primary maintainer of `linxi8590-jpg/lumina-reading-room`, a public open-source repository. I design, implement, test, document, and release the project.

### Why does it qualify?

Lumina solves a real AI-reading problem: assistants should help readers without seeing future chapters. It combines a self-hosted reader, strict reading-progress enforcement, and MCP connectors for major AI clients.

### How would Codex/API credits be used?

I would use Codex and API credits to maintain MCP compatibility, write and run regression tests, review PRs, improve deployment docs for non-engineer users, and test connector behavior across ChatGPT, Claude, Codex, and HTTP MCP clients.

