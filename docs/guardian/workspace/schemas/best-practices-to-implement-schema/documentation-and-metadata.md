# Documentation and Metadata

Best practices for documentation and metadata in Hedera Guardian schemas emphasize clarity, completeness, standardization, and version control to ensure maintainability, interoperability, and trust across the sustainability ecosystem.

### Key Best Practices

* **Clear Schema Purpose and Scope**\
  Document the schema name, version, and a concise description of its purpose and intended use. This helps all participants understand the context and application of the schema at a glance.
* **Field-Level Documentation**\
  Provide descriptive labels and user-facing questions for every field. Include guidance notes or help text where needed to clarify expected input and reduce data entry errors.
* **Standardized Data Model Annotation**\
  Define data types, required status, allowed values (e.g., enums), validation rules, and relationships explicitly in metadata. This supports machine readability and enforces data integrity before on-chain issuance.
* **Version History and Change Log**\
  Maintain detailed versioning metadata including semantic version number, release date, author, and change summary. Track additions, removals, and modifications between versions for auditability and migration planning.
* **Schema Metadata Fields**\
  Include metadata fields for:
  * **Author/Owner**: Responsible party for the schema
  * **Date Created/Updated**: Timestamps for lifecycle tracking
  * **Deprecation Status**: Flags and notes if the schema or parts are deprecated
  * **External References**: Links to related policies, methodologies, or standards.
* **Use Structured Formats**\
  Maintain documentation alongside JSON schema definitions or Excel templates in human-readable formats supplemented by machine-readable annotations embedded in the schema where supported.
* **Interlink Schemas and Modules**\
  Reference related schemas or modules explicitly within metadata to indicate composability and relationships, improving navigation and reuse.
* **Stakeholder Accessibility**\
  Store documentation and metadata in accessible, version-controlled repositories, ensuring all stakeholders (developers, auditors, validators, regulators) have up-to-date schema information.
* **Audit Trail and Transparency**\
  Leverage Guardian’s trust chain to log schema publications, updates, and deprecation, providing a verifiable provenance record for regulatory and community trust.
* **Training and Examples**\
  Supplement schema documentation with usage examples, test data, and training materials to facilitate adoption and proper implementation.
