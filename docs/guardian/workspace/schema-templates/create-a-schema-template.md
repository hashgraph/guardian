---
description: Create reusable schemas and restrictions for draft policies.
tags:
  - tasks
---

# Create a Schema Template

### Prerequisites

* The user is signed in as a Standard Registry user.
* The user has permissions to manage schema templates, schemas, and draft policies.
* A draft policy exists before applying a schema template.

### Steps

1.  Open the Schema Templates grid.

    The grid shows standalone schema template entities. It supports create, edit, import, export, publish, new version, delete, and filtering behavior consistent with Guardian grids.
2.  Create a draft schema template.

    The template gets its own topic and is stored independently from policies. Draft template content is stored in MongoDB. Published template content follows Hedera/IPFS publication flow.
3.  Open the template editor.

    The editor lets the user change the template name and description, create schemas for the template, and open template settings.
4.  Create template schemas.

    Schemas created inside the template are saved with `category = TEMPLATE`, `templateId`, stable `templateSchemaId`, and field-level `templateFieldId` values.
5.  Configure template restrictions.

    \
    The supported settings are:

* **Lock schema settings** (`schemaSettingsLocked`): locks schema name, description, and entity type.
* **Lock custom fields** (`customFieldsLocked`): prevents adding custom fields to the schema.
* **Lock custom conditions** (`conditionsLocked`): prevents adding new conditions. Add-only - it does not block editing or removing an existing condition.
* **Lock custom repeatable links** (`repeatableLinksLocked`): prevents adding new repeatable field links. Add-only - it does not block editing or removing an existing link.
* **Lock field editing** (`fields[fieldId].locked`): prevents editing and removing an individual template field.
  * Template-owned fields are locked by default; set `locked: false` explicitly to allow policy users to edit or remove the field.
* **Lock this condition** (`conditions[signature].locked`): prevents editing and removing an individual condition. Conditions are unlocked by default; set `locked: true` to lock one.
* **Lock this repeatable link** (`repeatableLinks[fieldId].locked`): prevents editing and removing an individual repeatable field link. Links are unlocked by default; set `locked: true` to lock one.
* **Guidelines** (`guidelines`): adds schema-level or field-level notes that are shown in the policy schema editor after the template is applied.

### Result

You have a draft schema template with reusable schemas and restrictions. You can apply it to an eligible draft policy.

### Troubleshooting

**Why can’t I edit a template field?**

The template restriction can lock individual fields. Update the restriction before editing the field.

### Related

* Concept: [Schema Templates Concept](./)
* Task: [Configure Schema Template Guidelines](configure-schema-template-guidelines.md)
* Task: [Apply a Schema Template](apply-a-schema-template.md)
* Task: [Import a Schema Template](import-a-schema-template.md)
