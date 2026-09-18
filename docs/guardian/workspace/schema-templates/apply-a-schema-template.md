---
description: Apply a reusable schema template to a draft policy.
tags:
  - tasks
---

# Apply a Schema Template

### Prerequisites

* You are signed in as a Standard Registry user.
* You can update policies and read schema templates. Without both permissions the **Schema Templates** action does not appear.
* The target policy is a draft. It may already have other templates applied - a policy can have more than one template at the same time, as long as each is applied once.

### Steps

1. Open the **Policies** grid and find the target draft policy.
2. Select **Schema Templates** on that policy's row to open the management dialog.
3. Find the draft template or published template version under **Available templates**. Use the search box to filter by name; each row shows the template's version and status.
4. Select the apply action on that row.
5. Confirm when asked whether to apply the template to this policy.

The copy runs as a background task. Its progress screen reports when the schemas have been created.

### Result

The policy receives copies of the template schemas. The policy stores a template snapshot and binding.

### Troubleshooting

**Why is the Schema Templates action greyed out?**

The policy is not a draft. Only draft policies can gain, update or lose a template.

**Why is the template I want missing from Available templates?**

**Available templates** lists only draft and published templates that are not yet applied to this policy. A template that is already applied appears under **Applied templates** instead, where you can update or detach it. If the list is empty, every template you can see is already applied.

**Why was the apply rejected because of schema names?**

Two schemas in one policy cannot share a name, and applying a template copies its schemas in under their template names. The error names every clash and distinguishes the two cases: schemas that belong to another applied template ("Detach that template first") from schemas the policy already owns ("Rename or delete them first"), so it never suggests a detach that would not help.

**Why can't the policy be published?**

The policy is linked to a draft schema template. Publish the template first. You can also detach the template from the policy.

**Why are locked field controls unavailable?**

The applied template locks that field. Update the field in the template. Then apply the template update to the policy. Detach the template to remove all restrictions.

**Why can't I add a field?**

The applied template disables custom fields for this schema. Enable **Can add custom fields** in the template. Then update the policy. Detach the template to remove the restriction.

### Related

* Concept: [Schema Templates Concept](./)
