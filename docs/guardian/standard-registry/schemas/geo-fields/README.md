---
tags:
  - concept
---

# Geo Fields

Geo fields are three built-in string field types — **Country**, **Continent**, and **State/Province** — that let a schema author collect standardized geographic data backed by an ISO 3166 dataset. Each type exposes a searchable dropdown populated at runtime from the shared dataset; no enum list needs to be maintained in the schema itself.

Fields may be used independently or linked together into a cascading group. A linked group shares state: selecting a value in one field filters the options in related fields and auto-populates unambiguous ancestors in the same group.

### The problem it solves

Free-text or untyped enum fields for location data produce inconsistent values across documents — `"USA"`, `"US"`, `"United States"` all mean the same country but will not match in queries or validation. Maintaining an enum list in each schema duplicates data and drifts from the authoritative standard.

Geo fields give every schema the same consistent dataset without copying it into the schema. Stored values are ISO codes (`US`, `NA`, `US-CA`), so they match regardless of how the label is displayed.

### How it works

**Three separate types** correspond to three geographic levels. Country stores an ISO 3166-1 alpha-2 code. Continent stores a continent code (`AF`, `AN`, `AS`, `EU`, `NA`, `OC`, `SA`). State/Province stores an ISO 3166-2 subdivision code, or the subdivision name when no short code is defined.

**A dependency link** connects a child field to a compatible parent. The link is declared on the child field with a "Depends on" selector in the schema editor. Country may depend on Continent; State/Province may depend on Country or Continent. The link is stored in the field's `$comment` as `{ "dependency": { "on": "<parentKey>", "kind": "geo" } }`.

**Cascading runs in both directions.** Selecting a value filters descendants to only the options compatible with that value. Selecting a more specific value auto-populates its unambiguous ancestors. A user can start from any field in the group. All fields stay enabled and editable at all times.

**Backend validation is independent of the form.** When a document is submitted, the server checks that every geo field value exists in the dataset and that all linked fields are consistent with each other. A country and a continent that belong to different regions are rejected with a field-level error even if the document was constructed outside the form.

**Excel import and export** treat geo fields like any other field type. The `Field Type` cell uses the type name (`Country`, `Continent`, `State/Province`). The `Test Value`, `Default Value`, and `Suggest Value` cells accept and return human-readable display names for Country (`United States`) and Continent (`North America`). State/Province keeps its code in both directions (for example, `CA-ON` for Ontario), since subdivision names are not consistently standardized across locales the way country and continent names are. Excel's display names are a convenience layer for readability — the value stored in the document is always the underlying ISO code, regardless of which format Excel shows. If a child field has a parent declared in the editor, the parent field's key is written to the `Parameter` cell on export and read back on import.

### Key distinctions

* **Values are ISO codes, not labels.** The stored value is always a code (`US`), not a display name (`United States`). This keeps values stable when display names change across locales or dataset updates.
* **Cascading is bidirectional.** Choosing a parent filters children; choosing a child auto-populates a parent. No field is locked until another is filled.
* **Unlinked geo fields are independent.** A Country field with no "Depends on" works as a standalone lookup. Linking is always optional.
* **Validation requires a declared dependency group.** Backend consistency checks (country matches continent, state matches country) apply only to fields connected by an explicit dependency link. Unlinked geo fields in the same schema are validated individually against the dataset but not cross-checked against each other.

### Related

* Task: [Configure Geo Fields](configure-geo-fields.md)
