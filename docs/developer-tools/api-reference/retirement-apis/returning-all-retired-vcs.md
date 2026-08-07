# Returning All Retired VCs

**`GET /api/v1/contracts/retire`**

Returns a paginated list of all retire VC documents. Accessible by Standard Registry and User roles.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_DOCUMENT_READ`

---

## Request

### Query Parameters

| Parameter   | Type   | Required | Default | Description                                                       |
|-------------|--------|----------|---------|-------------------------------------------------------------------|
| `pageIndex` | number | No       | 0       | The number of pages to skip before starting to collect the result |
| `pageSize`  | number | No       | 20      | The number of items to return                                     |

---

## Response

### Success Response

**Status:** `200 OK`

Headers:

| Header          | Description                          |
|-----------------|--------------------------------------|
| `X-Total-Count` | Total number of retire VCs available |

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "hash": "abc123",
    "document": {}
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
