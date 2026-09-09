# Previews list of schemas duplicates

**`POST /schemas/import/schemas/duplicates`**

Previews list of schema duplicates. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

---

## Request

### Request Body

```json
{
  "schemaNames": ["Schema A", "Schema B"],
  "policyId": "f3b2a9c1e4d5678901234567"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaNames` | String[] | Yes | Array of schema names to check for duplicates |
| `policyId` | String | Yes | Policy ID |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of schema objects that are duplicates.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Schema name",
    "status": "PUBLISHED"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
