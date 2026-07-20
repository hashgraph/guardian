# Previews Imported Tool from IPFS

**`POST /api/v1/tools/import/message/preview`**

Returns a preview of the tool that would be imported from IPFS using a Hedera message ID, without persisting any changes.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_CREATE`

---

## Request

### Request Body

```json
{
  "messageId": "1700000000.000000001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | string | Yes | Hedera message ID referencing the tool on IPFS |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "tool": {
    "name": "Preview Tool",
    "description": "Tool preview from IPFS",
    "config": {
      "blockType": "tool",
      "children": []
    }
  },
  "schemas": []
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `messageId` is missing from the request body |
| `500 Internal Server Error` | Unexpected server failure |
