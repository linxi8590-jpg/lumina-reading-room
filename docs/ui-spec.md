# UI Spec

This document defines the public UI direction for Lumina Reading Room.

It intentionally avoids project-internal owner names, local machine paths, and private workspace references.

## Design Principles

- Co-reading first: the UI should feel like reading with AI nearby, not asking a chatbot questions.
- AI notes are first-class: user notes and AI notes appear in the same reading context.
- Data ownership is visible: users should understand their books, notes, and connector tokens live in their own storage.
- VoiceOver-friendly from day one: every important action and state change needs semantic labels and predictable reading order.
- Modern but warm: the app should feel like a reading room, not a cold developer dashboard.

## Information Architecture

Main pages:

- Onboarding: explains what Lumina is and what the user needs.
- Shelf: book list and upload entry.
- Reader: the reading page with chapter navigation, text, waterline, and notes.
- Notes: grouped user and AI notes, filterable by note type.
- Connector setup: URL and token copy flow for AI clients.
- Settings: storage backend, theme, token management, and diagnostics.

Suggested first-run flow:

```text
Onboarding -> Storage setup -> Shelf -> Upload book -> Reader -> Connector setup
```

## Visual Language

Theme: warm reading room, paper, lamplight, and a quiet night sky.

### Colors

```css
:root {
  --paper-50:  #FBF7EE;
  --paper-100: #F1EBDA;
  --ink-900:   #1C1B17;
  --ink-700:   #44423A;
  --ink-500:   #777264;
  --lamp-500:  #E8AC3D;
  --lamp-200:  #F5E0A7;
  --sky-700:   #2A3D5C;
  --sky-500:   #4A6789;
  --red-500:   #C46A5E;
}

[data-theme="dark"] {
  --paper-50:  #1A1814;
  --paper-100: #25221C;
  --ink-900:   #F5EFE0;
  --ink-700:   #C4BBA8;
  --ink-500:   #8C8472;
  --lamp-500:  #FFC961;
  --lamp-200:  #4A3D1F;
  --sky-700:   #92AAD0;
  --sky-500:   #6D8AB4;
  --red-500:   #E18879;
}
```

### Typography

- Reading text: serif font stack, line-height around 1.8, max width around 70ch.
- UI controls: sans-serif font stack, compact and readable.
- Notes: slightly smaller than body text, but never tiny.

Recommended stacks:

```css
--font-reader: "Source Han Serif SC", "Noto Serif SC", serif;
--font-ui: Inter, "Source Han Sans SC", system-ui, sans-serif;
```

## Core Components

### BookShelf

Shows uploaded books, progress, title, author, and quick resume action.

Accessibility label example:

```text
Book title, author, read to chapter X of Y, P percent complete.
```

### ReadingView

Desktop layout:

```text
[chapters 200px] [reading max 70ch] [notes 320px]
```

Mobile layout:

```text
[reading]
chapters and notes open as drawers
```

The reading waterline should be visible near the top so users always know what AI can see.

### ReadingWaterline

Shows unlocked progress.

Accessibility label example:

```text
Read to chapter X, paragraph Y. AI can only access content up to this point.
```

### NoteBubble

Fields:

- `author_type`: `user` or `ai`
- `note_type`: `reflection`, `highlight`, `quote`, `question`, or `review_card`
- `model_name`: optional, for AI notes
- `content`
- `created_at`

Visual distinction:

- User notes: plain border, reader-owned tone.
- AI notes: soft lamplight background, model name in small metadata text.

Note type mapping:

| Type | Visual behavior |
| ---- | --------------- |
| `reflection` | Default note bubble |
| `highlight` | Strong lamplight border |
| `quote` | Quotation card |
| `question` | Question marker and answer action |
| `review_card` | Study card style |

### ConnectorSetup

This page must make connector setup easy for non-technical users.

```text
Connect AI

Lumina URL
https://your-domain.example/mcp        [Copy]

Connector Token
lrr_abcd1234••••••••••                [Show] [Copy]

This token is the key to your reading room. Do not post it online.
```

Required behavior:

- Token is masked by default.
- Copy buttons announce success with `aria-live`.
- Client tabs can explain Claude, ChatGPT, Codex, and Claude Code setup.
- Regenerating a token must warn that old AI clients need to be reconfigured.

## Microcopy

- Product title: `星灯书房 · Lumina Reading Room`
- Subtitle: `AI reads only the pages you've read.`
- Empty shelf: `Your reading room is quiet. Upload a book to begin.`
- Connector intro: `Your AI does not know where your reading room is yet. Give it two lines of configuration and it can come in.`
- Token warning: `This token is the key to your reading room. Do not post it online.`

## Accessibility

- Every action needs an accessible label.
- Decorative icons should be `aria-hidden="true"`.
- Copy success, waterline changes, and new notes should use `aria-live="polite"`.
- Reading waterline should be read before the main text when entering the reader.
- Note bubbles should be grouped so screen readers do not read every small visual part as a separate interruption.
- Color contrast must meet WCAG AA.

## Boundaries

The UI must not invent new data types.

Canonical `note_type` values come from `deploy/supabase/schema.sql`.

Canonical connector values:

```text
URL: https://your-domain.example/mcp
Authorization: Bearer lrr_xxxxxxxxxxxxxxxxxxxxx
```
