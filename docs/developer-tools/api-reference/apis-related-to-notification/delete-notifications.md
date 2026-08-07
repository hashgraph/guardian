# Delete Notifications

**`DELETE /api/v1/notifications/delete/{notificationId}`**

Deletes all notifications up to and including the specified notification and returns the count of deleted notifications.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `notificationId` | string | Yes | The identifier of the notification up to which all notifications are deleted |

---

## Response

### Success Response

**Status:** `200 OK`

```json
4
```

The response is a number representing the count of deleted notifications.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `500 Internal Server Error` | Unexpected server failure |
