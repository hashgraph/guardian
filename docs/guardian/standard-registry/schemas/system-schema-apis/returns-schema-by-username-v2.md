# Returns Schema by Username (Api-Version: 2)

**`GET /schemas/system/{username}`** — requires `Api-Version: 2` header

Returns all system schemas for the authenticated user. Version 2 fetches only the required schema fields (optimised payload) via `getSystemSchemasV2`. Only users with the Standard Registry role are allowed to make the request.

> **Note:** The `username` path parameter is kept for URL compatibility with existing clients. The server does not use this value when resolving the response — the returned system schemas are determined solely by the authenticated user and query parameters.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SYSTEM_SCHEMA_READ`

---

## Request

### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Api-Version` | `2` | Yes | Enables V2 behaviour (optimised field set) |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | String | Yes | Present for URL compatibility only; not used server-side |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageIndex` | Integer | No | The number of pages to skip before starting to collect the result set |
| `pageSize` | Integer | No | The number of items to return |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of system schema objects containing only required fields. The total item count is provided in the `X-Total-Count` response header.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Schema name",
    "description": "Description",
    "entity": "string",
    "iri": "string",
    "status": "string",
    "topicId": "f3b2a9c1e4d5678901234567",
    "version": "1.0.0",
    "owner": "string",
    "messageId": "f3b2a9c1e4d5678901234567",
    "category": "string",
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
