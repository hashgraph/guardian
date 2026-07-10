# Global Indexer APIs

Endpoints for the Guardian Global Indexer service, which provides search and analytics across all Hedera-based Guardian entities including policies, schemas, tokens, DIDs, VCs, VPs, and more.

**Authentication:** Bearer token required for most endpoints (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/search` | Full-text search across all indexed entities | Yes |
| `GET` | `/api/v1/entities/did-documents` | Returns all indexed DID documents | Yes |
| `GET` | `/api/v1/entities/did-documents/{messageId}` | Returns a DID document by message ID | Yes |
| `GET` | `/api/v1/entities/did-documents/{messageId}/relationships` | Returns DID relationships | Yes |
| `GET` | `/api/v1/entities/vc-documents` | Returns all indexed VC documents | Yes |
| `GET` | `/api/v1/entities/vc-documents/{messageId}` | Returns a VC document by message ID | Yes |
| `GET` | `/api/v1/entities/vc-documents/{messageId}/relationships` | Returns VC document relationships | Yes |
| `GET` | `/api/v1/entities/vp-documents` | Returns all indexed VP documents | Yes |
| `GET` | `/api/v1/entities/vp-documents/{messageId}` | Returns a VP document by message ID | Yes |
| `GET` | `/api/v1/entities/vp-documents/{messageId}/relationships` | Returns VP document relationships | Yes |
| `GET` | `/api/v1/entities/policies` | Returns all indexed policies | Yes |
| `GET` | `/api/v1/entities/policies/{messageId}` | Returns a policy by message ID | Yes |
| `GET` | `/api/v1/entities/policies/{messageId}/relationships` | Returns policy relationships | Yes |
| `GET` | `/api/v1/entities/schemas` | Returns all indexed schemas | Yes |
| `GET` | `/api/v1/entities/schemas/{messageId}` | Returns a schema by message ID | Yes |
| `GET` | `/api/v1/entities/schemas/{messageId}/tree` | Returns the schema tree | Yes |
| `GET` | `/api/v1/entities/tokens` | Returns all indexed tokens | Yes |
| `GET` | `/api/v1/entities/tokens/{tokenId}` | Returns a token by token ID | Yes |
| `GET` | `/api/v1/entities/nfts` | Returns all indexed NFTs | Yes |
| `GET` | `/api/v1/entities/nfts/{serialNumber}` | Returns an NFT by serial number | Yes |
| `GET` | `/api/v1/entities/topics` | Returns all indexed Hedera topics | Yes |
| `GET` | `/api/v1/entities/topics/{topicId}` | Returns a topic by topic ID | Yes |
| `GET` | `/api/v1/entities/contracts` | Returns all indexed retirement contracts | Yes |
| `GET` | `/api/v1/entities/contracts/{messageId}` | Returns a contract by message ID | Yes |
| `GET` | `/api/v1/entities/modules` | Returns all indexed modules | Yes |
| `GET` | `/api/v1/entities/modules/{messageId}` | Returns a module by message ID | Yes |
| `GET` | `/api/v1/entities/tools` | Returns all indexed tools | Yes |
| `GET` | `/api/v1/entities/tools/{messageId}` | Returns a tool by message ID | Yes |
| `GET` | `/api/v1/entities/roles` | Returns all indexed roles | Yes |
| `GET` | `/api/v1/entities/roles/{messageId}` | Returns a role by message ID | Yes |
| `GET` | `/api/v1/entities/standard-registries` | Returns all indexed Standard Registry accounts | Yes |
| `GET` | `/api/v1/entities/standard-registries/{messageId}` | Returns a Standard Registry by message ID | Yes |
| `GET` | `/api/v1/entities/standard-registries/{messageId}/relationships` | Returns Standard Registry relationships | Yes |
| `GET` | `/api/v1/entities/registry-users` | Returns all indexed registry users | Yes |
| `GET` | `/api/v1/entities/registry-users/{messageId}` | Returns a registry user by message ID | Yes |
| `GET` | `/api/v1/entities/formulas` | Returns all indexed formulas | Yes |
| `GET` | `/api/v1/entities/formulas/{messageId}` | Returns a formula by message ID | Yes |
| `GET` | `/api/v1/entities/formulas/{messageId}/relationships` | Returns formula relationships | Yes |
| `GET` | `/api/v1/analytics/search/policies` | Returns search results for policies | Yes |
| `GET` | `/api/v1/analytics/compare/policy/original/{messageId}` | Compares policy changes by message ID | Yes |
| `GET` | `/api/v1/analytics/derivations/{messageId}` | Returns policy derivations | Yes |
| `GET` | `/api/v1/landing` | Returns landing page analytics | No |
| `GET` | `/api/v1/landing/settings` | Returns Hedera network explorer settings | No |
| `GET` | `/api/v1/landing/network` | Returns the Hedera network name | No |
| `GET` | `/api/v1/landing/coordinates` | Returns project geo-coordinates | No |
| `POST` | `/api/v1/landing/data-priority-policy` | Adds policy data to the priority loading queue | Yes |
| `POST` | `/api/v1/landing/data-priority-tokens` | Adds token data to the priority loading queue | Yes |
| `POST` | `/api/v1/landing/data-priority-topics` | Adds topic data to the priority loading queue | Yes |
| `POST` | `/api/v1/landing/data-priority-any/{entityId}` | Adds any entity to the priority loading queue | Yes |
| `GET` | `/api/v1/landing/progress` | Returns data loading progress | Yes |
| `POST` | `/api/v1/entities/update-files` | Refreshes linked files for the selected documents | Yes |
| `GET` | `/api/v1/artifacts/files/{fileId}` | Downloads a file by ID | Yes |
| `DELETE` | `/api/v1/ipfs/file/{cid}` | Removes a file from IPFS by CID | Yes |

## Endpoints

- [Full-Text Indexer Search](full-text-indexer-search.md)
- [Returns DIDs](returns-dids.md)
- [Returns DID as per Message ID](returns-did-as-per-messageid.md)
- [Returns DID Relationships](returns-did-relationships.md)
- [Returns VC Documents](returns-vc-documents.md)
- [Returns VC Document as per Message ID](returns-vc-document-as-per-messageid.md)
- [Returns VC Relationships](returns-vc-relationships.md)
- [Returns VP Documents](returns-vp-documents.md)
- [Returns VP Document as per Message ID](returns-vp-document-as-per-messageid.md)
- [Returns VP Relationships](returns-vp-relationships.md)
- [Returns Policies](returns-policies.md)
- [Returns Policy as per Message ID](returns-policy-as-per-messageid.md)
- [Returns Policy Relationships](returns-policy-relationships.md)
- [Returns Schemas](returns-schemas.md)
- [Returns Schema as per Message ID](returns-schema-as-per-messageid.md)
- [Returns Schema Tree](returns-schema-tree.md)
- [Returns Tokens](returns-tokens.md)
- [Returns Token as per Token ID](returns-token-as-per-tokenid.md)
- [Returns NFTs](returns-nfts.md)
- [Returns NFT as per Serial No.](returns-nft-as-per-serial-no..md)
- [Returns Topics](returns-topics.md)
- [Returns Topic as per Topic ID](returns-topic-as-per-topicid.md)
- [Returns Contracts](returns-contracts.md)
- [Returns Contract as per Message ID](returns-contract-as-per-messageid.md)
- [Returns Modules](returns-modules.md)
- [Returns Module as per Message ID](returns-module-as-per-messageid.md)
- [Returns Tools](returns-tools.md)
- [Returns Tool as per Message ID](returns-tool-as-per-messageid.md)
- [Returns Roles](returns-roles.md)
- [Returns Role as per Message ID](returns-role-as-per-messageid.md)
- [Returns Standard Registries](returns-standard-registries.md)
- [Returns Registry as per Message ID](returns-registry-as-per-messageid.md)
- [Returns Registry Relationships](returns-registry-relationships.md)
- [Returns Registry Users](returns-registry-users.md)
- [Returns Registry User as per Message ID](returns-registry-user-as-per-messageid.md)
- [Retrieve the List of Formulas](retrieve-the-list-of-formulas.md)
- [Retrieve the Formula by Message ID](retrieve-the-formula-by-message-id.md)
- [Retrieve Linked Documents Related to Formula](retrieve-linked-documents-which-are-related-to-formula.md)
- [Returns Search Policy Results](returns-search-policy-results.md)
- [Comparing the Policy Changes as per ID](comparing-the-policy-changes-as-per-id.md)
- [Display the Derivations](display-the-derivations.md)
- [Returns Landing Page Analytics](returns-landing-page-analytics.md)
- [Returns Hedera Network Explorer Settings](returns-hedera-network-explorer-settings.md)
- [Returns Hedera Network](returns-hedera-network.md)
- [Returns Project Coordinates](returns-project-coordinates.md)
- [Adding Policy Data for Priority Loading](adding-policy-data-for-priority-loading.md)
- [Adding Token Data for Priority Loading](adding-token-data-for-priority-loading.md)
- [Adding Topic Data Priority Loading](adding-topic-data-priority-loading.md)
- [Adding Document to Data Priority Loading](adding-document-to-data-priority-loading.md)
- [Returning Topic Data Priority Loading Progress](returning-topic-data-priority-loading-progress.md)
- [Returns Data Loading Progress Result](returns-data-loading-progress-result.md)
- [Attempts to Refresh Linked Files for the Selected Documents](attempts-to-refresh-linked-files-for-the-selected-documents.md)
- [Download File by ID](download-file-by-id.md)
- [Removes a File from IPFS by CID](removes-a-file-from-ipfs-by-cid.md)
