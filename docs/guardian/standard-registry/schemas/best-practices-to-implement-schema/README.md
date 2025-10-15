# 📽️ Best Practices to Implement Schema

Best practices for implementing the schema cycle in Hedera Guardian involve a systematic approach to schema design, development, testing, deployment, versioning, and ongoing iteration as part of the complete methodology digitization lifecycle.

### Schema Cycle Best Practices

* **Excel-First Design**: Begin schema development using detailed Excel templates to map parameters, field types, defaults, validation rules, and conditional logic. This facilitates collaboration and clarity before importing into Guardian.
* **Incremental Development**: Follow a logical sequence—start with foundational schema architecture, progress to detailed project description (PDD) schemas, then monitoring/reporting schemas, followed by advanced techniques such as API-driven updates and UUID management.
* **Testing and Validation**: Make sure to include default, suggested, and test values into your schemas wherever possible. Use them for practical testing, to verify logical constraints and user experience utilizing Guardian’s testing features before publishing.
* **Version Control and Migration**: Manage schema versions carefully with semantic versioning, maintain backward compatibility when possible, and follow planned migration paths to newer versions with deprecation notices.
* **Conditional and Visibility Logic**: Implement conditional sub-schemas and field visibility toggles to streamline user input flows and accommodate complex project workflows dynamically.
* **Reusability and Modularity**: Design schemas to be reusable components across multiple policies and methodologies to encourage standardization and reduce duplication.
* **Documentation and Metadata**: Maintain detailed documentation within and alongside schemas to provide context, field definitions, use cases, and change history for stakeholders.
