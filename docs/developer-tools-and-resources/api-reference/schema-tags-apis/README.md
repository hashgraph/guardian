# Schema Tags APIs

Endpoints for creating, updating, and managing tag schemas — schemas associated with tagging entities in Guardian policies.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/tags/schemas` | Returns all tag schemas | Yes |
| `POST` | `/api/v1/tags/schemas` | Creates a new tag schema | Yes |
| `PUT` | `/api/v1/tags/schemas/{schemaId}` | Updates a tag schema | Yes |
| `DELETE` | `/api/v1/tags/schemas/{schemaId}` | Deletes a tag schema | Yes |
| `PUT` | `/api/v1/tags/schemas/{schemaId}/publish` | Publishes a tag schema | Yes |
| `GET` | `/api/v1/tags/schemas/published` | Returns all published tag schemas | Yes |

## Endpoints

- [Returning All Schema Tags](returning-all-schema-tags.md)
- [Creating New Schema Tag](creating-new-schema-tag.md)
- [Updating Schema Tag](updating-schema-tag.md)
- [Deleting Schema Tag](deleting-schema-tag.md)
- [Publishing Schema](publishing-schema.md)
- [Returning List of Published Schemas](returning-list-of-published-schemas.md)
