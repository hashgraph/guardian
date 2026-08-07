# Listing of Schema

**`GET /schemas`**

Returns all schemas.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageIndex` | Integer | No | The number of pages to skip before starting to collect the result set |
| `pageSize` | Integer | No | The number of items to return |
| `category` | String | No | Schema category |
| `policyId` | String | No | Policy ID |
| `moduleId` | String | No | Module ID |
| `toolId` | String | No | Tool ID |
| `topicId` | String | No | Topic ID |

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
