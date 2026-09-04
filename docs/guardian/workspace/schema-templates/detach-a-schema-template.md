---
description: Remove a schema template binding from a draft policy.
tags:
  - tasks
---

# Detach a Schema Template

Detach a template when the policy needs independent schemas. See [Schema Templates Concept](./).

### Prerequisites

* You are signed in as a Standard Registry user.
* You can manage draft policies.
* The policy is a draft with at least one applied schema template.

### Steps

1. Open the draft policy with the applied template.
2. Open the **Schema Templates** submenu on the policy row.
3. Select **Detach: \<template name\>** for the binding you want to remove. If more than one template is applied, each has its own Detach action, and only the selected one is affected.
4. Review the removal warning.
5. Confirm the detachment.

### Result

The policy retains its schema copies. The template metadata and binding for that template are removed. The schemas become editable. Any other applied templates are untouched.

### Troubleshooting

**Why is Detach unavailable?**

Only a draft policy with at least one applied template shows the **Schema Templates** submenu.

**Why can't I delete a schema?**

The schema belongs to an applied template. Detach that template first. The copied schema then becomes independent and editable.

**Why is re-applying the same template rejected after I detached it?**

Detach does not delete the copied schemas - it only removes the template's restrictions from them. They stay in the policy under their original names. Applying the same template again would try to copy schemas under those same names, so it is rejected until you rename or delete the leftover schemas (or keep them and apply a different template instead).

### Related

* Concept: [Schema Templates Concept](./)
