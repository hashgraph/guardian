# Previews the Schema from IPFS (Async)

**`POST /schemas/push/import/message/preview`**

Previews a schema from IPFS asynchronously without importing it into the local database. Returns a task ID immediately; poll `GET /tasks/{taskId}` for the result.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

---

## Request

### Request Body

```json
{
  "messageId": "1680000000.000000001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | string | Yes | The Hedera message ID containing the IPFS CID of the schema |

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Preview schema message"
}
```

Poll `GET /tasks/{taskId}` to retrieve the preview result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Message ID is missing |
| `500 Internal Server Error` | Unexpected server failure |
