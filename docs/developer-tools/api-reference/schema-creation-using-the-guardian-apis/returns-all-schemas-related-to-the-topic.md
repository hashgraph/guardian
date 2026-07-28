# Returns All Schemas Related to the Topic

**`GET /api/v1/schemas/{topicId}`**

Returns a paginated list of all schemas associated with the specified Hedera topic ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | string | Yes | The Hedera topic ID to filter schemas by (e.g. `0.0.1234567`) |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index (number of pages to skip) |
| `pageSize` | number | No | 20 | Number of items to return per page |
| `category` | string | No | — | Schema category filter (e.g. `POLICY`) |

---

## Response

### Success Response

**Status:** `200 OK`

The response includes an `X-Total-Count` header with the total number of matching schemas.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Carbon Offset Schema",
    "description": "Schema for carbon offset reporting",
    "entity": "VC",
    "status": "PUBLISHED",
    "version": "1.0.0",
    "topicId": "0.0.1234567",
    "owner": "example_user"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
