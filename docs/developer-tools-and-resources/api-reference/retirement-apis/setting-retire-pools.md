# Setting Retire Pools

**`POST /api/v1/contracts/retire/{contractId}/pools`**

Sets a retire pool for the specified contract. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_POOL_UPDATE`

---

## Request

### Path Parameters

| Parameter    | Type   | Required | Description         |
|--------------|--------|----------|---------------------|
| `contractId` | string | Yes      | Contract identifier |

### Request Body

```json
{
  "tokens": [
    {
      "token": "0.0.5000001",
      "count": 100,
      "serials": []
    }
  ],
  "immediately": false
}
```

| Field          | Type    | Required | Description                                           |
|----------------|---------|----------|-------------------------------------------------------|
| `tokens`       | array   | Yes      | List of token configurations for the pool             |
| `tokens[].token` | string | Yes     | Hedera token identifier                               |
| `tokens[].count` | number | Yes     | Number of tokens required for retirement              |
| `tokens[].serials` | array | No     | Specific serial numbers (for non-fungible tokens)     |
| `immediately`  | boolean | No      | Whether to immediately enable the pool                |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "contractId": "0.0.4532001",
  "tokens": [
    {
      "token": "0.0.5000001",
      "count": 100
    }
  ],
  "enabled": true
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
