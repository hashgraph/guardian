# Returns all Schemas related to the topic

**`GET /schemas/{topicId}`**

Returns all schemas by topicId.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | String | Yes | Topic ID |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageIndex` | Integer | No | The number of pages to skip before starting to collect the result set |
| `pageSize` | Integer | No | The number of items to return |

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
    "status": "PUBLISHED",
    "topicId": "f3b2a9c1e4d5678901234567",
    "version": "1.0.0"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
