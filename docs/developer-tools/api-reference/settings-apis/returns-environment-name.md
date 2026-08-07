# Returns Environment Name

**`GET /settings/environment`**

Returns the name of the current Hedera network environment.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

No request body or parameters required.

---

## Response

### Success Response

**Status:** `200 OK`

```json
"testnet"
```

Possible values: `mainnet`, `testnet`, `previewnet`.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `500 Internal Server Error` | Unexpected server failure |
