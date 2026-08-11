---
tags:
  - concept
---

# Workspace

The Workspace navigation section of the Guardian is where you build and manage everything that defines a policy — the schemas, policy logic, artifacts, tools, and modules you create and would take with you if you exported that policy.

### Reference

Workspace is organized into the building blocks of a policy, grouped under **Manage**:

* **Policies** — the set of rules, roles, workflows, and data-handling logic that governs how credentials, attestations, and reports are issued, verified, and used within a methodology or project.
* **Schemas** — structured data definitions that describe the format, attributes, and validation rules for the Verifiable Credentials and Presentations used within a policy.
* **Schema Rules** — validation logic that checks whether values entered into a schema's fields fall within acceptable ranges, using formulas or conditional (if/then/else) logic sourced from any field in the policy.
* **Schema Templates** — standalone entities that own a set of schemas and locking rules outside any policy, so a policy can apply a template, get policy-local copies of its schemas, and stay in sync as the template evolves.
* **Artifacts** — JSON files that represent a policy's or workflow's structure: rules, conditions, actions, parameters, and metadata.
* **Tools** — component-based, standardized pieces of policy logic, linked to policies by reference rather than fully embedded, with restricted editability and the ability to nest other Tools.
* **Modules** — encapsulated, independently-operable units of functionality that can be combined to build policies, workflows, and other system capabilities.
* **Formulas** — human-readable views of a policy's calculation logic, mapping the math variables in a formula back to the schema and document fields they represent.&#x20;

Each of these lives inside Workspace because it's something you directly author, edit, and own as part of building a policy — not something the platform manages on your behalf.

### Related

* [policies](policies/ "mention")
* [schemas](schemas/ "mention")
* [tools](tools/ "mention")
* [modules](modules/ "mention")
* [artifacts](artifacts/ "mention")
