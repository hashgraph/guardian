# Updates Tool Configuration

**`PUT /api/v1/tools/{id}`**

Updates the configuration for a specific tool by its ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_UPDATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Tool ID (MongoDB ObjectId) |

### Request Body

```json
{
  "name": "Updated Tool Name",
  "description": "Updated description",
  "config": {
    "blockType": "tool",
    "children": []
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable name of the tool |
| `description` | string | No | Brief description of the tool's purpose |
| `config` | object | Yes | Tool configuration object; `blockType` must be `"tool"` |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Updated Tool Name",
  "description": "Updated description",
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
| `422 Unprocessable Entity` | `id` is missing, or tool config is invalid |
| `500 Internal Server Error` | Unexpected server failure |
