# Get All Notifications

**`GET /api/v1/notifications`**

Returns a paginated list of all notifications for the authenticated user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index; the number of pages to skip before starting to collect the result set |
| `pageSize` | number | No | 20 | The number of items to return per page |

---

## Response

### Success Response

**Status:** `200 OK`

The response includes an `X-Total-Count` header with the total number of notifications, and a JSON array of notification objects in the body.

**Response Header:**

| Header | Description |
|--------|-------------|
| `X-Total-Count` | Total count of notifications for the user |

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "title": "Policy published",
    "message": "Policy 'GHG Policy v1.0' has been published successfully.",
    "read": false,
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
