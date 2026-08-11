# Policy Repository APIs

Base URL: `/api/v1/policy-labels`

These endpoints provide read access to user lists, schema lists, and document lists within a specific policy instance. Primarily used by administrators and external tools inspecting policy state.

---

## GET /policy-labels/:policyId/users

Returns the list of usernames that have participated in (or registered with) the specified policy.

**Authentication:** Required (Bearer JWT)  
**Permission:** `POLICIES_POLICY_READ`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy MongoDB ObjectId (24 hex chars) |

### Responses

| Code | Description |
|---|---|
| 200 | Array of usernames |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Policy not found |
| 500 | Internal server error |

### Example

**Request:**
```http
GET /api/v1/policy-labels/63e3e5e8a01b3c001234abcd/users
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
["alice", "bob", "installer_1", "installer_2"]
```

---

## GET /policy-labels/:policyId/schemas

Returns the list of schemas used within the specified policy.

**Authentication:** Required (Bearer JWT)  
**Permission:** `POLICIES_POLICY_READ`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy MongoDB ObjectId |

### Responses

| Code | Description |
|---|---|
| 200 | Array of schema summary objects |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Policy not found |
| 500 | Internal server error |

### Example

**Request:**
```http
GET /api/v1/policy-labels/63e3e5e8a01b3c001234abcd/schemas
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```json
[
  {
    "id": "63f1a2b3c4d5e6f789012345",
    "name": "MRV Schema",
    "entity": "MRV",
    "version": "1.0.0",
    "iri": "did:hedera:testnet:zSchemaIRI...",
    "topicId": "0.0.4532002"
  }
]
```

---

## GET /policy-labels/:policyId/documents

Returns the list of VC documents submitted within the specified policy.

**Authentication:** Required (Bearer JWT)  
**Permission:** `POLICIES_POLICY_READ`

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | Policy MongoDB ObjectId |

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| pageIndex | number | No | Zero-based page number |
| pageSize | number | No | Items per page |
| type | string | No | Filter by document type (e.g. `VC`, `VP`) |
| owner | string | No | Filter by owner DID |

### Responses

| Code | Description |
|---|---|
| 200 | Array of document summaries. Total count in `X-Total-Count` header |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Policy not found |
| 500 | Internal server error |

### Example

**Request:**
```http
GET /api/v1/policy-labels/63e3e5e8a01b3c001234abcd/documents?pageIndex=0&pageSize=20&type=VC
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Response 200:**
```
X-Total-Count: 87
```
```json
[
  {
    "id": "63e3e5e8a01b3c00aabbccdd",
    "type": "VC",
    "schema": "MRVDocument",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "status": "APPROVED",
    "createDate": "2026-03-30T08:00:00.000Z"
  }
]
```
