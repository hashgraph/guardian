# Task Statuses APIs

Endpoint for polling the status of long-running asynchronous operations. All `push/` endpoints return a `taskId` that can be polled here.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/tasks/{taskId}` | Returns the current status and result of an asynchronous task | Yes |

## Endpoints

- [Returning Task Statuses](returning-task-statuses.md)
