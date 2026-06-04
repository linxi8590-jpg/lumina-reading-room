# Lumina Core

Shared logic belongs here:

- reading waterline checks
- section ordering
- note type constants
- connector response shapes

Core rule:

```text
AI-visible content must satisfy section.order_index <= reading_state.unlocked_section_index.
```

