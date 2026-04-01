# Notifications APIs

Base URL: `/api/v1/notifications`
Authentication: All endpoints require a valid Bearer JWT token.

---

## GET /notifications

Returns paginated notifications for the authenticated user.

**Authentication:** Required (Bearer JWT)

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Zero-based page number (default: 0) |
| pageSize | number | No | Items per page (default: 20) |

### Response 200 OK

Array of notification objects. Total count returned in `X-Total-Count` response header.

| Field | Type | Description |
|---|---|---|
| id | string (UUID) | Unique notification identifier |
| type | string | Notification type (e.g., `info`, `warn`, `error`, `task`) |
| action | string | Action that triggered the notification (e.g., `POLICY_PUBLISHED`) |
| message | string | Human-readable notification message |
| userId | string | ID of the user this notification belongs to |
| read | boolean | Whether the notification has been read |
| result | object \| null | Optional structured result data |
| createDate | string (ISO 8601) | Timestamp when the notification was created |

### Response Headers

| Header | Description |
|---|---|
| X-Total-Count | Total number of notifications for the user |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized — missing or invalid JWT |
| 500 | Internal server error |

### Example

**Request:**
```http
GET /api/v1/notifications?pageIndex=0&pageSize=10
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```
X-Total-Count: 42
```
```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "type": "info",
    "action": "POLICY_PUBLISHED",
    "message": "Policy 'iREC 3' has been published successfully.",
    "userId": "did:hedera:testnet:zHcDLGFN...",
    "read": false,
    "result": { "policyId": "63e3e5e8a01b3c001234abcd" },
    "createDate": "2026-03-30T08:00:00.000Z"
  }
]
```

---

## GET /notifications/new

Returns all unread notifications for the authenticated user.

**Authentication:** Required (Bearer JWT)

### Response 200 OK

Returns a notification summary object containing new notifications.

| Field | Type | Description |
|---|---|---|
| items | array | Array of unread notification objects (same shape as above) |
| count | number | Count of unread notifications |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 500 | Internal server error |

### Example

**Request:**
```http
GET /api/v1/notifications/new
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
{
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "type": "info",
      "action": "DOCUMENT_APPROVED",
      "message": "Your MRV document has been approved.",
      "read": false,
      "createDate": "2026-03-30T09:15:00.000Z"
    }
  ],
  "count": 1
}
```

---

## GET /notifications/progresses

Returns active long-running operation progress notifications for the authenticated user (e.g., policy publishing, importing).

**Authentication:** Required (Bearer JWT)

### Response 200 OK

Array of progress objects for in-flight operations.

| Field | Type | Description |
|---|---|---|
| id | string | Progress operation identifier |
| action | string | Operation being tracked (e.g., `PUBLISH_POLICY`) |
| message | string | Current progress message |
| progress | number | Completion percentage (0–100) |
| userId | string | Owner user ID |
| createDate | string (ISO 8601) | When the operation started |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 500 | Internal server error |

### Example

**Request:**
```http
GET /api/v1/notifications/progresses
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
[
  {
    "id": "task-uuid-1234",
    "action": "PUBLISH_POLICY",
    "message": "Publishing policy to Hedera...",
    "progress": 65,
    "userId": "did:hedera:testnet:zHcDLGFN...",
    "createDate": "2026-03-30T10:00:00.000Z"
  }
]
```

---

## POST /notifications/read/all

Marks all notifications as read for the authenticated user.

**Authentication:** Required (Bearer JWT)

### Request Body

None.

### Response 200 OK

Returns the updated notification collection.

| Field | Type | Description |
|---|---|---|
| items | array | All notifications (now marked as read) |
| count | number | Total count |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 500 | Internal server error |

### Example

**Request:**
```http
POST /api/v1/notifications/read/all
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
{
  "items": [],
  "count": 0
}
```

---

## DELETE /notifications/delete/:notificationId

Deletes all notifications up to and including the specified notification ID.

**Authentication:** Required (Bearer JWT)

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| notificationId | string (UUID) | Yes | ID of the notification up to which all older notifications will be deleted |

### Response 200 OK

Returns the count of deleted notifications.

```json
5
```

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 404 | Notification not found |
| 500 | Internal server error |

### Example

**Request:**
```http
DELETE /api/v1/notifications/delete/3fa85f64-5717-4562-b3fc-2c963f66afa6
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
5
```
