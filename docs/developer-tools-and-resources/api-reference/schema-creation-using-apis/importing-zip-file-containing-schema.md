# Importing Zip file containing Schema

**`POST /schemas/{topicId}/import/file`**

Imports new schema from a zip file into the local DB. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | String | Yes | Topic ID |

### Request Body

**Content-Type:** `application/zip`

A zip file containing the schema to be imported.

---

## Response

### Success Response

**Status:** `201 Created`

Returns an array of the imported schema objects.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Schema name",
    "status": "PUBLISHED",
    "topicId": "f3b2a9c1e4d5678901234567"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Validation error |
| `500 Internal Server Error` | Unexpected server failure |
