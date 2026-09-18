# Publishes Tool onto IPFS

**`PUT /api/v1/tools/{id}/publish`**

Publishes the tool with the specified tool ID onto IPFS and sends a message featuring its IPFS CID into the corresponding Hedera topic.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_REVIEW`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Tool ID (MongoDB ObjectId) |

### Request Body

```json
{
  "version": "1.0.0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Version string to assign to the published tool |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "valid": true,
  "results": []
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `id` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
