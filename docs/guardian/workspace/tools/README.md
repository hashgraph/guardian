---
description: Reusable policy components that encapsulate specialized policy logic.
---

# Tools

Tools are reusable policy components for specialized policy logic. They encapsulate blocks, events, and schemas behind a defined external interface.

Use tools to standardize a capability across policies. A policy references a tool without exposing its internal implementation.

### The problem tools solve

Tools keep reusable logic consistent across policy implementations. They also protect the tool's internal blocks, events, and schemas from unintended changes.

### How tools work

Tools expose variables and input or output events. Policies use these interfaces to provide configuration and exchange data with the tool.

Tool schemas are embedded within the tool. A policy can use those schemas when it includes the tool.

Tools can contain other tools. This supports layered implementations for complex methodologies.

### Key distinctions

Tools and modules both encapsulate reusable policy logic. Tools remain isolated and are referenced by policies. Their internal implementation is not directly editable from the policy using them.

Published tools are immutable. Standard Registries can configure only the tool's exposed interfaces.

### Related

* Reference: [Tools Reference](tools-using-ui.md)
* Concept: [Modules](../modules/)
* Concept: [Policy Configurator](../policies/policy-creation/policy-configurator.md)
