# Creation of a New Schema Rule

**`POST /api/v1/schema-rules`**

Creates a new schema rule.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_RULE_CREATE`

---

## Request

### Request Body

```json
{
  "name": "MRV Data Quality Rules",
  "description": "Validation rules for MRV schema fields",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "policyTopicId": "0.0.4532001",
  "policyInstanceTopicId": "0.0.4532002",
  "config": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable name for the rule |
| `description` | string | No | Optional description of the rule |
| `uuid` | string | No | Rule UUID; auto-generated if omitted |
| `policyId` | string | No | ID of the policy this rule is scoped to |
| `policyTopicId` | string | No | Hedera topic ID of the associated policy |
| `policyInstanceTopicId` | string | No | Hedera topic ID of the policy instance |
| `status` | string | No | Initial status; defaults to `DRAFT` |
| `config` | object | No | Rule configuration (conditions, constraints) |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "uuid": "3b4e1c2d-5f6a-7890-abcd-ef1234567890",
  "name": "MRV Data Quality Rules",
  "description": "Validation rules for MRV schema fields",
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
| `400 Bad Request` | Malformed request body |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid configuration — body is empty or malformed |
| `500 Internal Server Error` | Unexpected server failure |
