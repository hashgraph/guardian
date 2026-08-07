# Update the Configuration of the Rule with the Corresponding ID

**`PUT /api/v1/schema-rules/{ruleId}`**

Updates the schema rule configuration for the specified rule ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_RULE_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ruleId` | string | Yes | Schema rule identifier (MongoDB ObjectId) |

### Request Body

```json
{
  "name": "MRV Data Quality Rules v2",
  "description": "Updated validation rules for MRV schema fields",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "policyTopicId": "0.0.4532001",
  "policyInstanceTopicId": "0.0.4532002",
  "status": "DRAFT",
  "config": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable name for the rule |
| `description` | string | No | Optional description of the rule |
| `uuid` | string | No | Rule UUID |
| `policyId` | string | No | ID of the policy this rule is scoped to |
| `policyTopicId` | string | No | Hedera topic ID of the associated policy |
| `policyInstanceTopicId` | string | No | Hedera topic ID of the policy instance |
| `status` | string | No | Rule status (`DRAFT`, `ACTIVE`, `INACTIVE`) |
| `config` | object | No | Rule configuration (conditions, constraints) |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "uuid": "3b4e1c2d-5f6a-7890-abcd-ef1234567890",
  "name": "MRV Data Quality Rules v2",
  "description": "Updated validation rules for MRV schema fields",
  "creator": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "policyTopicId": "0.0.4532001",
  "policyInstanceTopicId": "0.0.4532002",
  "status": "DRAFT",
  "config": {}
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | No rule exists with the given `ruleId` |
| `422 Unprocessable Entity` | `ruleId` parameter is missing or empty |
| `500 Internal Server Error` | Unexpected server failure |
