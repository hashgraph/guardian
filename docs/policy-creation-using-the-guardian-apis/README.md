# Policy Creation APIs

**Base URL:** `/api/v1`

These APIs enable Standard Registry users to create, configure, publish, and manage Guardian policies. Users and auditors can also interact with running policies via block and group endpoints.

**Authentication:** All endpoints require a valid JWT Bearer token (`Authorization: Bearer <token>`). Obtain a token via `POST /accounts/login`.

See [Prerequisite Steps](prerequesite-steps.md) before getting started.

***

## Endpoints

| Method | Endpoint                                    | Description                      | Auth Required |
| ------ | ------------------------------------------- | -------------------------------- | ------------- |
| GET    | `/policies`                                 | List all policies                | Yes           |
| POST   | `/policies`                                 | Create a new policy              | Yes           |
| GET    | `/policies/{policyId}`                      | Get policy configuration         | Yes           |
| PUT    | `/policies/{policyId}`                      | Update policy configuration      | Yes           |
| PUT    | `/policies/{policyId}/publish`              | Publish a policy                 | Yes           |
| POST   | `/policies/validate`                        | Validate policy configuration    | Yes           |
| GET    | `/policies/{policyId}/blocks`               | Get root policy block data       | Yes           |
| GET    | `/policies/{policyId}/blocks/{uuid}`        | Get block data by UUID           | Yes           |
| POST   | `/policies/{policyId}/blocks/{uuid}`        | Send data to a block             | Yes           |
| GET    | `/policies/{policyId}/tag/{tagName}`        | Get block ID by tag              | Yes           |
| GET    | `/policies/{policyId}/tag/{tagName}/blocks` | Get block data by tag            | Yes           |
| POST   | `/policies/{policyId}/tag/{tagName}/blocks` | Send data to block by tag        | Yes           |
| GET    | `/policies/{policyId}/groups`               | List groups for the current user | Yes           |
| POST   | `/policies/{policyId}/groups`               | Set the active group             | Yes           |
| GET    | `/policies/{policyId}/export/file`          | Export policy as zip             | Yes           |
| GET    | `/policies/{policyId}/export/message`       | Export policy message ID         | Yes           |
| POST   | `/policies/import/file`                     | Import policy from zip           | Yes           |
| POST   | `/policies/import/message`                  | Import policy from IPFS          | Yes           |
| POST   | `/policies/import/message/preview`          | Preview policy from IPFS         | Yes           |

***

## Endpoint Details

* [Prerequisite Steps](prerequesite-steps.md) — Authentication and account setup
* [Policy Listing](policy-listing.md) — `GET /policies`
* [Creation of a Policy](creation-of-a-policy.md) — `POST /policies`
* [Retrieves Policy Configuration](retrieves-policy-configuration.md) — `GET /policies/{policyId}`
* [Updates Policy Configuration](updates-policy-configuration.md) — `PUT /policies/{policyId}`
* [Publish a Policy](publish-a-policy.md) — `PUT /policies/{policyId}/publish`
* [Policy Validation](policy-validation.md) — `POST /policies/validate`
* [Retrieval of Data from Root Policy Block](retrieval-of-data-from-root-policy-block.md) — `GET /policies/{policyId}/blocks`
* [Request Block Data](request-block-data.md) — `GET /policies/{policyId}/blocks/{uuid}`
* [Sends Data to Specified Block](sends-data-to-specified-block.md) — `POST /policies/{policyId}/blocks/{uuid}`
* [Returns Block ID by Tag](returns-block-id-by-tag.md) — `GET /policies/{policyId}/tag/{tagName}`
* [Retrieves Block Data by Tag](retrieves-block-data-by-tag.md) — `GET /policies/{policyId}/tag/{tagName}/blocks`
* [Sends Data to Specified Block by Tag](sends-data-to-specified-block-by-tag.md) — `POST /policies/{policyId}/tag/{tagName}/blocks`
* [Returns List of Groups of a Particular User](returns-list-of-groups-of-a-particular-user.md) — `GET /policies/{policyId}/groups`
* [Make the Selected Group Active](make-the-selected-group-active.md) — `POST /policies/{policyId}/groups`
* [Export to Zip File](export-to-zip-file.md) — `GET /policies/{policyId}/export/file`
* [Exporting Message ID](exporting-message-id.md) — `GET /policies/{policyId}/export/message`
* [Import a Policy](import-a-policy.md) — `POST /policies/import/message`
* [Import from Zip File](import-from-zip-file.md) — `POST /policies/import/file`
* [Policy Preview from IPFS](policy-preview-from-ipfs.md) — `POST /policies/import/message/preview`
* [Dynamic Policy Fields Guide](https://github.com/hashgraph/guardian/blob/develop/docs/policy-creation-using-the-guardian-apis/dynamic-policy-fields.md) — Dynamic field configuration reference
