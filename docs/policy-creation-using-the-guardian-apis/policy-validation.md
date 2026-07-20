# Policy Validation

**`POST /policies/validate`**

Validates the provided policy configuration and returns validation results without saving.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_UPDATE` or `Permissions.POLICIES_POLICY_REVIEW`

---

## Request

### Request Body

```json
{
  "name": "iREC Policy",
  "version": "1.0.0",
  "config": {}
}
```

The request body is the full policy configuration object to validate.

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "results": {
    "isValid": true,
    "errors": []
  },
  "policy": {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "iREC Policy",
    "version": "1.0.0"
  }
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
