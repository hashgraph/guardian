# Publishes the Schema (Make Active)

**`PUT /schemas/system/{schemaId}/active`**

Makes the selected system schema active. Other schemas of the same entity type become inactive. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SYSTEM_SCHEMA_REVIEW`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | string | Yes | The schema ID (MongoDB ObjectId, e.g. `63e3e5e8a01b3c001234abcd`) |

---

## Response

### Success Response

**Status:** `200 OK`

No response body.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Schema is not a system schema |
| `404 Not Found` | Schema not found |
| `422 Unprocessable Entity` | Schema is already active |
| `500 Internal Server Error` | Unexpected server failure |
