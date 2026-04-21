# Policy Block API Execution Payloads

This guide documents how external systems interact with Guardian policy blocks through the REST API. It is the primary reference for integrators building MRV data pipelines, verification systems, or any application that submits data into a Guardian policy.

## Overview

A Guardian policy is a directed graph of blocks. External systems interact with blocks through three patterns:

| Pattern | Method | URL | When to use |
|---|---|---|---|
| Read block state | GET | `/api/v1/policies/{policyId}/blocks/{blockId}` | Get current form schema, document list, or block UI state |
| Submit data | PUT | `/api/v1/policies/{policyId}/blocks/{blockId}` | Submit a form, trigger a button, select a role |
| Push external data | POST | `/api/v1/external/{policyId}/{blockTag}` | Push MRV/oracle data without a Guardian user session |

## Authentication

All block API calls require a JWT Bearer token from `POST /api/v1/accounts/login`.

```http
Authorization: Bearer <jwt_token>
```

The calling user must have been assigned the appropriate role within the policy.

---

## Standard Block Response Envelope

When calling `GET /policies/{policyId}/blocks/{blockId}`, Guardian returns a block-specific response. All responses share these common fields:

| Field | Type | Description |
|---|---|---|
| id | string | Block UUID |
| blockType | string | Block type identifier from `BlockType` enum |
| policyId | string | Owning policy ID |
| readonly | boolean | Whether the calling user can submit data to this block |
| uiMetaData | object | Block-specific display configuration (title, description, type) |

---

## Block-Specific Payloads

### `requestVcDocumentBlock`

Presents a data entry form based on a schema. The user fills the form and submits a VC document.

**GET response — block state:**

```json
{
  "id": "block-uuid",
  "blockType": "requestVcDocumentBlock",
  "uiMetaData": {
    "type": "page",
    "title": "Installer Registration",
    "description": "Fill in your facility details"
  },
  "schema": {
    "$id": "#installer-schema-uuid",
    "title": "Installer Application",
    "type": "object",
    "properties": {
      "field0": { "title": "Organization Name", "type": "string" },
      "field1": { "title": "Country", "type": "string" },
      "field2": { "title": "Facility Name", "type": "string" },
      "field3": { "title": "Installed Capacity (MW)", "type": "number" }
    },
    "required": ["field0", "field1", "field2"]
  },
  "presetSchema": null,
  "presetFields": []
}
```

**PUT request — submit document:**

