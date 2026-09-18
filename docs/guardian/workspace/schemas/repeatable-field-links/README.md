---
tags:
  - concept
  - tag: new
    primary: true
---

# Repeatable Field Links

A repeatable field — a field with **Allow multiple answers** enabled — lets a user add as many entries as they need. Repeatable field links tie those entries to the entries of other repeatable fields, so every entry carries its own, separate set of related fields — including fields that live in other schemas of the same document.

#### The problem it solves

When a policy document tracks several parallel subjects — locations, activities, or measurement periods — each subject needs its own set of related data. Without linked fields, a user would have to manage that relationship manually, and the form has no way to enforce that each subject's data stays grouped together.

Repeatable field links enforce the one-to-one pairing automatically. A user adds one entry to the source field, and every linked field gains a matching entry. The entries stay paired through the entire lifecycle of the form.

#### How it works

When a policy is being filled in:

* Adding an entry to the source field creates a matching entry in every linked field. Linked fields have no manual add or remove buttons — they always follow the source.
* Each entry is labelled with the display name chosen during schema configuration, so entries are easy to identify.
* Fields marked as **Copied values** arrive filled and read-only in the linked entry.
* Removing a source entry prompts for confirmation, then removes its matching entry from every linked field. The remaining entries keep their own values.

Because the entries are paired one-to-one, conditions are also evaluated per entry. The same field can be shown in one entry and hidden in another, depending on the values each entry holds.

**Adding entries**

Add the source entries — here, two project locations:

Each location is its own block with its own fields:

Each linked section then gets a matching entry, labelled by the display name, with copied fields filled and read-only:

**Different fields for each entry**

Each entry runs its conditions independently. The first location chose _Quantification Approach 3_ — its monitoring card expands and shows the conditional fields:

The second location chose _Quantification Approach 1_ — the same card hides those fields:

#### Key distinctions

* **Cross-schema links are supported.** A dependent field can live in a different schema of the same document, not just in the same schema as the source.
* **Chains are supported.** A dependent field can itself be a source for another field, forming a group of any depth.
* **One source, many dependents.** A single source field can drive several dependent fields at once.
* **Conditions work with nested fields.** In the When clause, fields inside a repeatable group are available as a trigger — and the condition is evaluated independently for each entry.

#### Related

* Task: [Set up repeatable field links](set-up-repeatable-field-links.md)
