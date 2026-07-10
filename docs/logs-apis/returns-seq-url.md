# Returns Seq URL

**`GET /logs/seq`**

Returns the URL to the Seq log aggregation store, if configured.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.LOG_LOG_READ`

---

## Request

No request body or parameters required.

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "seq_url": "http://localhost:5341"
}
```

Returns `null` for `seq_url` if Seq is not configured.

```json
{
  "seq_url": null
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
