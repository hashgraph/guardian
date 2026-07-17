# Publishing Schema (Async)

**`PUT /schemas/push/{schemaId}/publish`**

Publishes the specified schema onto IPFS asynchronously, sending a message with its IPFS CID to the corresponding Hedera topic. Returns a task ID immediately; poll `GET /tasks/{taskId}` for the result.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_REVIEW`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | string | Yes | The schema ID (MongoDB ObjectId, e.g. `63e3e5e8a01b3c001234abcd`) |

### Request Body

```json
{
  "version": "1.0.0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | The version string to assign to the published schema (e.g. `1.0.0`) |

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Publish schema"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions or schema owned by another user |
| `404 Not Found` | Schema not found |
| `422 Unprocessable Entity` | Schema is already published or version already exists |
| `500 Internal Server Error` | Unexpected server failure |
