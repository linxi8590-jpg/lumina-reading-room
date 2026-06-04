# Comparable Project Research - 2026-06-05

This document compares Lumina Reading Room with adjacent open source projects and public user discussions.

Research time: 2026-06-05, Asia/Shanghai.

## Scope

The goal is not to prove that Lumina has no competitors. Similar ideas already exist, which is useful. The goal is to understand what they do well, what they do differently, and what Lumina should borrow or avoid.

Lumina's current product thesis:

- AI can only access what the reader has already unlocked.
- Reading happens in a web reader, not an app store-only native app.
- The user's books and notes stay in user-owned storage.
- AI notes and human notes are durable reading artifacts.
- Existing AI clients can connect through a connector instead of forcing a new AI chat app.

## Executive Summary

Open source projects around reading and AI fall into three broad groups:

1. Mature ebook readers: strong file format support, reading UX, library management, sync, and cross-device habits.
2. General AI/RAG knowledge apps: strong deployment, connectors, document ingestion, and chat with knowledge bases.
3. Content automation and AI reading-helper workflows: useful for study notes, summaries, and social sharing, but often not designed for true co-reading.

Lumina's clearest advantage is the reading waterline: unread content exists in storage but is invisible to AI tools. Most AI knowledge-base projects ingest the whole document first and rely on prompts or retrieval behavior to avoid spoilers. Lumina enforces the boundary at the data layer.

Lumina's clearest current gaps are mature import support, beginner deployment polish, storage backend selection in the product UI, connector setup guides, mobile layout polish, and export/sync workflows.

## Representative Projects

Facts in this table come from public GitHub metadata fetched during this research window unless otherwise noted. Star counts and update times can change quickly.

