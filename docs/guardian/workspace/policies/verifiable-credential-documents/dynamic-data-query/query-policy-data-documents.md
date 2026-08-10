# Query Policy Data Documents

**`GET /policy-data/query`**

Returns a paginated list of Verifiable Credential (VC) documents committed by a published policy, filtered by schema name. Supports field-level filtering, sorting, and pagination. This endpoint requires authentication. The policy must be in `PUBLISH` status.

---

## Authentication

This endpoint requires a valid JWT Bearer token. The authenticated user must hold at least one of the following permissions: `POLICIES_POLICY_AUDIT`, `POLICIES_POLICY_MANAGE`. `POLICIES_POLICY_MANAGE` callers are restricted to policies owned by their own Standard Registry tenant (a policy from a different tenant returns `403 Forbidden`); `POLICIES_POLICY_AUDIT` (the Auditor role) is exempt from this restriction, since Auditors are a cross-organization role by design.

---

## Request

### Query Parameters

| Parameter    | Type   | Required | Description |
|--------------|--------|----------|-------------|
| `policyId`   | string | Yes      | MongoDB ObjectId of the published policy |
| `schemaName` | string | Yes      | Human-readable schema name as registered in the policy (e.g. `Installer Activity Report`). If multiple versions of a schema with this name exist under the policy's topic, the latest version is used |
| `filters`    | string | No       | URL-encoded JSON filter map. See [Filters](#filters) below |
| `sort`       | string | No       | Field to sort by. Prefix `-` for descending (e.g. `-createDate`, `owner`). Limited to system fields (same set as the filter whitelist below, minus `option.*`/`document.*`); default is `-createDate` |
| `page`       | number | No       | 1-based page number. Default: `1` |
| `pageSize`   | number | No       | Results per page. Min `1`, max `200`. Default: `20` |

### Filters

The `filters` parameter is a URL-encoded JSON object. Each key is a field name and each value has the shape `{ "op": "<operator>", "value": <any> }`. Multiple filters are combined with AND logic.

**Allowed field prefixes:**

| Prefix | Example | Description |
|--------|---------|-------------|
| System fields | `owner`, `hederaStatus`, `createDate`, `tag` | Fixed set of top-level document fields |
| `option.` | `option.status` | Workflow option fields set by `sendToGuardianBlock` |
| `document.` | `document.credentialSubject[0].field3` | Credential subject fields cached by the policy grid configuration. Bracket `[0]` and dot `.0.` notation both accepted |

**Supported operators:**

| Operator | Description | Value type |
|----------|-------------|------------|
| `eq` | Equals | string, number, boolean, or `null` |
| `ne` | Not equal | string, number, boolean, or `null` |
| `in` | Value in list — exact match | array of string, number, or boolean (no `null`, no nested objects/arrays) |
| `nin` | Value not in list | array of string, number, or boolean (no `null`, no nested objects/arrays) |
| `gt` | Greater than | string, number, or boolean (no `null`) |
| `gte` | Greater than or equal | string, number, or boolean (no `null`) |
| `lt` | Less than | string, number, or boolean (no `null`) |
| `lte` | Less than or equal | string, number, or boolean (no `null`) |
| `contains` | Case-insensitive partial string match | string, max 256 characters |

**Example — single filter (Compliance Score greater than or equal to 80):**

```json
{ "document.credentialSubject[0].field3": { "op": "gte", "value": 80 } }
```

**Example — enum field using `in` (Rating is Pass or Conditional):**

```json
{ "document.credentialSubject[0].field2": { "op": "in", "value": ["Pass", "Conditional"] } }
```

**Example — partial text match using `contains`:**

```json
{ "document.credentialSubject[0].field1": { "op": "contains", "value": "Lanka" } }
```

**Example — option field filter:**

```json
{ "option.status": { "op": "eq", "value": "Submitted" } }
```

**Example — multiple filters combined (AND):**

```json
{
  "document.credentialSubject[0].field2": { "op": "in",  "value": ["Pass", "Conditional"] },
  "document.credentialSubject[0].field3": { "op": "gte", "value": 70 },
  "option.status":                         { "op": "eq",  "value": "Submitted" },
  "createDate":                            { "op": "gte", "value": "2025-01-01T00:00:00Z" }
}
```

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "data": [
    {
      "_id": "69efa3aa5a5a844b0cd2153a",
      "policyId": "6812a1f3e4b0f1a2b3c4d5e6",
      "schema": "#auditor-inspection-report&1.0.0",
      "owner": "did:hedera:testnet:z...",
      "hederaStatus": "NEW",
      "tag": "save_auditor_doc",
      "option": { "status": "Submitted" },
      "document": {
        "credentialSubject": [
          {
            "field0": "SITE-001",
            "field1": "2025-04-15",
            "field2": "Pass",
            "field3": 92,
            "field4": "All compliance criteria met."
          }
        ]
      },
      "createDate": "2025-04-15T10:22:00.000Z",
      "updateDate": "2025-04-15T10:22:01.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  },
  "query": {
    "policyId": "6812a1f3e4b0f1a2b3c4d5e6",
    "schemaName": "Auditor Inspection Report",
    "appliedFilters": {
      "document.credentialSubject[0].field3": { "op": "gte", "value": 80 }
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | Array of VC document objects matching the query |
| `data[].policyId` | string | MongoDB ObjectId of the owning policy |
| `data[].schema` | string | Schema IRI |
| `data[].owner` | string | DID of the document owner |
| `data[].hederaStatus` | string | HCS anchoring status (`NEW`, `ISSUE`, `REVOKE`, `SUSPEND`, `RESUME`, `FAILED`) |
| `data[].tag` | string | Policy block tag that produced the document |
| `data[].option` | object | Workflow option bag (e.g. `{ "status": "Submitted" }`) |
| `data[].document` | object | Cached credential subject fields |
| `data[].createDate` | string | ISO 8601 creation timestamp |
| `data[].updateDate` | string | ISO 8601 last update timestamp |
| `pagination.page` | number | Current page (1-based) |
| `pagination.pageSize` | number | Results per page |
| `pagination.total` | number | Total matching documents |
| `pagination.totalPages` | number | Total number of pages |
| `query` | object | Echo of the resolved query parameters including applied filters |

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Missing required parameter, invalid JSON in `filters`, unknown filter field, unsupported operator, non-primitive filter value, `contains` value over 256 characters, or an unsupported `sort` field |
| `401 Unauthorized` | JWT token is missing or invalid |
| `403 Forbidden` | Insufficient permissions; the policy belongs to a different Standard Registry tenant; or the policy is not in `PUBLISH` status |
| `404 Not Found` | Policy not found, or schema name not found under the policy topic |
| `500 Internal Server Error` | Unexpected server failure |
