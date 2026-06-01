# Publishes the Schema

**`PUT /schemas/system/{schemaId}/active`**

Makes the selected system schema active. Other schemas of the same type become inactive. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SYSTEM_SCHEMA_REVIEW`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | String | Yes | Schema ID |

---

## Response

### Success Response

**Status:** `200 OK`

Returns `null` on success.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Schema is not a system schema |
| `404 Not Found` | Schema not found |
| `422 Unprocessable Entity` | Schema is already active |
| `500 Internal Server Error` | Unexpected server failure |
