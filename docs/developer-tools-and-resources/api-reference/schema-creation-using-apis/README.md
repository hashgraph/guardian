# Schema Creation APIs

Endpoints for creating, retrieving, updating, publishing, and deleting schemas in Guardian. Schemas define the structure of verifiable credential documents used in policies.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/schemas` | Returns all schemas accessible to the current user | Yes |
| `POST` | `/api/v1/schemas` | Creates a new schema | Yes |
| `PUT` | `/api/v1/schemas/{schemaId}` | Updates a schema | Yes |
| `DELETE` | `/api/v1/schemas/{schemaId}` | Deletes a schema | Yes |
| `PUT` | `/api/v1/schemas/{schemaId}/publish` | Publishes a schema | Yes |
| `POST` | `/api/v1/schemas/import/message` | Imports a schema from an IPFS message ID | Yes |
| `POST` | `/api/v1/schemas/import/file` | Imports a schema from a ZIP file | Yes |
| `POST` | `/api/v1/schemas/import/message/preview` | Previews a schema from an IPFS message ID | Yes |
| `POST` | `/api/v1/schemas/import/file/preview` | Previews a schema from a ZIP file | Yes |
| `GET` | `/api/v1/schemas/{schemaId}/export/message` | Returns the schema IPFS message ID | Yes |
| `GET` | `/api/v1/schemas/{schemaId}/export/file` | Exports a schema as a ZIP file | Yes |
| `GET` | `/api/v1/schemas/{topicId}` | Returns all schemas for the specified topic | Yes |
| `POST` | `/api/v1/schemas/{topicId}` | Creates a schema under the specified topic | Yes |
| `GET` | `/api/v1/schemas/{schemaId}/sub-schemas` | Returns all child schemas | Yes |
| `GET` | `/api/v1/schemas/{schemaId}` | Returns a schema by ID | Yes |
| `GET` | `/api/v1/schemas/{schemaId}/example` | Returns a sample payload for the schema | Yes |
| `DELETE` | `/api/v1/schemas/{topicId}/all` | Deletes all schemas under the topic | Yes |

## Endpoints

- [Returns All Schemas](creation-of-a-schema-1.md)
- [Creation of a Schema Related to the Topic](creation-of-schema-related-to-the-topic.md)
- [Updating Schema](updating-schema.md)
- [Deleting a Schema](deleting-a-schema.md)
- [Publishing Schema Based on Schema ID](publishing-schema-based-on-schema-id.md)
- [Importing Schema from IPFS](importing-schema-from-ipfs.md)
- [Importing ZIP File Containing Schema](importing-zip-file-containing-schema.md)
- [Schema Preview from IPFS](schema-preview-from-ipfs.md)
- [Schema Preview from ZIP](schema-preview-from-zip.md)
- [Export a Schema (Message ID)](export-a-schema.md)
- [Export a Schema (File)](export-a-schema-1.md)
- [Returns All Schemas Related to the Topic](returns-all-schemas-related-to-the-topic.md)
- [Returning Schema by Schema ID](returning-schema-by-schemaid.md)
- [Returns All Child Schemas](returns-all-child-schemas.md)
- [Returns a Sample Payload for the Schema](returns-a-sample-payload-for-the-schema-by-schema-id..md)
- [Previews List of Schema Duplicates](previews-list-of-schemas-duplicates.md)
- [Deletes All Schemas by Topic ID](deletes-all-schemas-by-topic-id.-only-users-with-the-standard-registry-are-allowed..md)
