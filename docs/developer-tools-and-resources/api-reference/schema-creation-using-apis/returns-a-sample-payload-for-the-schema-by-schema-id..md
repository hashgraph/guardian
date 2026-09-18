# Returns a sample payload for the schema by schema Id.

**`GET /schema/{schemaId}/sample-payload`**

Returns a sample payload for the schema by schema ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** No specific permission required (authentication only)

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

Returns a sample JSON payload conforming to the schema document definition.

```json
{
  "field1": "example value",
  "field2": 0,
  "field3": true
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
