# Returns Package Version

**`GET /settings/about`**

Returns the current Guardian package version.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SETTINGS_SETTINGS_READ`

---

## Request

No request body or parameters required.

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "version": "3.0.0"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
