---
icon: triangle-exclamation
---

# Policy Warnings

### Overview

The Policy Warnings feature introduces structured validation feedback in the Guardian Policy Configurator (Editor).

It helps policy authors identify and address potential configuration issues, such as deprecated blocks or unreachable elements, directly within the editor.

At its core, this feature provides:

* Visual highlighting of blocks and elements with errors, warnings, or informational notes.
* Configurable message filtering by severity and category.
* Persistent local storage (using IndexedDB) of user preferences.
* Backend integration for policy validation via an extended /policies/validate API.
