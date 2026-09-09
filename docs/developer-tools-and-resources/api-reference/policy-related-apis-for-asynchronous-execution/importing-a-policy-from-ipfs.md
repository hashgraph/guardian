# Importing a Policy from IPFS (Async)

**`POST /policies/push/import/message`**

Imports a new policy and all associated artifacts from IPFS asynchronously using the Hedera message ID. Returns a task ID immediately; poll `GET /tasks/{taskId}` for the result.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_CREATE`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `versionOfTopicId` | string | No | — | The topic ID of the policy version to associate |
| `demo` | boolean | No | false | Import the policy in demo mode |

### Request Body

```json
{
  "messageId": "1680000000.000000001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | string | Yes | The Hedera message ID containing the IPFS CID of the policy |

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Import policy message"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Message ID is missing |
| `500 Internal Server Error` | Unexpected server failure |
