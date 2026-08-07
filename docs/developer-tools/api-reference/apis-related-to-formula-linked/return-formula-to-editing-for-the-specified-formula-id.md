# Return Formula to Editing for the Specified Formula ID

**`PUT /api/v1/formulas/{formulaId}/draft`**

Returns a published formula back to draft status, allowing it to be edited again.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.FORMULAS_FORMULA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `formulaId` | string | Yes | Database ID of the formula to return to draft |

---

## Response

### Success Response

**Status:** `200 OK`

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
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Formula with the given ID does not exist |
| `422 Unprocessable Entity` | `formulaId` parameter is missing or empty |
| `500 Internal Server Error` | Unexpected server failure |
