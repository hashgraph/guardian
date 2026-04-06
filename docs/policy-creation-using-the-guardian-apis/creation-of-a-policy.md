# Creation of a Policy

**`POST /api/v1/policies`**

Creates a new policy. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_CREATE`

---

## Request

### Request Body

```json
{
  "name": "iREC Policy",
  "version": "1.0.0",
  "description": "iREC renewable energy certificate policy",
  "topicDescription": "iREC policy topic",
  "config": {},
  "policyRoles": ["INSTALLER"],
  "policyTopics": [],
  "policyTokens": [],
  "policyGroups": []
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable policy name |
| `version` | string | No | Semantic version string (e.g. `1.0.0`) |
| `description` | string | No | Short description of the policy |
| `topicDescription` | string | No | Description for the Hedera topic |
| `config` | object | No | Policy block configuration tree |
| `policyRoles` | array | No | List of role names defined by this policy |
| `policyTopics` | array | No | Topic configuration |
| `policyTokens` | array | No | Token configuration |
| `policyGroups` | array | No | Group configuration |

---

## Response

### Success Response

**Status:** `201 Created`

Returns the updated list of all policies for the authenticated user.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "iREC Policy",
    "version": "1.0.0",
    "status": "DRAFT",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
