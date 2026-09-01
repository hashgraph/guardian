# Get New Notifications

**`GET /api/v1/notifications/new`**

Returns all unread (new) notifications for the authenticated user along with their total count.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

No parameters required.

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "items": [
    {
      "id": "63e3e5e8a01b3c001234abcd",
      "title": "Policy published",
      "message": "Policy 'GHG Policy v1.0' has been published successfully.",
      "read": false,
      "type": "INFO",
      "userId": "63e3e5e8a01b3c001234abce",
      "createDate": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `500 Internal Server Error` | Unexpected server failure |
