# Returns All Contracts

**`GET /api/v1/contracts`**

Returns a paginated list of all smart contracts. Accessible by Standard Registry and User roles.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_CONTRACT_READ`

---

## Request

### Query Parameters

| Parameter   | Type    | Required | Default | Description                                                       |
|-------------|---------|----------|---------|-------------------------------------------------------------------|
| `pageIndex` | number  | No       | 0       | The number of pages to skip before starting to collect the result |
| `pageSize`  | number  | No       | 20      | The number of items to return                                     |
| `type`      | string  | No       | —       | Filter by contract type (`RETIRE` or `WIPE`)                      |

---

## Response

### Success Response

**Status:** `200 OK`

Headers:

| Header          | Description                        |
|-----------------|------------------------------------|
| `X-Total-Count` | Total number of contracts available |

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "contractId": "0.0.4532001",
    "description": "Example retire contract",
    "type": "RETIRE",
    "owner": "example_user"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
