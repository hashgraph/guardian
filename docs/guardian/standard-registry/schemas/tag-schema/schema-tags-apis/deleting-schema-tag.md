# Deleting Schema Tag

**`DELETE /tags/schemas/{schemaId}`**

Deletes the tag schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_DELETE`

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

Returns `true` if the schema was successfully deleted.

```json
true
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
