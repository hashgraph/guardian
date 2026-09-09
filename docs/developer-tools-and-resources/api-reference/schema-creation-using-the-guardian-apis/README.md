# Schema Creation APIs

**Base URL:** `/api/v1`

These APIs allow Standard Registry users to manage schemas — create, update, publish, import, export, and delete schemas associated with Guardian policies.

**Authentication:** All endpoints require a valid JWT Bearer token (`Authorization: Bearer <token>`). Obtain a token via `POST /accounts/login`.

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/schemas` | List all schemas (paginated) | Yes |
| GET | `/schema/{schemaId}` | Get schema by ID | Yes |
| GET | `/schemas/{topicId}` | List schemas by topic | Yes |
| POST | `/schemas/{topicId}` | Create new schema under a topic | Yes |
| PUT | `/schemas/` | Update an existing schema | Yes |
| DELETE | `/schemas/{schemaId}` | Delete a schema | Yes |
| PUT | `/schemas/{schemaId}/publish` | Publish schema to IPFS | Yes |
| GET | `/schemas/{schemaId}/export/message` | Export schema message IDs | Yes |
| GET | `/schemas/{schemaId}/export/file` | Export schema as zip file | Yes |
| POST | `/schemas/{topicId}/import/message` | Import schema from IPFS | Yes |
| POST | `/schemas/{topicId}/import/file` | Import schema from zip file | Yes |
| POST | `/schemas/import/message/preview` | Preview schema from IPFS before import | Yes |
| POST | `/schemas/import/file/preview` | Preview schema from zip before import | Yes |

---

## Endpoint Details

* [Listing of Schema](creation-of-a-schema-1.md) — `GET /schemas`
* [Returning Schema by SchemaID](returning-schema-by-schemaid.md) — `GET /schema/{schemaId}`
* [Returns All Schemas Related to the Topic](returns-all-schemas-related-to-the-topic.md) — `GET /schemas/{topicId}`
* [Creation of Schema Related to the Topic](creation-of-schema-related-to-the-topic.md) — `POST /schemas/{topicId}`
* [Updating Schema](updating-schema.md) — `PUT /schemas/`
* [Deleting a Schema](deleting-a-schema.md) — `DELETE /schemas/{schemaId}`
* [Publishing Schema Based on Schema ID](publishing-schema-based-on-schema-id.md) — `PUT /schemas/{schemaId}/publish`
* [Export Schema Message IDs](export-a-schema.md) — `GET /schemas/{schemaId}/export/message`
* [Export Schema as Zip](export-a-schema-1.md) — `GET /schemas/{schemaId}/export/file`
* [Import Schema from IPFS](importing-schema-from-ipfs.md) — `POST /schemas/{topicId}/import/message`
* [Import Schema from Zip](importing-zip-file-containing-schema.md) — `POST /schemas/{topicId}/import/file`
* [Schema Preview from IPFS](schema-preview-from-ipfs.md) — `POST /schemas/import/message/preview`
* [Schema Preview from Zip](schema-preview-from-zip.md) — `POST /schemas/import/file/preview`

See [Prerequisite Steps](../policy-creation-using-the-guardian-apis/prerequesite-steps.md) for authentication setup.
