# Returns a List of All Wipe Requests

**`GET /api/v1/contracts/wipe/requests`**

Returns a paginated list of all wipe requests. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_WIPE_REQUEST_READ`

---

## Request

### Query Parameters

| Parameter    | Type   | Required | Default | Description                                                       |
|--------------|--------|----------|---------|-------------------------------------------------------------------|
| `contractId` | string | No       | —       | Filter requests by contract identifier                            |
| `pageIndex`  | number | No       | 0       | The number of pages to skip before starting to collect the result |
| `pageSize`   | number | No       | 20      | The number of items to return                                     |

---

## Response

### Success Response

**Status:** `200 OK`

Headers:

| Header          | Description                            |
|-----------------|----------------------------------------|
| `X-Total-Count` | Total number of wipe requests available |

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "contractId": "0.0.4532001",
    "user": "0.0.4532001",
    "tokens": [
      {
        "token": "0.0.5000001",
        "count": 50
      }
    ]
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
