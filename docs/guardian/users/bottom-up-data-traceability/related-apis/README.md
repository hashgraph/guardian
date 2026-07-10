# Bottom-Up Data Traceability APIs

Endpoints for creating and managing policy statistics definitions and assessments. Statistics definitions specify rules for evaluating documents; assessments apply those rules to produce verifiable results.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/policy-statistics` | Returns all statistics definitions | Yes |
| `POST` | `/api/v1/policy-statistics` | Creates a new statistics definition | Yes |
| `GET` | `/api/v1/policy-statistics/{definitionId}` | Returns a statistics definition by ID | Yes |
| `PUT` | `/api/v1/policy-statistics/{definitionId}` | Updates a statistics definition | Yes |
| `DELETE` | `/api/v1/policy-statistics/{definitionId}` | Deletes a statistics definition | Yes |
| `POST` | `/api/v1/policy-statistics/{definitionId}/publish` | Publishes a statistics definition | Yes |
| `GET` | `/api/v1/policy-statistics/{definitionId}/relationships` | Returns linked schemas and policies | Yes |
| `GET` | `/api/v1/policy-statistics/{definitionId}/documents` | Returns documents conforming to the definition rules | Yes |
| `GET` | `/api/v1/policy-statistics/{definitionId}/assessments` | Returns all assessments for a definition | Yes |
| `POST` | `/api/v1/policy-statistics/{definitionId}/assessments` | Creates a new assessment | Yes |
| `GET` | `/api/v1/policy-statistics/{definitionId}/assessments/{assessmentId}` | Returns an assessment by ID | Yes |
| `GET` | `/api/v1/policy-statistics/{definitionId}/assessments/{assessmentId}/relationships` | Returns all VC documents related to an assessment | Yes |

## Endpoints

- [Get the List of Statistics Definitions](get-the-list-of-statistics-definitions.md)
- [Create New Statistics Definition](create-new-statistics-definition.md)
- [Retrieve Details of the Statistics Definition by ID](retrieve-details-of-the-statistics-definition-by-id.md)
- [Update Configuration of the Statistics Definition by ID](update-configuration-of-the-statistics-definition-by-id.md)
- [Delete the Statistics Definition by ID](delete-the-statistics-definition-by-id.md)
- [Publish Statistics Definition by ID](publish-statistics-definition-by-id.md)
- [Retrieve the List of Linked Schemas and Policy](retrieve-the-list-of-linked-schemas-and-policy.md)
- [Retrieve the List of All Documents Conforming the Rules](retrieve-the-list-of-all-documents-conforming-the-rules-of-the-statistics-definition..md)
- [Retrieve the List of Existing Statistics Assessments](retrieve-the-list-of-existing-statistics-assessment.md)
- [Create a New Statistics Assessment](create-a-new-statistics-assessment-based-on-the-statistics-definition.md)
- [Retrieve the Statistics Assessment by ID](retrieve-the-statistics-assessment-by-id.md)
- [Retrieve All VC Documents Related to the Statistics Assessment](retrieve-all-vc-documents-related-to-the-statistics-assessment.md)
