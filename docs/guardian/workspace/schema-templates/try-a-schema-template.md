---
description: Try out a schema template's field and schema locks in a sandbox editor before applying it to a policy.
tags:
  - tasks
---

# Try a Schema Template

Trying a template opens a sandbox editor. It is separate from the **Builder / Preview** tabs on the schema configuration page and from policy [Dry Run](../policies/dry-run/README.md).

### Prerequisites

* You are signed in as a Standard Registry user.
* You can read schema templates.
* The template has at least one schema.

### Steps

1. Open the **Schema Templates** grid and select the target template to open its configuration page.
2. Select **Try Template** in the action bar, next to **Export**.
3. Browse the template's schemas in the sidebar, just like on the schema configuration page.
4. Try adding, editing or removing fields. Locked fields and schemas behave exactly as they would once the template is applied to a policy.
5. Select **Exit trial** to return to the template configuration page.

### Result

Nothing you do in the trial is saved. **Save all**, **Export**, **Publish**, **New Version**, **New schema** and schema deletion are all unavailable in trial mode - the page exists only to try out what applying the template would feel like. Closing or exiting the trial discards every change.

### Troubleshooting

**Why can't I save my changes?**

The trial page is a sandbox. It never calls save, publish, export or delete - it only shows how the template's current configuration would behave once applied. To make a real change, edit the template schema itself from its configuration page.

**Why don't I see the New schema button?**

Trial mode only shows the template's existing schemas. Add new schemas from the template configuration page instead.

### Related

* Concept: [Schema Templates Concept](./)
* Task: [Configure Schema Template Guidelines](configure-schema-template-guidelines.md)
