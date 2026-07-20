# Retrieves Tool Configuration

**`GET /api/v1/tools/{id}`**

Retrieves the full configuration for a specific tool by its ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Tool ID (MongoDB ObjectId) |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "My Tool",
  "description": "Tool description",
  "status": "DRAFT",
  "creator": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "topicId": "0.0.5000001",
  "config": {
    "blockType": "tool",
    "children": []
  }
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `id` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
