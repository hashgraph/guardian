# Read All Notifications

**`POST /api/v1/notifications/read/all`**

Marks all notifications as read for the authenticated user and returns the updated notification collection.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

No request body required.

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "title": "Policy published",
    "message": "Policy 'GHG Policy v1.0' has been published successfully.",
    "read": true,
    "type": "INFO",
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
