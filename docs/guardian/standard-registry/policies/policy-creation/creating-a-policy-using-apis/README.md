# Policy Creation APIs

Endpoints for creating, configuring, publishing, importing, and interacting with Guardian policies. These APIs cover the full policy lifecycle including block data retrieval and group management.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** Standard Registry role required for write operations.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/policies` | Returns all policies for the current user | Yes |
| `POST` | `/api/v1/policies` | Creates a new policy | Yes |
| `GET` | `/api/v1/policies/{policyId}` | Returns a policy configuration | Yes |
| `PUT` | `/api/v1/policies/{policyId}` | Updates a policy configuration | Yes |
| `PUT` | `/api/v1/policies/{policyId}/publish` | Publishes a policy to Hedera | Yes |
| `POST` | `/api/v1/policies/{policyId}/validate` | Validates a policy configuration | Yes |
| `GET` | `/api/v1/policies/{policyId}/export/file` | Exports a policy as a ZIP file | Yes |
| `GET` | `/api/v1/policies/{policyId}/export/message` | Returns the policy Hedera message ID | Yes |
| `POST` | `/api/v1/policies/import/file` | Imports a policy from a ZIP file | Yes |
| `POST` | `/api/v1/policies/import/message` | Imports a policy from an IPFS message ID | Yes |
| `POST` | `/api/v1/policies/import/file-metadata` | Imports a policy from a ZIP file with metadata | Yes |
| `POST` | `/api/v1/policies/import/message/preview` | Previews a policy from an IPFS message ID | Yes |
| `GET` | `/api/v1/policies/{policyId}/blocks` | Returns the root block data for a running policy | Yes |
| `GET` | `/api/v1/policies/{policyId}/blocks/{blockId}` | Returns data for the specified block | Yes |
| `POST` | `/api/v1/policies/{policyId}/blocks/{blockId}` | Sends data to the specified block | Yes |
| `GET` | `/api/v1/policies/{policyId}/tag/{tagName}` | Returns a block ID by its tag name | Yes |
| `GET` | `/api/v1/policies/{policyId}/tag/{tagName}/blocks` | Returns block data by tag | Yes |
| `POST` | `/api/v1/policies/{policyId}/tag/{tagName}/blocks` | Sends data to the block identified by tag | Yes |
| `GET` | `/api/v1/policies/{policyId}/groups` | Returns user groups for the policy | Yes |
| `POST` | `/api/v1/policies/{policyId}/groups` | Makes the selected group active | Yes |
| `GET` | `/api/v1/policies/{policyId}/multiple` | Returns the multi-policy configuration | Yes |
| `POST` | `/api/v1/policies/multiple` | Creates a link between policies | Yes |

## Endpoints

- [Prerequisite Steps](prerequesite-steps.md)
- [Policy Listing](policy-listing.md)
- [Creation of a Policy](creation-of-a-policy.md)
- [Retrieves Policy Configuration](retrieves-policy-configuration.md)
- [Updates Policy Configuration](updates-policy-configuration.md)
- [Publish a Policy](publish-a-policy.md)
- [Policy Validation](policy-validation.md)
- [Export to ZIP File](export-to-zip-file.md)
- [Exporting Message ID](exporting-message-id.md)
- [Import from ZIP File](import-from-zip-file.md)
- [Import a Policy](import-a-policy.md)
- [Importing Policy from a ZIP File with Metadata](importing-policy-from-a-zip-file-with-metadata.md)
- [Policy Preview from IPFS](policy-preview-from-ipfs.md)
- [Retrieval of Data from Root Policy Block](retrieval-of-data-from-root-policy-block.md)
- [Request Block Data](request-block-data.md)
- [Sends Data to Specified Block](sends-data-to-specified-block.md)
- [Returns Block ID by Tag](returns-block-id-by-tag.md)
- [Retrieves Block Data by Tag](retrieves-block-data-by-tag.md)
- [Sends Data to Specified Block by Tag](sends-data-to-specified-block-by-tag.md)
- [Sends Data to Specified Block as per Tag](sends-data-to-specified-block-as-per-tag.md)
- [Sends Data to Specified Block Synchronously](sends-data-to-specified-block-synchronously.md)
- [Returns List of Groups of a Particular User](returns-list-of-groups-of-a-particular-user.md)
- [Make the Selected Group Active](make-the-selected-group-active.md)
- [Requesting Multi-Policy Config](requesting-multi-policy-config.md)
- [Creating Link Between Policies](creating-link-between-policies.md)
