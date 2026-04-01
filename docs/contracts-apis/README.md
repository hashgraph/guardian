# Contracts APIs

Base URL: `/api/v1/contracts`
Authentication: All endpoints require Bearer JWT.

Guardian supports two types of smart contracts deployed on Hedera:
- **RETIRE** contracts — manage the retirement (burning) of carbon credit tokens
- **WIPE** contracts — manage token wipe operations with role-based authorization

---

## GET /contracts

Returns a paginated list of all contracts accessible to the authenticated user.

**Authentication:** Required — `CONTRACTS_CONTRACT_READ`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Zero-based page number (default: 0) |
| pageSize | number | No | Items per page (default: 20) |
| type | string | No | Filter by contract type: `RETIRE` or `WIPE` |

### Response 200 OK

Array of contract objects. Total count in `X-Total-Count` header.

| Field | Type | Description |
|---|---|---|
| id | string | Contract database ID |
| contractId | string | Hedera contract ID (e.g., `0.0.1234567`) |
| description | string | Contract description |
| type | string | `RETIRE` or `WIPE` |
| owner | string | DID of the Standard Registry that deployed the contract |
| status | string | Contract status |
| wipeContractIds | string[] | (RETIRE only) Associated wipe contract IDs |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 500 | Internal server error |

### Example

**Request:**
```http
GET /api/v1/contracts?type=RETIRE&pageIndex=0&pageSize=10
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```
X-Total-Count: 2
```
```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "contractId": "0.0.6371646",
    "description": "iREC Retire Contract",
    "type": "RETIRE",
    "owner": "did:hedera:testnet:zHcDLGFN...",
    "status": "ACTIVE"
  }
]
```

---

## POST /contracts

Creates and deploys a new smart contract on Hedera. Only Standard Registry users can create contracts.

**Authentication:** Required — `CONTRACTS_CONTRACT_CREATE`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| description | string | Yes | Human-readable contract description |
| type | string | Yes | Contract type: `RETIRE` or `WIPE` |

### Response 201 Created

Returns the created contract object including the Hedera contract ID.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 403 | Not a Standard Registry |
| 500 | Internal server error |

### Example

**Request:**
```http
POST /api/v1/contracts
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "description": "Carbon Credit Retire Contract",
  "type": "RETIRE"
}
```

---

## POST /contracts/import

Imports an existing Hedera smart contract by its contract ID.

**Authentication:** Required — `CONTRACTS_CONTRACT_CREATE`

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| contractId | string | Yes | Hedera contract ID to import (e.g., `0.0.6371646`) |
| description | string | No | Description to attach to this contract |

### Response 201 Created

Returns the imported contract object.

---

## GET /contracts/:contractId/permissions

Returns the permission roles for a specific contract.

**Authentication:** Required — `CONTRACTS_CONTRACT_READ`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| contractId | string | Yes | Contract database ID |

### Response 200 OK

Returns the caller's permission level for the contract.

---

## DELETE /contracts/:contractId

Removes a contract from Guardian (does not destroy the Hedera contract).

**Authentication:** Required — `CONTRACTS_CONTRACT_DELETE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| contractId | string | Yes | Contract database ID |

### Response 200 OK

Returns `true` on success.

---

## WIPE Contract Operations

### GET /contracts/wipe/requests

Returns a paginated list of pending wipe requests.

**Authentication:** Required — `CONTRACTS_WIPE_REQUEST_READ`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| contractId | string | No | Filter by contract ID |
| pageIndex | number | No | Page number |
| pageSize | number | No | Page size |

---

### POST /contracts/wipe/:contractId/requests/enable

Enables wipe request submission for a contract.

**Authentication:** Required — `CONTRACTS_WIPE_ADMIN_UPDATE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| contractId | string | Yes | Hedera contract ID |

---

### POST /contracts/wipe/:contractId/requests/disable

Disables wipe request submission.

**Authentication:** Required — `CONTRACTS_WIPE_ADMIN_UPDATE`

---

### POST /contracts/wipe/requests/:requestId/approve

Approves a pending wipe request.

**Authentication:** Required — `CONTRACTS_WIPE_REQUEST_UPDATE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| requestId | string | Yes | Wipe request identifier |

---

### DELETE /contracts/wipe/requests/:requestId/reject

Rejects and removes a pending wipe request.

**Authentication:** Required — `CONTRACTS_WIPE_REQUEST_UPDATE`

---

### DELETE /contracts/wipe/:contractId/requests

Clears all pending wipe requests for a contract.

**Authentication:** Required — `CONTRACTS_WIPE_ADMIN_UPDATE`

---

### POST /contracts/wipe/:contractId/admin/:hederaId

Grants admin role to a Hedera account on the wipe contract.

**Authentication:** Required — `CONTRACTS_WIPE_ADMIN_UPDATE`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| contractId | string | Yes | Hedera contract ID |
| hederaId | string | Yes | Hedera account ID to grant admin (e.g., `0.0.1234567`) |

---

### DELETE /contracts/wipe/:contractId/admin/:hederaId

Revokes admin role from a Hedera account.

**Authentication:** Required — `CONTRACTS_WIPE_ADMIN_UPDATE`

---

### POST /contracts/wipe/:contractId/manager/:hederaId

Grants manager role to a Hedera account.

---

### DELETE /contracts/wipe/:contractId/manager/:hederaId

Revokes manager role from a Hedera account.

---

### POST /contracts/wipe/:contractId/wiper/:hederaId

Grants wiper role to a Hedera account (can execute wipe operations).

---

### POST /contracts/wipe/:contractId/wiper/:hederaId/:tokenId

Grants wiper role for a specific token only.

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| contractId | string | Yes | Hedera contract ID |
| hederaId | string | Yes | Hedera account ID |
| tokenId | string | Yes | Hedera token ID to restrict wipe access to |

---

## RETIRE Contract Operations

### GET /contracts/retire/pools

Returns a paginated list of retire pools.

**Authentication:** Required — `CONTRACTS_RETIRE_REQUEST_READ`

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| contractId | string | No | Filter by contract ID |
| pageIndex | number | No | Page number |
| pageSize | number | No | Page size |

### Response 200 OK

Array of retire pool objects.

| Field | Type | Description |
|---|---|---|
| id | string | Pool ID |
| contractId | string | Parent contract ID |
| tokens | array | Token configurations in the pool |
| tokens[].token | string | Hedera token ID |
| tokens[].count | number | Token amount in the pool |
| tokens[].serials | number[] | (NFT) Serial numbers |
| enabled | boolean | Whether the pool accepts new retire requests |

---

### POST /contracts/retire/:contractId/pools/sync

Synchronizes retire pool data from the Hedera contract.

**Authentication:** Required — `CONTRACTS_RETIRE_POOL_UPDATE`

---

### GET /contracts/retire/requests

Returns a paginated list of retire requests.

**Authentication:** Required — `CONTRACTS_RETIRE_REQUEST_READ`

---

### Example: Full Retire Workflow

```http
# 1. Get available retire pools
GET /api/v1/contracts/retire/pools
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...

# Response shows pool with token 0.0.1234567 available

# 2. Submit retire request (via policy block, not direct API)
# The retirementDocumentBlock in the policy handles submission

# 3. Monitor request status
GET /api/v1/contracts/retire/requests?contractId=0.0.6371646
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```
