# Auto-Suggestion APIs

Endpoints for retrieving AI-powered block type suggestions during policy authoring and managing the auto-suggestion configuration.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** Standard Registry role required.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/suggestions` | Returns the next and nested suggested block types for the current policy context | Yes |
| `GET` | `/api/v1/suggestions/config` | Returns the current auto-suggestion configuration | Yes |
| `POST` | `/api/v1/suggestions/config` | Updates the auto-suggestion configuration | Yes |

## Endpoints

- [Get Next and Nested Suggested Block Types](get-next-and-nested-suggested-block-types.md)
- [Get Suggestions Configuration](get-suggestions-configuration.md)
- [Set Suggestions Configuration](set-suggestions-configuration.md)
