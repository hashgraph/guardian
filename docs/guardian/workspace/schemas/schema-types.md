---
description: Understand the five schema types used in Guardian.
---

# Schema Types

Schemas define the structure of data used in Guardian. They keep policy data consistent and machine-readable. Guardian organizes schemas by their owning context. Five schema types support policies, tools, modules, tags, and platform services.

#### The problem it solves

Without schema types, data ownership becomes unclear. Reusable components could require incompatible data structures.

#### How it works

Each schema type defines where its data is used. Guardian applies that structure across policies and reusable components.

* **Policy schemas:** Policy schemas define data used by a policy. They structure documents and credentials within its workflow. A policy can include multiple schemas. Each schema supports a specific workflow or data requirement.
* **Tool schemas:** Tool schemas are embedded in tools. They structure documents and credentials used by the tool. A policy can use tool schemas when it includes the tool. This keeps shared workflows consistent.
* **Module schemas:**  Module schemas define data required by reusable modules. A module exposes schema requirements through variables with the `schema` type. The selected schema provides the module's base data structure. This keeps module inputs consistent across policies.
* **Tag schemas:** Tag schemas define documents attached to tags. A tag requires a schema before it can collect structured document data. Use tag schemas when metadata must accompany a tag. See [Schema Tags](tag-schema/) for details.
* **System schemas** Guardian creates system schemas automatically when an account is created. They support core platform entities and workflows. System schemas are read-only by default. They cannot be edited or deleted.

#### Key distinctions

Policy schemas belong directly to a policy.&#x20;

Tool and module schemas belong to reusable components.

Tag schemas support tag metadata.&#x20;

System schemas support Guardian's core platform behavior.

#### Related

* Task: [Creating a Schema](creating-system-schema-using-ui.md)
* Reference: [Tools Reference](../tools/tools-using-ui.md)
* Concept: [Modules](../modules/)
