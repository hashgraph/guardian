# Creating Virtual Account (Api-Version: 2)

**`POST /policies/{policyId}/dry-run/user`** — requires `Api-Version: 2` header

Creates a new virtual user for the selected dry-run policy and **returns the created user object**. Only users with the Standard Registry role are allowed to make the request.

Version 2 differs from V1 in that it returns the created virtual user object and optionally accepts `savepointIds` in the request body to scope creation to a specific savepoint context.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_UPDATE`

---

## Request

### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Api-Version` | `2` | Yes | Enables V2 behaviour (returns created user object, supports savepointIds) |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | String | Yes | Policy ID |

### Request Body

Optional. Provide `savepointIds` to scope the virtual user creation to a specific savepoint context.

```json
{
  "savepointIds": [
    "67c85d2fcebecbe1c0231522",
    "67c85d35cebecbe1c0231523"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `savepointIds` | String[] | No | Array of savepoint IDs to scope the creation context |

---

## Response

### Success Response

**Status:** `201 Created`

Returns the created virtual user object.

```json
{
  "username": "Virtual User 3",
  "did": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "hederaAccountId": "0.0.1774730865730",
  "active": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `username` | string | Generated username for the virtual user |
| `did` | string | DID of the virtual user |
| `hederaAccountId` | string | Hedera account ID assigned to the virtual user |
| `active` | boolean | Whether the virtual user is currently active |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
