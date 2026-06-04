# Security Notes

Lumina Reading Room is self-hosted. Users keep their own books, notes, and connector tokens.

## Real risks

The important risks are:

- Connector endpoint is scanned by strangers.
- Token leaks into public logs or screenshots.
- AI tool can read future chapters by mistake.
- Prompt injection in book text tries to make AI exfiltrate private notes.
- Public deployment exposes admin endpoints.

## Baseline mitigations

- Every `/mcp` and API request must require `Authorization: Bearer <token>`.
- Tokens should be generated locally and stored by the user.
- Tools must filter by reading waterline before returning text.
- There should be no tool that fetches future content.
- Write tools should be narrow: save notes, advance progress.
- Logs must not print tokens or full book content.

## Token handling

The token is a key to the reading room.

Do not:

- Put it in a public repo.
- Paste it in screenshots.
- Share it in an issue.
- Print it in server logs.

Do:

- Rotate it if leaked.
- Keep it in `.env`.
- Use HTTPS in public deployments.

## Supabase keys

`SUPABASE_ANON_KEY` can be used by the browser when Row Level Security is configured.

`SUPABASE_SERVICE_ROLE_KEY` must only live on the connector server or Supabase Edge Function. It bypasses RLS, so it must never be exposed to the browser, public logs, screenshots, or GitHub.
