# Creating a New Contract

**`POST /api/v1/contracts`**

Creates a new smart contract. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_CONTRACT_CREATE`

---

## Request

### Request Body

```json
{
  "description": "Example retire contract",
  "type": "RETIRE"
}
```

| Field         | Type   | Required | Description                                       |
|---------------|--------|----------|---------------------------------------------------|
| `description` | string | No       | Human-readable description of the contract        |
| `type`        | string | Yes      | Contract type: `RETIRE` or `WIPE`                 |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "contractId": "0.0.4532001",
  "description": "Example retire contract",
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
