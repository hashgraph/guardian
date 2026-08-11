---
description: Apply a reusable schema template to a draft policy.
tags:
  - tasks
---

# Apply a Schema Template

### Prerequisites

* You are signed in as a Standard Registry user.
* You can manage draft policies and schema templates.
* The target policy is a draft without an applied template.

### Steps

1. Open the target draft policy.
2. Select **Apply Schema Template**.
3. Select the draft template or published template version.
4. Review the schemas and restrictions that will be copied.
5. Confirm the application.

### Result

The policy receives copies of the template schemas. The policy stores a template snapshot and binding.

### Troubleshooting

**Why is Apply Schema Template unavailable?**

The policy already has a template binding. Update the applied template instead. Detach the current template before applying a different template.

**Why can't the policy be published?**

The policy is linked to a draft schema template. Publish the template first. You can also detach the template from the policy.

**Why are locked field controls unavailable?**

The applied template locks that field. Update the field in the template. Then apply the template update to the policy. Detach the template to remove all restrictions.

**Why can't I add a field?**

The applied template disables custom fields for this schema. Enable **Can add custom fields** in the template. Then update the policy. Detach the template to remove the restriction.

### Related

* Concept: [Schema Templates Concept](./)
