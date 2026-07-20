# Deletes all schemas by topic id. Only users with the Standard Registry are allowed.

**`DELETE /schemas/topic/{topicId}`**

Deletes all schemas by topic ID. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_DELETE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | String | Yes | Topic ID |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of the remaining schema objects.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Schema name",
    "status": "DRAFT",
    "topicId": "f3b2a9c1e4d5678901234567"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
