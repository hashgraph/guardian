# Returns Sentinel API Key

**`GET /map/sh`**

Returns the Sentinel API key from Guardian service environment settings.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

No request parameters.

---

## Response

### Success Response

**Status:** `200 OK`

Returns the Sentinel API key as a string.

```json
"46e0a5e4-6a27-46a6-adcc-a4608a4513e4"
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `500 Internal Server Error` | Unexpected server failure |
