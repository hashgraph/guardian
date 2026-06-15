# Update the Formula by Its ID

**`PUT /api/v1/formulas/{formulaId}`**

Updates the configuration of an existing formula for the specified formula ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.FORMULAS_FORMULA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `formulaId` | string | Yes | Database ID of the formula to update |

### Request Body

```json
{
  "name": "Updated Carbon Credit Calculator",
  "description": "Updated description",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "config": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Human-readable formula name |
| `description` | string | No | Description of the formula's purpose |
| `policyId` | string | No | ID of the policy this formula is linked to |
| `config` | object | No | Updated formula expression configuration |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "uuid": "c4a3b2d1-e5f6-7890-abcd-ef1234567890",
  "name": "Updated Carbon Credit Calculator",
  "description": "Updated description",
  "status": "DRAFT",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "config": {}
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Formula with the given ID does not exist |
| `422 Unprocessable Entity` | `formulaId` parameter is missing or empty |
| `500 Internal Server Error` | Unexpected server failure |
