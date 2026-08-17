# Returns All Schemas (Api-Version: 2)

**`GET /schemas`** — requires `Api-Version: 2` header

Returns all schemas. Version 2 adds `search` and `searchOptions` query filters.

If `category` is omitted, schemas of all categories matching the standard owner/non-system/non-readonly filters are returned. Published tool schemas that do not match the current owner are only included when `category=TOOL`.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_READ`

---

## Request

### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Api-Version` | `2` | Yes | Enables V2 behaviour (search and searchOptions filters) |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageIndex` | number | No | The number of pages to skip before starting to collect the result set |
| `pageSize` | number | No | The number of items to return |
| `category` | string | No | Schema category. Allowed values: `POLICY`, `MODULE`, `TOOL`, `TAG`, `SYSTEM`. If omitted, all categories are returned (excluding tool schemas from other owners) |
| `policyId` | string | No | Filter by policy ID |
| `moduleId` | string | No | Filter by module ID |
| `toolId` | string | No | Filter by tool ID |
| `topicId` | string | No | Filter by topic ID. Use `not-binded` to return policy schemas not bound to any policy topic |
| `search` | string | No | Free-text search term |
| `searchOptions` | string[] | No | Search scopes. Supported values: `uuid` (IRI), `name`, `description`, `references` (`$defs`), `fields` (document fields excluding `$defs`). Supports repeated query params or comma-separated values. If omitted, search is performed across all scopes |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of schema objects. The total item count is provided in the `X-Total-Count` response header.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Schema name",
    "description": "Description",
    "entity": "string",
    "iri": "string",
    "status": "PUBLISHED",
    "topicId": "f3b2a9c1e4d5678901234567",
    "version": "1.0.0",
    "owner": "did:hedera:testnet:...",
    "messageId": "1700000000.000000001",
    "category": "POLICY",
    "documentURL": "https://example.com",
    "contextURL": "https://example.com",
    "document": {},
    "context": {}
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
