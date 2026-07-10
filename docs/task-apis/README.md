# Task APIs

**Base URL:** `/api/v1/tasks`

These endpoints allow callers to poll the status of asynchronous operations initiated by any Guardian `/push` endpoint, returning the task state, progress, and result or error detail.

**Authentication:** All endpoints require a valid JWT Bearer token (`Authorization: Bearer <token>`). Obtain a token via `POST /accounts/login`.

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/tasks/{taskId}` | Return the current status and result of an asynchronous task | Yes |

---

## Endpoint Details

* [Returning Task Statuses](returning-task-statuses.md) — `GET /tasks/{taskId}`
