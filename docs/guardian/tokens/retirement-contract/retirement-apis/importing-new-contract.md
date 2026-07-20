# Importing a New Contract

**`POST /api/v1/contracts/import`**

Imports an existing smart contract by its Hedera contract ID. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_CONTRACT_CREATE`

---

## Request

### Request Body

```json
{
  "contractId": "0.0.4532001",
  "description": "Imported retire contract"
}
```

| Field         | Type   | Required | Description                                            |
|---------------|--------|----------|--------------------------------------------------------|
| `contractId`  | string | Yes      | The Hedera identifier of the contract to import        |
| `description` | string | No       | Human-readable description of the imported contract    |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "contractId": "0.0.4532001",
  "description": "Imported retire contract",
  "type": "RETIRE",
  "owner": "example_user"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
