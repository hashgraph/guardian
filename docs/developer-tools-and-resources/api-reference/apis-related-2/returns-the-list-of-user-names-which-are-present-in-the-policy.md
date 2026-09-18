# Returns the List of User Names Present in the Policy

**`GET /api/v1/policy-repository/{policyId}/users`**

Returns the list of user names which are present in the target policy.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_AUDIT`

---

## Request

### Path Parameters

| Parameter  | Type   | Required | Description       |
|------------|--------|----------|-------------------|
| `policyId` | string | Yes      | Policy identifier |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "username": "example_user",
    "did": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "role": "OWNER"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid `policyId` value |
| `500 Internal Server Error` | Unexpected server failure |
