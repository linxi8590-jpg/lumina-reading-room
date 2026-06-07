# Maintainer Use of Codex

This page is written for the Codex for Open Source application.

Official program page checked on 2026-06-07:
https://developers.openai.com/community/codex-for-oss

## Maintainer Statement

Linxi is the primary maintainer of Lumina Reading Room. The public repository is maintained under the GitHub account `linxi8590-jpg`.

Lumina is a small, active open-source project focused on AI-assisted reading. It is built, tested, documented, and released by its maintainer, with a working self-hosted deployment path and real end-to-end connector tests across ChatGPT, Claude.ai, Codex, and HTTP MCP clients.

## Why This Repository Qualifies

Lumina Reading Room solves a concrete AI safety and usability problem: readers want AI help while reading, but the AI should not see chapters the human has not reached yet.

The project implements a reading waterline, MCP tools, connector tokens, self-hosted storage, and deployment scripts so users can run their own AI reading room instead of sending full books or private notes to a third-party service.

The repository is useful beyond one deployment because it provides a reference pattern for:

- MCP tools that expose only unlocked context.
- Self-hosted reader-owned data.
- Web connector setup for ChatGPT and Claude.ai.
- HTTP MCP setup for Codex, Claude Code, and API clients.
- Plain-language deployment docs for non-expert users.

## How Codex and API Credits Would Be Used

Codex would be used for maintenance work that directly improves the open-source project:

- Keep the MCP server compatible with ChatGPT, Codex, Claude.ai, Claude Code, and other HTTP MCP clients.
- Review pull requests and catch regressions in the reading waterline, connector auth, and note-writing tools.
- Expand smoke tests for TXT, Markdown, EPUB import, MCP calls, SSE connections, and deployment scripts.
- Improve documentation for users who can operate a VPS but do not write code.
- Debug cross-client connector behavior using reproducible logs instead of model-reported errors.
- Maintain release notes, issue triage, and small fixes as users report installation or connector problems.

API credits would be used only for project maintenance and validation, such as testing connector behavior, validating MCP tool outputs, checking prompt-sensitive client workflows, and building automated regression checks for supported AI clients.

## Short Application Answers

### Project description

Lumina Reading Room is an open-source AI reading room. It lets ChatGPT/Codex-compatible agents read only the book passages a human has unlocked, track reading progress, and save structured reading notes through MCP tools.

### Maintainer role

I am the primary maintainer of Lumina Reading Room under GitHub account `linxi8590-jpg`. I maintain the public repository, deployment scripts, MCP server, connector docs, tests, and release updates.

### Why the repository qualifies

Lumina provides a practical open-source pattern for safe AI-assisted reading: AI can help with the current page, notes, and questions, but cannot read ahead. It combines self-hosted storage, a reading waterline, MCP tools, and web connector setup.

### How Codex would help

I would use Codex to maintain the MCP server, review changes, expand smoke tests, debug ChatGPT/Codex/Claude connector compatibility, improve docs for non-expert users, and automate release and regression checks.

### Ecosystem value

Lumina is useful as a reference implementation for reader-owned AI workflows: self-hosted books and notes, least-context connector tools, and plain-language deployment for people who want AI help without exposing a full text corpus.
