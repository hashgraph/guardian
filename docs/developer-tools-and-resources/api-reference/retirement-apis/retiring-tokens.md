# Retiring Tokens

**`POST /api/v1/contracts/retire/pools/{poolId}/retire`**

Submits a token retirement request against the specified pool. Accessible by Standard Registry and User roles.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_RETIRE_REQUEST_CREATE`

---

## Request

### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| `poolId`  | string | Yes      | Pool identifier |

### Request Body

```json
[
  {
    "token": "0.0.5000001",
    "count": 100,
    "serials": []
  }
]
```

The request body is an array of token retirement entries.

| Field     | Type   | Required | Description                                         |
|-----------|--------|----------|-----------------------------------------------------|
| `token`   | string | Yes      | Hedera token identifier to retire                   |
| `count`   | number | Yes      | Number of tokens to retire                          |
| `serials` | array  | No       | Specific serial numbers (for non-fungible tokens)   |

---

## Response

### Success Response

**Status:** `200 OK`

```json
true
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Request body must be an array |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
