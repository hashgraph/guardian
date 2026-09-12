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

1. Open the **Policies** grid and find the draft policy with the applied template.
2. Select **Schema Templates** on that policy's row to open the management dialog.
3. In the **Applied templates** grid, select the detach action on the row you want to remove. If more than one template is applied, only the selected one is affected.
4. Choose what happens to the copied schemas:
   * **Keep the schemas** - they stay in the policy as ordinary schemas.
   * **Also delete the schemas** - they are permanently deleted. The dialog lists exactly which schemas will be deleted, and which will be kept because another schema in the policy still uses them.
5. Confirm the detachment.

### Result

The template metadata and binding for that template are removed. Any other applied templates are untouched.

If you chose **Keep the schemas**, every copy stays in the policy and becomes freely editable. If you chose **Also delete the schemas**, the copies are deleted except any that another policy schema still references - deleting those would leave that schema pointing at nothing, so they are kept and reported when the task finishes.

### Troubleshooting

**Why is Detach unavailable?**

The **Schema Templates** action itself is only enabled on a draft policy, and only for users who can update policies and read schema templates. Within the dialog, a detach action exists only for templates listed under **Applied templates**.

**Why was a schema not deleted even though I chose to delete the schemas?**

Another schema in the policy still has a sub-schema field pointing at it. Deleting it would leave that field referencing a schema that no longer exists, so it is kept instead. The detach dialog names these before you confirm, and the notification after the task repeats them. Remove or repoint the referencing field first if you really want the schema gone.

**Why can't I delete a schema?**

The schema belongs to an applied template. Detach that template first. The copied schema then becomes independent and editable.

**Why is re-applying the same template rejected after I detached it?**

By default detach only removes the template's restrictions; the copied schemas stay in the policy under their original names. Applying the same template again would try to copy schemas under those same names, so it is rejected until you rename or delete the leftover schemas. Choosing **Also delete the schemas** when you detach avoids this, as long as nothing else in the policy references them.

### Related

* Concept: [Schema Templates Concept](./)
