# Imports New Tool from IPFS Asynchronously

**`POST /api/v1/tools/push/import/message`**

Asynchronously imports a new tool and all associated artifacts from IPFS using a Hedera message ID, and returns a task ID for polling the result.

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

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Import tool message"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `messageId` is missing from the request body |
| `500 Internal Server Error` | Unexpected server failure |
