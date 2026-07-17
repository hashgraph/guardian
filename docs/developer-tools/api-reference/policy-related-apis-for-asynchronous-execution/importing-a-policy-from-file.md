# Importing a Policy from File (Async)

**`POST /policies/push/import/file`**

Imports a new policy and all associated artifacts from a zip file asynchronously. Returns a task ID immediately; poll `GET /tasks/{taskId}` for the result.

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

The request body must be the raw binary content of a `.zip` file exported from Guardian.

**Content-Type:** `application/octet-stream`

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Import policy file"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
