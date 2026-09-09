# Export Selected Formula into a File

**`GET /api/v1/formulas/{formulaId}/export/file`**

Exports a formula and its dependencies as a downloadable ZIP file.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.FORMULAS_FORMULA_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `formulaId` | string | Yes | Database ID of the formula to export |

---

## Response

### Success Response

**Status:** `200 OK`

Returns a binary ZIP file containing the formula data.

**Content-Type:** `application/zip`

**Content-Disposition:** `attachment; filename=theme_<timestamp>`

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
