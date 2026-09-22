---
description: Highlight a template schema so it stands out in schema lists and sorts first wherever it's listed.
tags:
  - tasks
---

# Mark a Schema as Featured

Featuring a schema highlights it with a star and pins it to the top of every schema list it appears in. Use it to call out the schemas policy authors are most likely to need from a template. See [Schema Templates Concept](./) for how the flag is stored and propagated.

### Prerequisites

* The user is signed in as a Standard Registry user.
* The user has permissions to manage schema templates.
* A draft schema template exists with at least one schema.

### Steps

1. Open the Schema Templates grid and open the template's editor.
2. Open the template's settings (the configuration step, not the schema editor).
3. Select a schema in the sidebar.
4. Click the star icon next to the schema name in the header.

   An outlined star means the schema is not featured. A filled, yellow star means it is. Clicking toggles between the two and marks the template as having unsaved changes.
5. Save the template.

   Saving writes `featured` into the template's configuration for that schema, and denormalizes it onto the schema itself as `templateFeatured`.

### Result

The schema shows a filled star, and sorts before non-featured schemas within the same topic, everywhere its template schemas are listed: the main Schemas grid (`/schemas`), the template editor's own schema sidebar, the template-scoped schema editor, and the policy schema editor for policies with this template applied. It also shows a filled star and sorts first in every policy configurator schema-picker dropdown (e.g. the Schema field on `Request VC Document`, `Document Validator`, and other blocks that let you select a schema), once the schema has been copied into the policy.

### Troubleshooting

**Why doesn't a policy's copy of the schema show as featured after I feature it in the template?**

Featuring a schema in the template does not push live to policies that already have the template applied - the same as every other template restriction. It takes effect the next time the template is applied to a new policy, or when an applied template is updated.

### Related

* Concept: [Schema Templates Concept](./)
* Task: [Create a Schema Template](create-a-schema-template.md)
* Task: [Apply a Schema Template](apply-a-schema-template.md)
* Task: [Update an Applied Schema Template](update-an-applied-schema-template.md)
