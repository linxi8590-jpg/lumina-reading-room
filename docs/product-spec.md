# Product Spec

## One Sentence

Lumina Reading Room is a self-hosted AI co-reading room where AI can only read what the reader has already unlocked.

## Design Principles

- Co-reading, not whole-book summarization.
- Reading waterline, not RAG over the entire book.
- User-owned storage.
- AI notes are first-class reading artifacts.
- Modern consumer UI, not a cold developer dashboard.
- Connect existing AI clients instead of forcing one AI provider.

## Reading Waterline

The reading waterline is the highest section or paragraph the reader has unlocked.

The server must never return content after the waterline to AI tools.

Allowed:

```text
current passage
previous unlocked sections
user notes on unlocked content
AI notes on unlocked content
```

Not allowed:

```text
future pages
future chapters
whole-book search across unread content
whole-book summary
```

## Notes

Both the reader and AI can write notes.

Note types:

- `reflection`: subjective reading feeling
- `highlight`: key point
- `quote`: memorable sentence
- `question`: thinking prompt
- `review_card`: study card

## Public Project vs Private Guixu Room

Public Lumina is a generic, self-hosted reading room.

Private Guixu room can later attach a book to an existing Guixu chat window with long-term relationship context. That is a separate private feature and should not complicate the public open source project.

