# Policy Statistics APIs

The Policy Statistics APIs allow Standard Registries to create, manage, and evaluate statistic definitions — configurable rule sets that assess and score VC documents produced by Guardian policies. Assessments can be created against a definition and their full relationship graphs retrieved for audit and reporting purposes.

**Authentication:** All endpoints require a Bearer token (`Authorization: Bearer <token>`), obtained via `POST /accounts/login`.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **`POST`** | `/api/v1/policy-statistics` | Creates a new statistic definition | Yes |
| **`GET`** | `/api/v1/policy-statistics` | Returns all statistic definitions | Yes |
| **`GET`** | `/api/v1/policy-statistics/{definitionId}` | Returns a statistic definition by ID | Yes |
| **`PUT`** | `/api/v1/policy-statistics/{definitionId}` | Updates a statistic definition | Yes |
| **`DELETE`** | `/api/v1/policy-statistics/{definitionId}` | Deletes a statistic definition | Yes |
| **`PUT`** | `/api/v1/policy-statistics/{definitionId}/publish` | Publishes a statistic definition | Yes |
| **`GET`** | `/api/v1/policy-statistics/{definitionId}/relationships` | Returns statistic definition relationships | Yes |
| **`GET`** | `/api/v1/policy-statistics/{definitionId}/documents` | Returns all documents for a definition | Yes |
| **`POST`** | `/api/v1/policy-statistics/{definitionId}/assessment` | Creates a new statistic assessment | Yes |
| **`GET`** | `/api/v1/policy-statistics/{definitionId}/assessment` | Returns all assessments for a definition | Yes |
| **`GET`** | `/api/v1/policy-statistics/{definitionId}/assessment/{assessmentId}` | Returns a statistic assessment by ID | Yes |
| **`GET`** | `/api/v1/policy-statistics/{definitionId}/assessment/{assessmentId}/relationships` | Returns assessment relationships | Yes |
| **`POST`** | `/api/v1/policy-statistics/{policyId}/import/file` | Imports a statistic definition from a zip file | Yes |
| **`GET`** | `/api/v1/policy-statistics/{definitionId}/export/file` | Exports a statistic definition as a zip file | Yes |
| **`POST`** | `/api/v1/policy-statistics/import/file/preview` | Previews a statistic definition zip before import | Yes |

## Endpoints

- [Returns All Statistic Definitions](returns-all-dashboards.md)
- [Returns All Statistic Assessments](returns-all-reports.md)
- [Returns Statistic Definition by ID](returns-dashboard-by-uuid.md)
- [Returns Statistic Assessment by ID](returns-report-data-by-report-uuid.md)
- [Returns Statistic Definition Relationships](returns-the-status-of-the-current-report.md)
- [Updates Statistic Definition](update-current-report.md)
- [Export Statistic Definition as ZIP File](export-report-data-in-a-csv-file-format.md)
- [Import Statistic Definition from ZIP File](export-report-data-in-a-xlsx-file-format.md)
- [Returns All Documents for a Statistic Definition](returns-metrics.md)
