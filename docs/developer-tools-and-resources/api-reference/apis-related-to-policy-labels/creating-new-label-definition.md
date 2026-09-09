# Creating New Label Definition

**`POST /api/v1/policy-labels`**

Creates a new policy label definition.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_CREATE`

---

## Request

### Request Body

```json
{
  "name": "Carbon Credit Label",
  "description": "Certification label for verified carbon credits",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "config": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable name for the label definition |
| `description` | string | No | Description of what this label certifies |
| `policyId` | string | Yes | ID of the policy this label applies to |
| `config` | object | Yes | Label configuration object |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Carbon Credit Label",
  "description": "Certification label for verified carbon credits",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "status": "DRAFT",
  "config": {},
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Malformed request body |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid label configuration |
| `500 Internal Server Error` | Unexpected server failure |
