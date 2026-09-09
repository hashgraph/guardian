# Tagging APIs

Endpoints for creating, searching, synchronizing, and deleting tags on Guardian policy entities.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/tags` | Creates a new tag | Yes |
| `POST` | `/api/v1/tags/search` | Searches for tags matching the specified criteria | Yes |
| `DELETE` | `/api/v1/tags/{tagId}` | Deletes the specified tag | Yes |
| `GET` | `/api/v1/tags/synchronization` | Synchronizes tags from the Hedera network | Yes |

## Endpoints

- [Creating Tag](creating-tag.md)
- [Searching Tag](searching-tag.md)
- [Deleting Tag](deleting-tag.md)
- [Synchronization of Tags](synchronization-of-tags.md)
