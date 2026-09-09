# Schemas

A Schema in Guardian is a structured data definition that describes the format, attributes, and validation rules for Verifiable Credentials (VCs) and Verifiable Presentations (VPs) within policies and methodologies.

Schemas ensure that all participants (Standard Registries, Project Developers, Auditors, Validators, Buyers, etc.) use a common, consistent, and machine-readable structure when exchanging sustainability-related data on the Hedera network.

#### **Key Characteristics of Schemas**

1. **Standardized Data Model**
   * Defines the fields, data types, and relationships for a specific entity (e.g., a project description, monitoring report, or carbon credit issuance record).
   * Guarantees interoperability across policies, methodologies, and different Standard Registries.
2. **Validation Rules**
   * Enforces constraints like required fields, value ranges, or enumerations.
   * Ensures data integrity and consistency before being issued on-chain.
3. **Reusability**
   * Once published, schemas can be reused across multiple policies and methodologies.
   * Promotes standardization across ecosystems (e.g., all carbon projects may use the same Emission Reduction Schema).
4. **Version Control**
   * Schemas are versioned, enabling updates or modifications without breaking existing data structures.
   * Allows migration from old to new schema versions when standards evolve.

#### **Types of Schemas in Guardian**

* **System Schemas** → Provided by Guardian (for core functions like DID, VP, VC, token definitions).
* **Custom Schemas** → Defined by Standard Registries or methodology authors for their specific workflows (e.g., Project Registration Schema, Monitoring Report Schema).
* **Policy-bound Schemas** → Linked directly to a policy to structure its credentials and reports.