| Project | Public facts | What it does well | What Lumina should learn | Where Lumina differs |
| --- | --- | --- | --- | --- |
| [Readest](https://github.com/readest/readest) | Modern cross-platform ebook reader. GitHub metadata: about 21k stars, AGPL-3.0, active on 2026-06-04 UTC. | Consumer reading UX, cross-platform distribution, library experience. | Reading polish matters. Users expect font controls, layout controls, progress, and a smooth shelf before they care about AI. | Readest is an ebook reader first. Lumina is a co-reading room with an AI visibility boundary. |
| [Koodo Reader](https://github.com/koodo-reader/koodo-reader) | Ebook manager and reader for desktop, mobile, and web. GitHub metadata: about 27k stars, AGPL-3.0, many supported formats. | Format coverage, sync/backup concepts, broad platform expectations. | Lumina should not stay TXT/MD-only for long. EPUB/PDF/import stability is a product requirement, not a nice-to-have. | Koodo manages books; Lumina manages what AI can and cannot know while reading. |
| [KOReader](https://github.com/koreader/koreader) | Ebook reader for Kindle, Kobo, Android, and other devices. GitHub metadata: about 27k stars, AGPL-3.0, strong EPUB/PDF/e-ink support. | Serious reading-device ergonomics, document reflow, long-form reading controls. | The reader should respect long sessions, navigation, bookmarks, and stable positions. | KOReader is device-reader focused. Lumina is web/self-hosted and AI-connector focused. |
| [IReader](https://github.com/IReaderorg/IReader) | Open source novel reader for Android and desktop. GitHub metadata: about 846 stars, Apache-2.0, active on 2026-06-04 UTC. | Lightweight reading app pattern and novel-library flow. | Simpler reader flows can be easier for new users than feature-heavy ebook managers. | Lumina should stay approachable, but its main feature is not just reading; it is AI co-reading with notes. |
| [Khoj](https://github.com/khoj-ai/khoj) | Self-hostable AI second brain for documents, web pages, and custom agents. GitHub metadata: about 34k stars, AGPL-3.0, active on 2026-06-04 UTC. | Self-hosting, agents, retrieval, personal knowledge workflows. | Deployment docs, connector thinking, and source-grounded answers are worth studying. | Khoj is knowledge-base first. It generally assumes ingestion is useful; Lumina must deliberately avoid giving AI unread text. |
| [Onyx](https://github.com/onyx-dot-app/onyx) | Open source AI platform for company knowledge and LLM chat. GitHub metadata: about 30k stars, active on 2026-06-04 UTC. | Admin model, connectors, workplace document retrieval, permissions. | Borrow ideas around source boundaries, diagnostics, and deployment health checks. | Onyx optimizes organizational search. Lumina optimizes one reader's reading waterline. |
| [Open WebUI](https://github.com/open-webui/open-webui) | User-friendly AI web interface with local and remote LLM support. GitHub metadata: about 140k stars, self-hosted AI UI, active on 2026-06-04 UTC. | Easy AI UI adoption, provider flexibility, local model community. | Good setup UX and local model support can reduce user friction. | Lumina should not become another general chat UI. It should connect to existing AI tools and keep reading first. |
| [LobeHub / Lobe Chat ecosystem](https://github.com/lobehub/lobe-chat) | AI chat ecosystem with agents, knowledge-base and MCP-related topics. GitHub API redirected metadata during research, so exact repo packaging should be rechecked before implementation decisions. | Agent UI, provider management, knowledge base UX. | Client setup patterns and provider configuration can inspire connector docs. | Lumina should not compete as a full AI chat product. |
| [Chatty](https://github.com/addyosmani/chatty) | Private AI chat that runs models in the browser. GitHub metadata: about 822 stars, MIT, active on 2026-06-04 UTC. | Browser-local AI privacy pattern. | A later local-only mode could be valuable for privacy-sensitive readers. | Lumina's first path is connector-based co-reading, not browser-local chat. |

## Chinese Community Signals

Searches around "AI read with me", "AI reading companion", and "AI reading notes" showed two useful patterns.

### AI as a Reading Buddy

A public article titled "我的读书搭子是 AI" described a user reading while using AI voice conversation as a companion. The important product signal is not summary generation. It is presence: the reader wants to ask about a word, a sentence, or a feeling at the moment of reading.

Source: <https://tidenews.com.cn/news.html?id=3358345>

Product implication:

- Lumina should keep the "AI is already at the same page" feeling.
- The current passage tool matters more than a whole-book summary.
- Voice or low-friction input can become a later feature, but the data boundary must remain the same.

### AI Reading Notes as Content Automation

Search results also surfaced workflows around generating and publishing reading notes for social platforms. These are not the same as co-reading, but they reveal demand for structured outputs: highlights, quotes, study cards, and shareable notes.

Source example: <https://juejin.cn/post/7599478406237536265>

Product implication:

- Lumina's `highlight`, `quote`, `question`, and `review_card` note types are well aligned with real user behavior.
- Later export features should include Markdown, image cards, and study-review formats.
- Avoid making content publishing the core product. It can easily turn Lumina into a note factory instead of a reading room.

### Xiaohongshu Sampling Limitation

Logged-out Xiaohongshu web search opened, but this research session did not reliably expose readable note cards through the browser. Search engine results for Xiaohongshu were also sparse and noisy. Treat this as an incomplete signal, not a full community survey.

Search page tested: <https://www.xiaohongshu.com/search_result/?keyword=AI%E8%AF%BB%E4%B9%A6%E4%BC%B4%E8%AF%BB&type=51>

## Lumina Advantages

### 1. Data-Layer Spoiler Prevention

Many AI document tools ingest the whole document and then try to answer well. Lumina's waterline blocks unread content before the model sees it. This is the central technical and product difference.

### 2. Co-Reading Instead of Chat-With-Book

"Chat with a book" usually feels like asking a librarian who has already read everything. Lumina should feel like someone sitting beside the reader, seeing the same progress and writing notes along the way.

### 3. User-Owned Storage

The deployment choices should make it clear that books and notes belong to the user. This is especially important because books are personal, copyrighted, and often emotionally private.

### 4. Existing AI Clients

Lumina should not force users into one more chat app. A connector lets the user's preferred AI client enter the reading room. This keeps the project provider-neutral and easier to adopt.

### 5. First-Class AI Notes

AI notes are not temporary chat output. They become part of the book's reading record, next to the reader's own notes.

## Current Gaps

### Product Gaps

- Storage backend selection needs to be visible in onboarding/settings, not only documented.
- Connector setup needs real step-by-step tabs for common AI clients.
- The first-run path needs to be smooth: choose storage, create token, upload book, connect AI, start reading.
- Mobile layout needs a real drawer pattern for chapters and notes.
- Settings needs diagnostics for server URL, token validity, and backend health.

### Technical Gaps

- TXT/MD import is enough for a scaffold, but EPUB/PDF support is necessary for real use.
- Stable section and paragraph IDs need to survive re-imports and edits.
- Any future embedding/search feature must index only unlocked content for AI-facing tools.
- Backups and exports are needed before users trust the app with notes.
- Supabase and Docker paths should use the same schema concepts and behavior.

### Documentation Gaps

- Beginner docs should avoid assuming users know what API, token, MCP, or Docker mean.
- Connector docs need copy-paste examples and screenshots.
- Deployment docs should start with "which option should I choose?" before listing commands.
- Public docs should include the core promise in plain words: AI can only see pages you have reached.

## What To Borrow

From ebook readers:

- Format support roadmap: EPUB first, PDF second, then broader formats.
- Reader controls: font size, line height, theme, narrow/wide layout, progress.
- Library management: title, author, cover, last read, progress.

From AI/RAG apps:

- Health checks and diagnostics.
- Clear connector setup.
- Provider-neutral language.
- Self-host deployment templates.

From reading-note workflows:

- One-click generation of highlight, quote, question, and review-card notes.
- Markdown export.
- Later, shareable quote cards as an optional export.

## What To Avoid

- Whole-book ingestion as the default AI context.
- Summary-first onboarding that lets users skip reading.
- Turning the app into a generic AI chat UI.
- Making social posting the primary workflow.
- Storing user books on a project-owned server.

## Recommended Next Steps

1. Finish storage backend selection in the product UI.
2. Run an end-to-end smoke test: quickstart server, web reader, upload book, advance waterline, and MCP tool call.
3. Add connector setup tabs for Claude, ChatGPT, Codex, and Claude Code with scrubbed screenshots or generic visual guides.
4. Add public docs that explain the reading waterline with one small example.
5. Start an import roadmap with EPUB as the first serious format.
6. Add export formats for notes: Markdown first, then study-card JSON or CSV.

## Source Links

- Readest: <https://github.com/readest/readest>
- Koodo Reader: <https://github.com/koodo-reader/koodo-reader>
- KOReader: <https://github.com/koreader/koreader>
- IReader: <https://github.com/IReaderorg/IReader>
- Khoj: <https://github.com/khoj-ai/khoj>
- Onyx: <https://github.com/onyx-dot-app/onyx>
- Open WebUI: <https://github.com/open-webui/open-webui>
- Lobe Chat: <https://github.com/lobehub/lobe-chat>
- Chatty: <https://github.com/addyosmani/chatty>
- AI reading buddy article: <https://tidenews.com.cn/news.html?id=3358345>
- AI reading-note automation example: <https://juejin.cn/post/7599478406237536265>
- Xiaohongshu search page tested: <https://www.xiaohongshu.com/search_result/?keyword=AI%E8%AF%BB%E4%B9%A6%E4%BC%B4%E8%AF%BB&type=51>
