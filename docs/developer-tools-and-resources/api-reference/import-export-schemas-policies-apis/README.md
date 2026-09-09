# Import / Export Schemas and Policies via Excel APIs

Endpoints for importing and exporting Guardian policies and schemas using Excel (`.xlsx`) files. Useful for bulk data entry and schema design using spreadsheet tools.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** Standard Registry role required.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/policies/{policyId}/export/xlsx` | Exports a policy as an Excel file | Yes |
| `POST` | `/api/v1/policies/import/xlsx` | Imports a policy from an Excel file | Yes |
| `POST` | `/api/v1/policies/push/import/xlsx` | Imports a policy from an Excel file asynchronously | Yes |
| `POST` | `/api/v1/policies/import/xlsx/preview` | Previews a policy from an Excel file | Yes |
| `GET` | `/api/v1/schemas/{schemaId}/export/xlsx` | Exports a schema as an Excel file | Yes |
| `POST` | `/api/v1/schemas/import/xlsx` | Imports a schema from an Excel file | Yes |
| `POST` | `/api/v1/schemas/push/import/xlsx` | Imports a schema from an Excel file asynchronously | Yes |
| `POST` | `/api/v1/schemas/import/xlsx/preview` | Previews a schema from an Excel file | Yes |
| `GET` | `/api/v1/schemas` | Returns a list of schemas | Yes |

## Endpoints

- [Exporting Policy to Excel](exporting-policy-to-excel.md)
- [Import Policy from Excel File](import-policy-from-excel-file.md)
- [Import Policy from Excel File Asynchronously](import-policy-from-excel-file-asynchronously.md)
- [Policy Preview from Excel File](policy-preview-from-excel-file.md)
- [Returns Schema in Excel File Format](returns-schema-in-excel-file-format.md)
- [Imports New Schema from Excel File](imports-new-schema-from-excel-file.md)
- [Imports New Schema from Excel File Asynchronously](imports-new-schema-from-excel-file-asynchronously.md)
- [Previews Schema from Excel File](previews-schema-from-excel-file.md)
- [Returns List of Schemas](returns-list-of-schemas.md)
