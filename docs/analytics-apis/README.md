# Analytics APIs

Base URL: `/api/v1/analytics`
Authentication: All endpoints require Bearer JWT. Standard Registry role required.

The Analytics API provides policy comparison, schema diffing, and cross-policy block search capabilities. Results identify structural differences between policy versions and highlight reusable components.

---

## POST /analytics/search/policies

Searches for policies that match a given policy's structure (used to find similar or related policies).

**Authentication:** Required — Standard Registry

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | ID of the source policy to search similarities for |
| options | object | No | Search options |

### Response 200 OK

Array of matching policy results with similarity scores.

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 422 | Invalid parameters |
| 500 | Internal server error |

### Example

**Request:**
```http
POST /api/v1/analytics/search/policies
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "policyId": "63e3e5e8a01b3c001234abcd"
}
```

**Response 200:**
```json
[
  {
    "id": "63e3e5e8a01b3c001234efgh",
    "name": "iREC 4",
    "similarity": 0.87,
    "version": "2.0.0"
  }
]
```

---

## POST /analytics/compare/policies

Compares two or more policies at the block level and returns a detailed structural diff.

**Authentication:** Required — Standard Registry

### Request Body

You can specify policies to compare using one of three formats:

| Field | Type | Required | Description |
|---|---|---|---|
| policyId1 | string | Yes* | ID of the first policy |
| policyId2 | string | Yes* | ID of the second policy |
| policyIds | string[] | Yes* | Array of policy IDs (alternative to policyId1/2) |
| policies | object[] | Yes* | Array of `{type, value}` objects. `type` is `id`, `file`, or `message`; `value` is the policy reference |
| eventsLvl | number | No | Event comparison depth: `0` = disabled, `1` = enabled (default: `0`) |
| propLvl | number | No | Property comparison depth: `0` = disabled, `1` = enabled (default: `0`) |
| childrenLvl | number | No | Children block comparison depth: `0` = disabled, `1` = shallow, `2` = deep (default: `0`) |
| idLvl | number | No | ID-based matching level (default: `0`) |

*One of the three specification formats is required.

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| left | object | First policy metadata (`id`, `name`, `version`, `description`) |
| right | object | Second policy metadata |
| blocks | object | Block-level diff result tree |
| events | array | Event differences |
| total | number | Total number of blocks analyzed |
| rate | number | Overall similarity rate (0.0–1.0) |

### Error Codes

| Code | Description |
|---|---|
| 401 | Unauthorized |
| 422 | Missing or invalid policy identifiers |
| 500 | Internal server error |

### Example

**Request:**
```http
POST /api/v1/analytics/compare/policies
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "policyId1": "63e3e5e8a01b3c001234abcd",
  "policyId2": "63e3e5e8a01b3c001234efgh",
  "eventsLvl": 1,
  "propLvl": 1,
  "childrenLvl": 2,
  "idLvl": 0
}
```

**Response 200:**
```json
{
  "left": { "id": "63e3e5e8a01b3c001234abcd", "name": "iREC 3", "version": "1.0.0" },
  "right": { "id": "63e3e5e8a01b3c001234efgh", "name": "iREC 4", "version": "2.0.0" },
  "total": 48,
  "rate": 0.91,
  "blocks": { ... },
  "events": []
}
```

---

## POST /analytics/compare/policy/original/:policyId

Compares a policy against its original published state (before any updates).

**Authentication:** Required — Standard Registry

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| policyId | string | Yes | ID of the policy to compare with its original |

### Request Body

Same comparison options as `compare/policies` (`eventsLvl`, `propLvl`, `childrenLvl`, `idLvl`).

### Response 200 OK

Same diff response shape as `compare/policies`.

---

## POST /analytics/compare/modules

Compares two policy modules structurally.

**Authentication:** Required — Standard Registry

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| moduleId1 | string | Yes* | ID of the first module |
| moduleId2 | string | Yes* | ID of the second module |
| moduleIds | string[] | Yes* | Array of module IDs (alternative) |
| eventsLvl | number | No | Event comparison depth |
| propLvl | number | No | Property comparison depth |
| childrenLvl | number | No | Children comparison depth |
| idLvl | number | No | ID matching level |

### Response 200 OK

Module diff result with `left`, `right`, `blocks`, `rate`.

---

## POST /analytics/compare/schemas

Compares two schemas field-by-field.

**Authentication:** Required — Standard Registry

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| schemaId1 | string | Yes* | ID of the first schema |
| schemaId2 | string | Yes* | ID of the second schema |
| schemaIds | string[] | Yes* | Array of schema IDs |
| schemas | object[] | Yes* | `{type, value, policy?}` objects where `type` is `id`, `policy-message`, or `policy-file` |

### Response 200 OK

| Field | Type | Description |
|---|---|---|
| left | object | First schema metadata |
| right | object | Second schema metadata |
| fields | array | Field-level diff |
| rate | number | Similarity rate |

---

## POST /analytics/compare/documents

Compares two VC/VP documents field by field.

**Authentication:** Required — Standard Registry

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| documentId1 | string | Yes* | ID of the first document |
| documentId2 | string | Yes* | ID of the second document |
| documentIds | string[] | Yes* | Array of document IDs |

### Response 200 OK

Document-level diff result.

---

## POST /analytics/compare/tools

Compares two policy tools structurally.

**Authentication:** Required — Standard Registry

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| toolId1 | string | Yes* | ID of the first tool |
| toolId2 | string | Yes* | ID of the second tool |
| toolIds | string[] | Yes* | Array of tool IDs |

### Response 200 OK

Tool diff result with block-level comparison.

---

## POST /analytics/compare/policies/export

Same comparison as `compare/policies` but returns results as a downloadable file (CSV or JSON).

**Authentication:** Required — Standard Registry

### Request Body

Same as `compare/policies` plus:

| Field | Type | Required | Description |
|---|---|---|---|
| type | string | No | Export format: `csv` or `json` (default: `csv`) |

### Response 200 OK

Binary file download.

---

## POST /analytics/search/blocks

Searches for blocks with matching configuration across all policies.

**Authentication:** Required — Standard Registry

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| blockType | string | Yes | Block type to search for |
| config | object | No | Block configuration to match against |

### Response 200 OK

Array of matching block locations with policy context.

| Field | Type | Description |
|---|---|---|
| policyId | string | Policy containing the matching block |
| policyName | string | Policy name |
| blockId | string | Block identifier |
| blockType | string | Block type |
| tag | string | Block tag |
| config | object | Block configuration |

---

## GET /analytics/checkIndexer

Checks whether the Guardian Indexer service is available and reachable.

**Authentication:** Required — Standard Registry

### Response 200 OK

```json
{ "available": true }
```
