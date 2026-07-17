# Creates New Policy (Async)

**`POST /policies/push`**

Creates a new policy asynchronously. Returns a task ID immediately; poll `GET /tasks/{taskId}` for the result.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_CREATE`

---

## Request

### Request Body

```json
{
  "name": "iREC Policy",
  "version": "1.0.0",
  "description": "iREC standard policy",
  "config": {}
}
```

The request body is the full policy configuration object.

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Create policy"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
