# Retrieve the List of All Schemas and Policies Linked to a Formula

**`GET /api/v1/formulas/{formulaId}/relationships`**

Retrieves the relationship graph for a formula, including all linked policies and schemas.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.FORMULAS_FORMULA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `formulaId` | string | Yes | Database ID of the formula |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "uuid": "c4a3b2d1-e5f6-7890-abcd-ef1234567890",
  "policies": [
    {
      "id": "63e3e5e8a01b3c001234abce",
      "name": "Carbon Offset Policy",
      "version": "1.0.0"
    }
  ],
  "schemas": [
    {
      "id": "63e3e5e8a01b3c001234abcf",
      "name": "Emission Reduction Schema"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Formula database ID |
| `uuid` | string | Formula UUID |
| `policies` | array | List of policies that reference this formula |
| `schemas` | array | List of schemas that reference this formula |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `formulaId` parameter is missing or empty |
| `500 Internal Server Error` | Unexpected server failure |
