# Versioning and Deprecation Policy

Policy versioning in Guardian allows a methodology or workflow to evolve over time without breaking existing projects. Each policy can have multiple versions, ensuring traceability, flexibility, and regulatory compliance.

**Key Points:**

* New versions are created when standards bodies, registries, or auditors update rules, schemas, or workflows.
* Old versions remain intact so existing projects continue without disruption.
* Each version has a unique identifier (e.g., VM0042 v1.0, VM0042 v2.1).
* Backward compatibility is maintained via data migration tools.

Deprecation means a policy version is officially discontinued and cannot be used for new projects, though historical data is preserved for auditability.

**Key Points:**

* A deprecated policy cannot onboard new users or issue new credentials.
* Existing projects under that policy may either:
  * Continue under old rules (frozen state), or
  * Migrate to a newer version using Guardian’s Migration Wizard.
* Deprecation ensures stakeholders are aligned with up-to-date methodologies.
