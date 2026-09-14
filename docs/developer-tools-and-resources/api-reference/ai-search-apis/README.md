# AI Search APIs

Endpoints for Guardian's AI-powered policy suggestion and natural language search capabilities.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/ai-suggestions` | Returns AI-generated policy recommendations for a given query | No |
| `PUT` | `/api/v1/ai-suggestions/rebuild-vector` | Rebuilds the AI vector index from current policy data | No |
| `POST` | `/api/v1/ai-suggestions/schema-properties` | Returns AI-suggested glossary properties for one or more schema fields | Yes (`Permissions.SCHEMAS_SCHEMA_CREATE`) |

## Endpoints

- [Returns AI Search Response](returns-response.md)
- [Rebuilds Vector Based on Policy Data](rebuilds-vector-based-on-policy-data.md)
- [Suggests Schema Field Properties](suggest-schema-field-properties.md)
