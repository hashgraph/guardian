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

1. Open the **Policies** grid and find the draft policy with the applied template.
2. Select **Schema Templates** on that policy's row to open the management dialog.
3. In the **Applied templates** grid, select the update action on the binding you want to refresh. If more than one template is applied, only the selected one is affected.
4. Keep the currently bound template to refresh it, or pick a different template or version to switch the binding to it.
5. Review the comparison preview.
6. Resolve any reported schema or field conflicts.
7. Confirm the update.

### Result

The policy receives the selected template's changes. Its stored template snapshot updates for that binding only - any other applied templates and their schemas are left unchanged. If you switched to a different template, the binding now points at that template instead.

### Troubleshooting

**Why does the update report a conflict?**

The selected template version no longer contains a schema the policy still has a copy of, and Guardian will not guess what to do with that copy - particularly when it carries custom policy fields the template never had.

For each reported conflict, choose:

* **Keep as custom** - the copy stays in the policy as an ordinary schema, with the template's restrictions removed.
* **Remove** - the copy is deleted from the policy.

**Remove** is not offered for a schema that another schema in the policy still points at, because deleting it would leave that schema referencing something that no longer exists. Those conflicts show the referencing schemas and can only be resolved by keeping the copy.

Resolve every conflict before confirming the update.

**Why can't I switch to the template I picked?**

That template is already applied to this policy through another binding. A policy can hold a given template only once. Detach the other binding first, or pick a different template.

**Why was the update rejected because of schema names?**

The new template version renames a schema, or adds one, under a name another schema in the policy already uses. The error names every clash. Rename the conflicting policy schema, or detach the template that owns it, then run the update again.

### Related

* Concept: [Schema Templates Concept](./)
