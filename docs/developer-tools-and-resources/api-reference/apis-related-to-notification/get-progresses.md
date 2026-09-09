# Get Progresses

**`GET /api/v1/notifications/progresses`**

Returns all active progress notifications (long-running task statuses) for the authenticated user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

No parameters required.

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "title": "Publishing policy",
    "message": "Policy 'GHG Policy v1.0' is being published.",
    "progress": 65,
    "type": "PROGRESS",
    "userId": "63e3e5e8a01b3c001234abce",
    "createDate": "2024-01-15T10:30:00.000Z"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `500 Internal Server Error` | Unexpected server failure |
