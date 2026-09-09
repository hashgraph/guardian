# User Account Information

**`GET /api/v1/profiles/{username}/`**

Returns account information for the specified user, including DID, Hedera account details, and VC documents. For users with the Standard Registry role it also returns address book and VC document information.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PROFILES_USER_READ`

---

## Request

### Path Parameters

| Parameter  | Type   | Required | Description                                      |
|------------|--------|----------|--------------------------------------------------|
| `username` | string | Yes      | The name of the user for whom to fetch the information |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "username": "example_user",
  "role": "STANDARD_REGISTRY",
  "did": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "hederaAccountId": "0.0.4532001",
  "confirmed": true,
  "failed": false,
  "topic": "0.0.1234567",
  "didDocument": {},
  "vcDocument": {}
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