```json
{
  "document": {
    "credentialSubject": [
      {
        "type": "#installer-schema-uuid",
        "field0": "Acme Energy Corp",
        "field1": "Kenya",
        "field2": "Nairobi Solar Farm 1",
        "field3": 10.5
      }
    ]
  },
  "ref": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| document | object | Yes | VC document to submit |
| document.credentialSubject | array | Yes | Array with one object containing schema-defined fields |
| ref | string | No | Parent document ID for relationship linking |

---

### `uploadVcDocumentBlock`

Accepts file uploads or pre-built VC documents.

**PUT request:**

```json
{
  "document": {
    "credentialSubject": [
      {
        "type": "#mrv-schema-uuid",
        "field0": 0.0,
        "field1": 1250.5,
        "field2": "MWh",
        "field3": "2025-01-01",
        "field4": "2025-12-31"
      }
    ]
  }
}
```

---

### `interfaceDocumentsSourceBlock`

Displays a list of documents to the user. Read-only; no PUT required.

**GET response:**

```json
{
  "id": "block-uuid",
  "blockType": "interfaceDocumentsSourceBlock",
  "data": [
    {
      "id": "doc-id-123",
      "type": "VC",
      "owner": "did:hedera:testnet:...",
      "document": { ... },
      "option": { "status": "WAITING" },
      "createDate": "2026-03-31T08:00:00.000Z"
    }
  ],
  "fields": [
    { "title": "Status", "name": "option.status", "type": "text" },
    { "title": "Created", "name": "createDate", "type": "date" }
  ],
  "total": 1,
  "page": 0,
  "size": 10
}
```

---

### `buttonBlock`

Displays action buttons that trigger workflow transitions (e.g., Approve/Reject).

**GET response:**

```json
{
  "id": "block-uuid",
  "blockType": "buttonBlock",
  "uiMetaData": {
    "buttons": [
      {
        "tag": "approve_btn",
        "name": "Approve",
        "type": "selector",
        "field": "option.status",
        "value": "APPROVED",
        "uiClass": "btn-approve"
      },
      {
        "tag": "reject_btn",
        "name": "Reject",
        "type": "selector",
        "field": "option.status",
        "value": "REJECTED",
        "uiClass": "btn-reject"
      }
    ]
  }
}
```

**PUT request — trigger a button:**

```json
{
  "document": {
    "id": "doc-id-123",
    "option": { "status": "WAITING" }
  },
  "tag": "approve_btn"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| document | object | Yes | The document to act on (must include `id`) |
| tag | string | Yes | Button tag to trigger — must match one of `uiMetaData.buttons[].tag` |

---

### `policyRolesBlock`

Assigns a role to the current user within the policy.

**GET response:**

```json
{
  "id": "block-uuid",
  "blockType": "policyRolesBlock",
  "uiMetaData": { "title": "Select Your Role" },
  "roles": ["Installer", "Standard Registry", "Auditor"]
}
```

**PUT request — select role:**

```json
{
  "role": "Installer"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| role | string | Yes | Role name — must be one of the values in the GET response `roles` array |

---

### `mintDocumentBlock`

Mints environmental asset tokens after document approval. This is a server-side block (`post: false`, `get: false`) — it is triggered automatically by the policy engine when an upstream block fires a `RunEvent`. There is no direct GET or PUT available from the API.

The block calculates a token amount by evaluating the configured rule expression against the incoming VC documents, creates a mint VC and VP, publishes both to HCS, and calls the Hedera token service to mint the tokens to the target account.

To observe mint outcomes, query the `interfaceDocumentsSourceBlock` that follows the mint block in the policy flow — documents there will carry a `type` of `"MINT"` once minting completes.

---

### `retirementDocumentBlock`

Retires (wipes) tokens from a holder account. This is a server-side block (`post: false`, `get: false`) — it is triggered automatically by the policy engine when an upstream block fires a `RunEvent`. There is no direct GET or PUT available from the API.

The block evaluates the configured rule expression (fungible tokens) or serial number expression (non-fungible tokens) against the incoming VC documents, creates a wipe VC and VP, publishes both to HCS, and calls the Hedera token wipe service.

---

### `createTokenBlock`

Presents a token configuration form that allows a user to define and create a new Hedera token within the policy's token template. The block can also be set to `autorun`, in which case it creates the token automatically without user interaction.

**GET response — token template:**

```json
{
  "id": "block-uuid",
  "blockType": "createTokenBlock",
  "title": "Create Token",
  "description": "Define the token parameters",
  "data": {
    "tokenName": "iREC Token",
    "tokenSymbol": "iREC",
    "tokenType": "fungible",
    "decimals": "2",
    "initialSupply": "0",
    "enableAdmin": true,
    "changeSupply": true,
    "enableFreeze": false,
    "enableKYC": false,
    "enableWipe": true,
    "wipeContractId": null
  }
}
```

Fields already locked by the policy template will be returned in `data` but cannot be overridden in the PUT — submit only the fields the policy leaves editable.

**PUT request — submit token configuration:**

```json
{
  "tokenName": "iREC Token",
  "tokenSymbol": "iREC",
  "tokenType": "fungible",
  "decimals": "2",
  "initialSupply": "0",
  "enableAdmin": true,
  "changeSupply": true,
  "enableFreeze": false,
  "enableKYC": false,
  "enableWipe": true,
  "wipeContractId": null
}
```

| Field | Type | Description |
|---|---|---|
| tokenName | string | Human-readable token name |
| tokenSymbol | string | Short token symbol (e.g. `"iREC"`) |
| tokenType | string | `"fungible"` or `"non-fungible"` |
| decimals | string | Decimal precision for fungible tokens (e.g. `"2"`) |
| initialSupply | string | Initial supply for fungible tokens (e.g. `"0"`) |
| enableAdmin | boolean | Enables admin key on the token |
| changeSupply | boolean | Enables supply key (required for minting) |
| enableFreeze | boolean | Enables freeze key |
| enableKYC | boolean | Enables KYC key |
| enableWipe | boolean | Enables wipe key (required for retirement) |
| wipeContractId | string \| null | Optional Hedera contract ID to use as wipe key |

On success the block publishes the new token to HCS, stores the resulting `tokenId` in the policy document's `tokens` map, and fires a `RunEvent` to the next block.

---

### `tokenConfirmationBlock`

Prompts the current user to associate (or dissociate) their Hedera account with a specific token, or to skip the step. This is required before a user can receive minted tokens.

**GET response:**

```json
{
  "id": "block-uuid",
  "blockType": "tokenConfirmationBlock",
  "action": "associate",
  "accountId": "0.0.1234567",
  "tokenName": "iREC Token",
  "tokenId": "0.0.9876543"
}
```

| Field | Type | Description |
|---|---|---|
| action | string | `"associate"` or `"dissociate"` — the operation the user is being asked to confirm |
| accountId | string | The user's Hedera account ID that will be associated |
| tokenName | string | Display name of the token |
| tokenId | string | Hedera token ID to associate |

**PUT request — confirm association:**

```json
{
  "action": "confirm",
  "hederaAccountKey": "302e020100300506032b657004220420..."
}
```

**PUT request — skip:**

```json
{
  "action": "skip"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| action | string | Yes | `"confirm"` to proceed with the association/dissociation, `"skip"` to bypass |
| hederaAccountKey | string | Only when `action` is `"confirm"` | The user's Hedera ED25519 private key (hex or DER-encoded) used to sign the association transaction |

> **Security note:** `hederaAccountKey` is transmitted over HTTPS and used in-process to sign the Hedera association transaction. It is not stored by Guardian.

---

### `externalDataBlock`

Receives data pushed from external systems. This is the block to target with `POST /external/{policyId}/{blockTag}`.

**GET response:**

```json
{
  "id": "block-uuid",
  "blockType": "externalDataBlock",
  "tag": "mrv_data_ingestion"
}
```

**External push via** `POST /api/v1/external/{policyId}/{blockTag}`:

```json
{
  "owner": "did:hedera:testnet:zHcDLGFNTnbmDMkaGEfb5zToJKj4KdwNPJ5mGFNjrEV",
  "policyTag": "iREC_V3_Installer",
  "document": {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    "type": ["VerifiableCredential"],
    "issuer": "did:hedera:testnet:...",
    "issuanceDate": "2026-03-31T00:00:00.000Z",
    "credentialSubject": [
      {
        "type": "#mrv-schema-uuid",
        "field0": 0.0,
        "field1": 1250.5,
        "field2": "MWh",
        "field3": "2025-01-01",
        "field4": "2025-12-31"
      }
    ]
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| owner | string | Yes | DID of the document submitter |
| policyTag | string | Yes | Policy tag string (from policy configuration) |
| document | object | Yes | Full or partial VC document |
| document.credentialSubject | array | Yes | Array containing one credential subject with schema fields |

---

### `reportBlock`

Generates a trust chain / audit trail view. Read-only.

**GET response:**

```json
{
  "id": "block-uuid",
  "blockType": "reportBlock",
  "uiMetaData": { "title": "Trust Chain Report" },
  "items": [
    {
      "title": "Registration Document",
      "document": { ... },
      "type": "VC",
      "tag": "installer_registration",
      "issuer": "did:hedera:testnet:..."
    },
    {
      "title": "MRV Report",
      "document": { ... },
      "type": "VC",
      "tag": "mrv_submission"
    },
    {
      "title": "Minted Token",
      "tokenId": "0.0.1234567",
      "amount": 1250,
      "type": "TOKEN"
    }
  ]
}
```

---

### `switchBlock`

Routes documents to different workflow paths based on conditions. Evaluated automatically by the policy engine — no external interaction required.

---

### `aggregateDocumentBlock`

Collects multiple documents until a threshold is met, then batches them. Evaluated automatically.

---

### `calculateContainerBlock` / `mathBlock`

Performs arithmetic on document fields. Evaluated automatically.

---

### `sendToGuardianBlock`

Sends a document to the Hedera blockchain (IPFS + HCS). Evaluated automatically after form submission or approval.

---

## External Data Submission API Reference

### POST /api/v1/external/{policyId}/{blockTag}

The primary integration endpoint for external MRV systems, IoT sensors, and oracles.

**Authentication:** Not required for `externalDataBlock` configured as public. JWT required otherwise.

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy MongoDB ID or published policy message ID |
| blockTag | string | Yes | Unique tag of the target `externalDataBlock` |

**Full Request Body Schema:**

```json
{
  "owner": "string — DID of document owner (required)",
  "policyTag": "string — policy tag identifier (required)",
  "document": {
    "@context": ["array of JSON-LD context URLs"],
    "type": ["VerifiableCredential"],
    "issuer": "string — DID of issuer",
    "issuanceDate": "string — ISO 8601 date",
    "credentialSubject": [
      {
        "type": "string — schema type IRI",
        "field0": "value matching schema field type",
        "field1": "...",
        "fieldN": "..."
      }
    ],
    "proof": {
      "type": "string",
      "created": "string",
      "verificationMethod": "string",
      "proofPurpose": "string",
      "jws": "string"
    }
  }
}
```

The `proof` field is optional — Guardian will sign the document if not provided.

**Response 200 OK:**
```json
true
```

**Error Codes:**

| Code | Description |
|---|---|
| 400 | Missing required fields |
| 404 | Policy or block tag not found |
| 422 | Document validation failed against policy schema |
| 500 | Internal server error |

---

## Tag-Based Block Access

Blocks can also be accessed by tag name instead of UUID:

```
GET  /api/v1/policies/{policyId}/tag/{tagName}/blocks
PUT  /api/v1/policies/{policyId}/tag/{tagName}/blocks
```

This is useful when block UUIDs change between policy versions but tags remain stable.

---

## Complete Integration Workflow

### Step 1 — Authenticate

```http
POST /api/v1/accounts/login
Content-Type: application/json

{ "username": "mrv_provider", "password": "securepassword" }
```

```json
{ "accessToken": "eyJhbGciOiJSUzI1NiJ9...", "did": "did:hedera:testnet:..." }
```

### Step 2 — Find Published Policy

```http
GET /api/v1/policies?pageIndex=0&pageSize=10
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

Locate the policy by `name` or `policyTag` in the response. Note its `id`.

### Step 3 — Navigate to Roles Block

```http
GET /api/v1/policies/{policyId}/navigation
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

Find the `policyRolesBlock` in the block tree. Note its `id`.

### Step 4 — Select Role

```http
PUT /api/v1/policies/{policyId}/blocks/{rolesBlockId}
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{ "role": "MRV Submitter" }
```

### Step 5 — Get Submission Form Schema

```http
GET /api/v1/policies/{policyId}/blocks/{formBlockId}
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

Extract the `schema.properties` to determine which fields to populate.

### Step 6 — Submit Document

```http
PUT /api/v1/policies/{policyId}/blocks/{formBlockId}
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "document": {
    "credentialSubject": [
      {
        "type": "#schema-uuid",
        "field0": 0.0,
        "field1": 1250.5,
        "field2": "MWh"
      }
    ]
  }
}
```

### Step 7 — Poll Document Status

```http
GET /api/v1/policies/{policyId}/blocks/{viewerBlockId}
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

Poll until `data[0].option.status` changes to `APPROVED` or `REJECTED`.
