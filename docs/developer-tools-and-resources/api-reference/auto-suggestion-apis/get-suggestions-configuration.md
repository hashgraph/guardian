# Get Suggestions Configuration

**`GET /api/v1/suggestions/config`**

Returns the current auto-suggestion priority order configuration. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SUGGESTIONS_SUGGESTIONS_READ`

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "items": [
    {
      "id": "63e3e5e8a01b3c001234abcd",
      "blockType": "requestVcDocumentBlock",
      "order": 1
    }
  ]
}
```

| Field          | Type   | Description                                         |
|----------------|--------|-----------------------------------------------------|
| `items`        | array  | List of suggestion priority configuration entries   |
| `items[].id`   | string | Unique identifier of the configuration entry        |
| `items[].blockType` | string | Block type for this priority entry            |
| `items[].order` | number | Priority order (lower number = higher priority)   |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
