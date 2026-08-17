# Version Control and Migration

Best practices for version control and migration in Hedera Guardian schemas center on maintaining backward compatibility, clear semantic versioning, planned deprecation, and thorough documentation to ensure smooth transitions across schema updates.

### Version Control Best Practices

* **Semantic Versioning**\
  Use a major.minor.micro format for schema versioning:
  * **Micro**: Non-breaking minor edits (descriptive changes, comments)\
    This convention helps users recognize change impact at a glance and plan accordingly.
  * **Minor**: Non-breaking but notable changes (adding new fields, new enum values, adjusting required/optional status)
  * **Major**: Breaking changes (removing, renaming, or altering field types)
* **Preserve Backward Compatibility**\
  Avoid removing or modifying existing schema elements. Instead, add new fields or enums for new functionality so older schemas remain valid and usable by the Guardian Policy Engine indefinitely.
* **Deprecation Notice and Grace Period**\
  When a schema version or element is deprecated, provide a minimum 2-month notice through metadata annotations and official release notes. Communicate end-of-life dates and issue revocation notices on Hedera Topics at expiry for transparency.
* **Maintain Schema Registry and Metadata**\
  Document all versions, status (active, deprecated, unsupported), and compatibility information in a centralized registry. This facilitates tracking and migration planning.

### Migration Best Practices

* **Versioned Migrations with Clear Documentation**\
  Maintain detailed change logs describing all schema modifications, reasons for change, and migration guides to assist consumers in adapting to newer schema versions.
* **Testing Migration Paths**\
  Thoroughly test backward and forward compatibility of schemas during upgrades using controlled test data and simulations within Guardian.
* **Plan for Obsolete Elements**\
  Prepare tools and processes to phase out obsolete schema elements by removing them from newly created schemas and guiding users on alternate fields.
* **Align Schema Versioning with Policy Engine Releases**\
  Sync schema language changes with Guardian engine updates to manage technological dependencies and leverage new platform capabilities effectively
