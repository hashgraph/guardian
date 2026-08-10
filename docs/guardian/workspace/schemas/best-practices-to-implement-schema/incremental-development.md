# Incremental Development

Best practices for incremental development of schemas in Hedera Guardian emphasize building schemas in logical, manageable stages that align with methodology complexity and user needs. The approach ensures rapid iteration, better error handling, and scalable schema growth.

### Key Best Practices for Incremental Development

* **Start with Schema Architecture Foundations**\
  Begin by developing foundational schema components that define the basic building blocks and data types used across the methodology. Typical first step: a core Project Description schema capturing essential metadata and identifiers.
* **Develop Project Design Document (PDD) Schemas Step-by-Step**\
  Add detailed fields incrementally, focusing on critical project attributes first (titles, locations, timeframes). Then introduce conditional logic and sub-schemas to handle complex branching scenarios, e.g., certification pathways or multiple modalities.
* **Build Monitoring and Reporting Schemas Separately**\
  Once PDD schemas are stable, incrementally add monitoring-report schemas that handle time-series data, quality control parameters, and validation evidence. This separation helps manage temporal data complexities and VVB verification workflows.
* **Use Excel-First Design for Collaboration and Clarity**\
  Define schema additions in Excel sheets before import, allowing team reviews and feedback at each stage, reducing rework and enhancing shared understanding.
* **Employ Semantic Versioning**\
  Increment versions for every schema update, marking breaking changes distinctly. This helps track schema history and supports backward compatibility checks.
* **Test Frequently at Each Increment**\
  Validate each schema addition in Guardian’s testing environment using a mix of default and edge-case test data. Fix validation gaps, refine user experience, and verify all conditional logic before proceeding.
* **Manage Field Key Naming Consistently**\
  Assign meaningful, calculation-friendly field keys early and maintain consistency across increments to simplify later code maintenance and formula writing.
* **Incorporate Advanced Features Last**\
  After core and monitoring schemas are stable, introduce advanced functions like API schema management, auto-calculated fields, UUID management, and integration with policy workflows.
* **Document Incremental Changes Clearly**\
  Maintain change logs to communicate additions, removals, or modifications in each schema version to stakeholders and downstream systems.
