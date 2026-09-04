---
description: Update a draft policy from its applied schema template.
tags:
  - tasks
---

# Update an Applied Schema Template

Update a draft policy after its template changes. See [Schema Templates Concept](./).

### Prerequisites

* You are signed in as a Standard Registry user.
* You can manage draft policies and schema templates.
* The policy is a draft with at least one applied schema template.

### Steps

1. Open the draft policy with the applied template.
2. Open the **Schema Templates** submenu on the policy row.
3. Select **Update: \<template name\>** for the binding you want to refresh. If more than one template is applied, each has its own Update action, and only the selected one is affected.
4. Review the comparison preview.
5. Resolve any reported schema or field conflicts.
6. Confirm the update.

### Result

The policy receives the selected template's changes. Its stored template snapshot updates for that binding only - any other applied templates and their schemas are left unchanged.

### Troubleshooting

**Why does the update report a conflict?**

The policy and selected template version changed / deleted the subschemas. Guardian cannot safely apply either change automatically.

In the comparison preview, choose which version to keep:

* Keep the deleted schemas in policy.
* Delete them.

Resolve every conflict before confirming the update.

### Related

* Concept: [Schema Templates Concept](./)
