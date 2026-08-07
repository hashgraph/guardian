# Creating a New Contract (Api-Version: 2)

**`POST /contracts`** — requires `Api-Version: 2` header

Creates a new smart contract. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_CONTRACT_CREATE`

---

## Request

### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Api-Version` | `2` | Yes | Enables V2 behaviour |

### Request Body

```json
{
  "description": "Example retire contract",
  "type": "RETIRE"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | Yes | Human-readable description of the contract |
| `type` | string | Yes | Contract type: `RETIRE` or `WIPE` |

---

## Response

### Success Response

**Status:** `201 Created`

Returns the created `ContractDTO` object.

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "contractId": "0.0.4532001",
  "description": "Example retire contract",
  "type": "RETIRE",
  "owner": "did:hedera:testnet:...",
  "permissions": 3,
  "topicId": "0.0.4532000",
  "createDate": "2024-01-01T00:00:00.000Z",
  "updateDate": "2024-01-01T00:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Database record ID |
| `contractId` | string | Hedera contract account ID |
| `description` | string | Contract description |
| `type` | string | `RETIRE` or `WIPE` |
| `owner` | string | DID of the contract owner |
| `permissions` | number | Bitmask of caller roles: 1=Owner, 2=Admin, 4=Manager (WIPE only), 8=Wiper (WIPE v1 only) |
| `topicId` | string | Hedera topic ID associated with the contract |
| `createDate` | string | ISO 8601 creation timestamp |
| `updateDate` | string | ISO 8601 last-update timestamp |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
