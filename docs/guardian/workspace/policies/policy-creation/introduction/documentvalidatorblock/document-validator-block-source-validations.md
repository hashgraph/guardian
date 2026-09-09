---
tags:
  - concept
  - tag: new
    primary: true
---

# Document Validator Block Source Validations

The Source Validations feature of `documentValidatorBlock` lets a policy step verify that a related document already exists in the Guardian database and that specific fields on that document satisfy conditions defined against the incoming document — before the workflow is allowed to proceed.

### The Problem It Solves

Many environmental MRV workflows depend on sequencing: a monitoring report is only valid after a project registration has been approved; an emission reduction claim must reference a methodology document that is already on record or search by projectID specific document and validate dates. Without a cross-document check at the block level, enforcing this ordering requires either a custom logic block or a manual review gate — all of which add complexity and introduce surface area for errors.

The Source Validations feature moves this responsibility into `documentValidatorBlock` itself. The block can query the Guardian database for documents that match a schema and ownership criteria, then test field-level conditions that span both the incoming document and the queried results, routing the event to the error output if the check fails.

### How It Works

A `documentValidatorBlock` can hold any number of Source Validation entries. Each entry is evaluated independently in order.

**Query phase.** The block builds a database filter from the entry's configuration:

* **Source Collection** — whether to query `VcDocument` or `VpDocument` records.
* **Schema** — restricts the query to documents that match a specific schema.
* **Ownership and assignment flags** — optionally limits results to documents owned by the current user, owned by their group, assigned to the user, or assigned to their group.
* **Source Filters** — field-level conditions on the source documents themselves (e.g. `credentialSubject.0.status` equals `Approved`). Each filter compares a source-document field to either a literal value or a field from the incoming document.

**Condition phase.** Once the query returns a set of candidate source documents, each one is tested against the entry's cross-document **Conditions**. A condition has two sides: each side can be a literal value, a path on the incoming document (`Input Document`), or a path on the candidate source document (`Source Document`). Supported operators are: `equal`, `not_equal`, `in`, `not_in`, `gt`, `gte`, `lt`, `lte`.

**Pass/fail semantics.** The entry passes if **at least one** candidate source document satisfies **all** conditions. If the query returns no documents, or every candidate fails at least one condition, the entry fails.

**Error reporting.** On failure the block constructs a detailed message describing which conditions failed and on how many source documents. If a custom Fail Message is set on the entry, it is prepended to the detail. The error is emitted as a `BlockActionError` that routes the event to the `ErrorEvent` output.

The full validation sequence for a document is:

1. Document existence check
2. Document type check (VC Document, VP Document, Related VC Document, Related VP Document)
3. Ownership checks (user or group)
4. Assignment checks (user or group)
5. Schema validation
6. Same-document Conditions (field conditions on the incoming document only)
7. Source Validations (cross-document, one entry at a time)

Any step that fails stops evaluation immediately and emits the error event.

### Key Distinctions

**Conditions vs. Source Validations.** The block has two separate condition mechanisms. The top-level **Conditions** array checks fields on the incoming document only — no database query is involved. **Source Validations** perform a database query and then compare fields across two documents. Use top-level Conditions for simple field checks; use Source Validations when the check depends on the state of another document.

**Source Filters vs. Source Validation Conditions.** Within a Source Validation entry, **Source Filters** narrow the database query (they affect which documents are candidates). **Conditions** test relationships between the candidate and the incoming document after the query returns. Filters reduce the candidate set; conditions determine whether any candidate in that set is sufficient.

**Pass if any, not pass if all.** The entry passes as soon as one candidate document satisfies all conditions. It does not require every queried document to satisfy the conditions.

### Related

* Task: [Configure Source Validations in documentValidatorBlock](configure-source-validations-in-documentvalidatorblock.md)
* Reference: [documentValidatorBlock](./)
