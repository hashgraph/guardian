# Delete the Formula by Its ID

**`DELETE /api/v1/formulas/{formulaId}`**

Deletes the formula with the specified ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.FORMULAS_FORMULA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `formulaId` | string | Yes | Database ID of the formula to delete |

---

## Response

### Success Response

**Status:** `200 OK`

```json
true
```

Returns `true` when the formula is successfully deleted.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `formulaId` parameter is missing or empty |
| `500 Internal Server Error` | Unexpected server failure |
