# Creating New Tool

**`POST /api/v1/tools`**

Creates a new tool for the current Standard Registry user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_CREATE`

---

## Request

### Request Body

```json
{
  "name": "My Tool",
  "description": "Tool description",
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
| `422 Unprocessable Entity` | Invalid tool config (e.g., missing or incorrect `blockType`) |
| `500 Internal Server Error` | Unexpected server failure |
