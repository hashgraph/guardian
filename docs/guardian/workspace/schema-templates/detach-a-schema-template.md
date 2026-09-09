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
* The policy is a draft with an applied schema template.

### Steps

1. Open the draft policy with the applied template.
2. Select **Detach Schema Template**.
3. Review the removal warning.
4. Confirm the detachment.

### Result

The policy retains its schema copies. The template metadata and binding are removed. The schemas become editable.

### Troubleshooting

**Why is Detach Schema Template unavailable?**

Only draft policies with an applied template can be detached.

**Why can't I delete a schema?**

The schema belongs to an applied template. Detach the template first. The copied schema then becomes independent and editable.

### Related

* Concept: [Schema Templates Concept](./)
