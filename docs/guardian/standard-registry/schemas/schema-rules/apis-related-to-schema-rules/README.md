# APIs Related to Schema Rules

Schema Rules define validation rule sets applied to schema documents within policies. Rules specify field-level constraints, cross-field dependencies, and data quality checks beyond basic JSON Schema validation.

**Authentication:** All endpoints require a Bearer JWT token (`Authorization: Bearer <token>`). Obtain a token via `POST /accounts/login`.

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **`POST`** | `/api/v1/schema-rules` | Creates a new schema rule | Yes |
| **`GET`** | `/api/v1/schema-rules` | Returns a paginated list of all schema rules | Yes |
| **`GET`** | `/api/v1/schema-rules/{ruleId}` | Retrieves a schema rule by ID | Yes |
| **`PUT`** | `/api/v1/schema-rules/{ruleId}` | Updates a schema rule by ID | Yes |
| **`DELETE`** | `/api/v1/schema-rules/{ruleId}` | Deletes a schema rule by ID | Yes |
| **`PUT`** | `/api/v1/schema-rules/{ruleId}/activate` | Activates a schema rule | Yes |
| **`PUT`** | `/api/v1/schema-rules/{ruleId}/inactivate` | Deactivates a schema rule | Yes |
| **`GET`** | `/api/v1/schema-rules/{ruleId}/relationships` | Lists all schemas and policies linked to a rule | Yes |
| **`POST`** | `/api/v1/schema-rules/data` | Retrieves data needed for evaluating rules | Yes |
| **`POST`** | `/api/v1/schema-rules/{policyId}/import/file` | Imports schema rules from a ZIP file | Yes |
| **`GET`** | `/api/v1/schema-rules/{ruleId}/export/file` | Exports a schema rule to a ZIP file | Yes |
| **`POST`** | `/api/v1/schema-rules/import/file/preview` | Previews a schema rule ZIP without saving | Yes |

---

## Endpoint Details

- [Creation of a New Schema Rule](creation-of-the-new-schema-rule.md)
- [Retrieve the Schema Rules](retrieve-the-schema-rules.md)
- [Retrieve the Configuration of the Rule by Its ID](retrieve-the-configuration-of-the-rule-by-its-id.md)
- [Update the Configuration of the Rule with the Corresponding ID](update-the-configuration-of-the-rule-with-the-corresponding-id.md)
- [Delete the Rule by Its ID](delete-the-rule-by-its-id.md)
- [Activate the Rule with the Specified ID](activate-the-rule-with-the-specified-id.md)
- [Deactivate the Rule with the Specified ID](deactivate-the-rule-with-the-specified-id.md)
- [List All Schemas and Policies Relevant to the Rule with the Specified ID](list-all-the-schemas-and-policy-relevant-to-the-rule-with-the-specified-id.md)
- [Retrieve All the Data Needed for Evaluating the Rules](retrieve-all-the-data-needed-for-evaluating-the-rules.md)
- [Create a New Rule from the File](create-a-new-rule-from-the-file.md)
- [Export the Selected Rule by ID into the File](export-the-selected-rule-by-id-into-the-file.md)
- [Load the File and Return Its Preview](load-the-file-and-return-its-preview.md)
