# Architecture

Lumina Reading Room has three parts:

1. Web reader: the place where the user reads, unlocks progress, and writes notes.
2. Server: stores books, pages, reading state, notes, and exposes API/MCP tools.
3. Connectors: let ChatGPT, Claude, Codex, Claude Code, and other MCP-capable clients read the unlocked context.

## Core rule

AI can only access content that the reader has already unlocked.

This is enforced by data queries. The model is not trusted to avoid spoilers by prompt alone.

## Reading waterline

The reading waterline is the highest section or paragraph the user has reached.

If the user has unlocked chapter 5, tools may return chapter 1 through chapter 5.

If the user has only unlocked chapter 1, tools may return chapter 1 only.

Unread content may exist in storage, but it is invisible to AI tools.

## Data model

The canonical schema lives in:

```text
deploy/supabase/schema.sql
```

Main tables:

- `books`
- `sections`
- `reading_states`
- `reading_notes`
- `connector_tokens`

## Note types

Notes can be written by a human or by AI.

Allowed note types:

- `reflection`: feeling or interpretation.
- `highlight`: important point.
- `quote`: quote or golden sentence.
- `question`: a question worth thinking about.
- `review_card`: study or exam review card.

UI should render these differently, but the data shape is shared.

## MCP tool contract

The MCP server should expose read tools and limited write tools.

Read tools:

- `get_current_reading_state`
- `get_current_passage`
- `get_unlocked_context`
- `get_reading_notes`

Write tools:

- `save_ai_note`
- `advance_reading_progress`

There must be no tool that fetches future sections.

## Connection string

User-facing connection string:

```text
Server URL: https://your-domain.example/mcp
Authorization: Bearer <connector-token>
```

The token is scoped to the user's own library.

