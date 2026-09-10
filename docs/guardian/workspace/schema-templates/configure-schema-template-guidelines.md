---
description: Add schema and field notes that policy developers see after a template is applied.
tags:
  - tasks
---

# Configure Schema Template Guidelines

### Prerequisites

* The user has permission to update schema templates.
* A draft schema template exists.
* The schema template has at least one template schema.

### Steps

1. Open the Schema Templates grid.

   Select the template that should provide guidance to policy authors or reviewers.

2. Open the template configuration.

   The template configuration page shows template-level details, the schema list, selected schema settings, and selected field settings.

3. Select a schema.

   In **Selected schema settings**, use **Guidelines** to describe how the schema should be used after the template is applied. These notes can explain the intended data source, review expectations, naming conventions, or any methodology-specific guidance.

4. Select a field.

   In the field settings panel, use **Guidelines** under **Can edit selected field** to describe how the field should be filled, reviewed, or interpreted.

5. Save the template configuration.

   The guidelines are stored in the template configuration with the schema and field restrictions.

6. Apply the schema template to a draft policy.

   Guardian copies the template schemas into the policy and stores the current template configuration in the policy snapshot.

7. Open the policy schema editor.

   Schema guidelines appear with the schema properties. Field guidelines appear in the selected field panel.

### Result

The applied policy shows the template author's schema and field guidance while keeping the existing template restrictions. Exported and imported templates keep the guidelines because they are part of the template configuration.

### Related

* Concept: [Schema Templates](./)
* Task: [Create a Schema Template](create-a-schema-template.md)
* Task: [Apply a Schema Template](apply-a-schema-template.md)
