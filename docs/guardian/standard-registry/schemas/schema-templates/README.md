---
tags:
  - tag: new
    primary: true
  - concept
---

# Schema Templates

### The problem it solves

Policy authors often need to reuse the same schema standard across multiple policies. Without Schema Templates, each policy owns and maintains its schemas independently. This makes it hard to apply a shared standard, control which schema parts may be changed, and safely update policies when the standard changes.

Schema Templates solve this by introducing a standalone Guardian entity that owns schemas and template configuration outside a policy. A policy can apply a template, receive policy-local copies of the template schemas and keep template restrictions.

This supports:

* reusable schema standards across policies;
* schema and field restrictions enforced in both UI and backend;
* safe detach from a template without losing imported schemas;
* template versioning and update previews;
* policy import/export with the exact restrictions that were active at export time.

### How it works

A Schema Template is stored as its own entity with name, description, status, version, previous version, topic id, message id, owner, creator, and configuration.

Template schemas are regular Guardian schemas stored with `category = TEMPLATE`. They belong to the template through `templateId`. Each template schema has a stable `templateSchemaId`, and each template field has a stable `templateFieldId`. These identifiers are the logical reference used when schemas are copied to policies or compared across template versions.

Template configuration is a map keyed by template schema identity:

```json
{
  "schemas": {
    "template-schema-id": {
      "schemaSettingsLocked": true,
      "customFieldsLocked": false,
      "fields": {
        "template-field-id": {
          "locked": true
        }
      }
    }
  }
}
```

The configuration controls:

* **Change schema settings**: whether schema name, description, and entity type can be changed.
  * `schemaSettingsLocked: false` allows changes. `true` prevents them.
* **Can add custom fields**: lets policy users add custom fields to the schema.
  * `customFieldsLocked`: `false` allows custom fields, while `true` prevents them.
* **Can edit selected field**: whether an individual template field can be edited or removed.
  * `locked: false` allows edits or removal. `true` prevents them.
  * Template-owned fields are locked by default.

When a template is applied to a policy, Guardian copies the template schemas into the policy topic as `POLICY` schemas. The copied schemas keep `templateId`, `templateSchemaId`, and field-level `templateFieldId` metadata. Guardian also rewrites sub-schema references so copied policy schemas point to each other instead of the original template schemas.

Guardian then creates a policy-specific `SchemaTemplateSnapshot`. The snapshot is the source of truth for restrictions in the policy editor. This is important because draft templates can keep changing during development, while an already-applied policy should not change silently.

The policy stores a lightweight binding with template identity, snapshot id, state hash, apply timestamp, and a schema map from template schema ids to copied policy schema ids. Heavy snapshot content is stored in GridFS.

When a template is detached, Guardian removes the policy binding, deletes the snapshot, clears template metadata from schemas and fields, and keeps the imported schemas as normal editable policy schemas.

When an applied template is updated, Guardian compares:

* the current template selected by the user;
* the snapshot that was applied to the policy;
* the current policy schemas.

The update preview groups changes by schema and field. Locked template fields and locked schema settings are overwritten by the template. Allowed custom fields are preserved. Custom fields are removed when the new template configuration does not allow them. Removed template schemas with policy custom work require user resolution.

### Key distinctions

* Schema Templates are standalone entities, not only another schema category tab.
* Template schemas use `category = TEMPLATE`; copied policy schemas use `category = POLICY`.
* `templateSchemaId` identifies the logical template schema across copies and versions.
* `templateFieldId` identifies the logical template field across copies and versions.
* Policy editor locks come from the applied snapshot, not directly from the mutable template.
* Draft template changes do not automatically change already-applied policies.
* Published templates are immutable; changes require a new draft version.
* Detach keeps imported schemas but removes template restrictions.
* Template-owned policy schemas cannot be deleted before detach.
* A policy with an applied template shows Update Schema Template and Detach Schema Template instead of Apply Schema Template.
* A policy linked to a draft template or unresolved snapshot cannot be published.
* Policy import can link to a matching template, select a local template, or detach restrictions.

### Troubleshooting

**Why can't I delete a schema template?**

The template is used by one or more policies. Detach it from every listed policy. Then delete the template.

**Why can't a policy import link to its template?**

The referenced template is unavailable on this instance. In the import preview, select a matching local template. You can also detach template restrictions to continue.

### Related

* Task: [Create a Schema Template](create-a-schema-template.md)
* Task: [Apply a Schema Template](apply-a-schema-template.md)
* Task: [Update an Applied Schema Template](update-an-applied-schema-template.md)
* Task: [Detach a Schema Template](detach-a-schema-template.md)
* Task: [Import a Schema Template](import-a-schema-template.md)
* Task: [Export a Schema Template](export-a-schema-template.md)
* Guardian schemas documentation: [Schemas](https://guardian.hedera.com/guardian/standard-registry/schemas)
* Guardian policies documentation: [Policies](https://guardian.hedera.com/guardian/standard-registry/policies)
