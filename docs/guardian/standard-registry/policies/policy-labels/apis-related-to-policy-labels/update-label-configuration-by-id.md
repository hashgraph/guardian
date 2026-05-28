# Update Label Configuration by ID

**`PUT /api/v1/policy-labels/{definitionId}`**

Updates the policy label definition configuration for the specified label ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Policy label definition identifier |

### Request Body

```json
{
  "name": "Updated Carbon Credit Label",
  "description": "Updated certification label for verified carbon credits",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "config": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable name for the label definition |
| `description` | string | No | Description of what this label certifies |
| `policyId` | string | Yes | ID of the policy this label applies to |
| `config` | object | Yes | Updated label configuration object |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Updated Carbon Credit Label",
  "description": "Updated certification label for verified carbon credits",
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
| `404 Not Found` | Label definition with the specified ID does not exist |
| `422 Unprocessable Entity` | `definitionId` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
