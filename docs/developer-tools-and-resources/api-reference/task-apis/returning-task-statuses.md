# Returning Task Statuses

**`GET /tasks/{taskId}`**

Returns the current status and result of an asynchronous task by its ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string (UUID) | Yes | The unique identifier of the task |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "action": "Create policy",
  "done": true,
  "error": null,
  "result": {},
  "steps": [
    {
      "time": "2024-06-01T12:34:56.789Z",
      "message": "Policy created"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | string | The task identifier |
| `action` | string | Description of the task action |
| `done` | boolean | Whether the task has completed |
| `error` | object \| null | Error details if the task failed |
| `result` | object \| null | Task result payload when done |
| `steps` | array | Progress steps completed so far |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `500 Internal Server Error` | Unexpected server failure |
