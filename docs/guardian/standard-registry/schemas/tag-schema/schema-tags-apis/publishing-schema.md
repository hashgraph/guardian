# Publishing Schema

**`PUT /tags/schemas/{schemaId}/publish`**

Publishes the tag schema with the provided (internal) schema ID onto IPFS, and sends a message featuring the IPFS CID into the corresponding Hedera topic. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_REVIEW`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | String | Yes | Schema ID |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of tag schema objects.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Tag Schema name",
    "status": "PUBLISHED",
    "version": "1.0.0",
    "messageId": "1700000000.000000001"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
