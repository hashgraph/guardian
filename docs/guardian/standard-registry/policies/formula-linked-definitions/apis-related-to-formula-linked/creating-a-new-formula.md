# Creating a New Formula

**`POST /api/v1/formulas`**

Creates a new formula and persists it to the database.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.FORMULAS_FORMULA_CREATE`

---

## Request

### Request Body

```json
{
  "name": "Carbon Credit Calculator",
  "description": "Calculates carbon credits based on emission factors",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "config": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable formula name |
| `description` | string | No | Description of the formula's purpose |
| `policyId` | string | No | ID of the policy this formula is linked to |
| `config` | object | No | Formula expression configuration |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "uuid": "c4a3b2d1-e5f6-7890-abcd-ef1234567890",
  "name": "Carbon Credit Calculator",
  "description": "Calculates carbon credits based on emission factors",
  "status": "DRAFT",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "policyId": "63e3e5e8a01b3c001234abcd",
  "config": {}
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Malformed request body |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Missing or invalid formula configuration |
| `500 Internal Server Error` | Unexpected server failure |
