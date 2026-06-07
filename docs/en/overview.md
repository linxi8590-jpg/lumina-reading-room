# Lumina Reading Room Overview

Lumina Reading Room is an open-source, self-hosted reading room for AI-assisted reading. A reader uploads a book, reads it in the browser, and connects ChatGPT, Claude, Codex-compatible agents, or other MCP clients to the reading room.

The core promise is simple: AI can only read what the human reader has already unlocked. It can discuss the current passage, review earlier passages, list reading notes, and save private reading reflections, but it cannot inspect future chapters.

## Why it matters

Most AI reading workflows either paste large chunks of text into a chat or give the model the whole book at once. That changes the reading experience: the assistant becomes a spoiler-prone summarizer instead of a companion reading alongside the user.

Lumina keeps the AI on the same page as the reader. This is useful for fiction, essays, research material, long-form articles, and any reading workflow where pacing, discovery, and privacy matter.

## Current capabilities

- Browser reading room for TXT, Markdown, and EPUB files.
- Per-book reading progress and a strict unlocked-content waterline.
- MCP tools for current passage, unlocked context, reading state, and notes.
- A write tool for private AI reading reflections.
- Connector setup for ChatGPT web, Claude.ai, Codex, Claude Code, and HTTP MCP clients.
- One-command VPS deployment with HTTPS through Caddy.

## Safety boundary

The server enforces the reading waterline. AI clients can request only the content that has already been unlocked by the reader. Reflection tools reject attempts to attach notes beyond that unlocked position.

The project is self-hosted. Book files, notes, and reading progress remain on the user's own server.

## Maintenance status

The project is actively maintained by its primary maintainer, Linxi, under the public GitHub repository `linxi8590-jpg/lumina-reading-room`.

Recent work focused on real user testing, ChatGPT and Claude connector compatibility, clearer installation docs for non-engineer users, and smoke tests that cover import, reading progress, MCP access, SSE access, and note persistence.

