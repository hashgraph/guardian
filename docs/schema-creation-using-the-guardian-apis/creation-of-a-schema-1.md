# Listing of Schemas

**`GET /api/v1/schemas`**

Returns a paginated list of all schemas owned by the authenticated Standard Registry user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index (number of pages to skip) |
| `pageSize` | number | No | 20 | Number of items to return per page |
| `category` | string | No | — | Schema category filter (e.g. `POLICY`) |
| `policyId` | string | No | — | Filter schemas by policy ID |
| `moduleId` | string | No | — | Filter schemas by module ID |
| `toolId` | string | No | — | Filter schemas by tool ID |
| `topicId` | string | No | — | Filter schemas by topic ID |

---

## Response

### Success Response

**Status:** `200 OK`

The response includes an `X-Total-Count` header containing the total number of matching schemas.

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
