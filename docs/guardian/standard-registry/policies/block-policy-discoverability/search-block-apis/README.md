# Search Block APIs

Endpoint for discovering policy blocks that match a given block's configuration — used for policy discoverability and deduplication.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/analytics/search/block` | Searches for blocks with matching configurations across all policies | Yes |

## Endpoints

- [Searching Same Blocks](searching-same-blocks.md)
