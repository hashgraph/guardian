# User Account Balance

**`GET /api/v1/profiles/{username}/balance`**

Returns the Hedera account balance for the specified user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PROFILES_BALANCE_READ`

---

## Request

### Path Parameters

| Parameter  | Type   | Required | Description                                    |
|------------|--------|----------|------------------------------------------------|
| `username` | string | Yes      | The name of the user for whom to fetch the balance |

---

## Response

### Success Response

**Status:** `200 OK`

```json
"1000.5"
```

The balance is returned as a JSON string representing the account balance in HBAR.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
