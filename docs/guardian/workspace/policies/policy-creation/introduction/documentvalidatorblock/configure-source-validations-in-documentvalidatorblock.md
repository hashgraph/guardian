---
tags:
  - tasks
---

# Configure Source Validations in documentValidatorBlock

Add one or more Source Validation entries to a `documentValidatorBlock` to make a policy step verify that a related document already exists in the Guardian database before allowing the workflow to continue.

### Prerequisites

* You have a policy open in edit mode.
* The policy contains a `documentValidatorBlock`, or you are about to add one.
* You know the schema names of the documents you want to validate against (visible in the Schemas section of the policy configuration).

### Steps

#### Add a Source Validation entry

1. Click the `documentValidatorBlock` in the policy canvas to open its configuration panel.
2. Scroll to the **Source Validations** section and click **Add Source Validation**.
3. In the new entry, open the **Source Collection** dropdown and select **VcDocument** or **VpDocument** depending on the type of documents you are querying.
4. (Optional) Open the **Schema** selector and choose the schema the source documents must match. Leave empty to query all documents in the collection.
5. (Optional) Enable any combination of the four ownership and assignment checkboxes:
   * **Only Own Documents** — restricts results to documents owned by the current user.
   * **Only Own by Group Documents** — restricts results to documents owned by the current user's group.
   * **Only Assigned Documents** — restricts results to documents assigned to the current user.
   * **Only Assigned by Group Documents** — restricts results to documents assigned to the current user's group.
6. (Optional) Enter a **Fail Message**. This text appears at the start of the error message when this entry fails. Use it to explain the business rule being enforced (e.g., `An approved project registration must exist before submitting a monitoring report.`).

#### Add Source Filters

Source Filters narrow which documents the block retrieves from the database. Add a filter for each field on the source document that must match a specific value or a value from the incoming document.

7. Inside the entry, expand **Source Filters** and click **Add Filter**.
8. Set **Field** to the JSON path of the field on the source document (e.g., `status`). Use the document-path picker to browse available fields.
9. Select an **Operator**: `equal`, `not_equal`, `in`, `not_in`, `gt`, `gte`, `lt`, or `lte`.
10. Set **Value Type**:
    * **Value** — compare against a literal string you enter directly.
    * **Variable** — compare against a field from the incoming document; enter the path using the document-path picker (e.g., `credentialSubject.0.projectId`).
11. Enter or select the comparison **Value**.
12. Repeat steps 7–11 for each additional filter.

#### Add cross-document Conditions

Conditions test relationships between fields on the queried source documents and fields on the incoming document. At least one source document must satisfy all conditions for the entry to pass.

13. Inside the entry, expand **Conditions** and click **Add Condition**.
14. Configure the **left side** of the condition:
    * Set **Left Source** to **Input Document**, **Source Document**, or **Value**.
    * If you selected a document source, enter the field path using the document-path picker. If you selected **Value**, enter a literal string.
15. Select an **Operator**.
16. Configure the **right side** of the condition using the same approach as step 14 (**Right Source** and the right-side field or literal).
17. Repeat steps 13–16 for each additional condition.

#### Add more Source Validation entries

18. To enforce multiple independent cross-document checks, click **Add Source Validation** again and repeat steps 3–17 for each entry. All entries must pass for the block to succeed.

#### Save

19. Click **Save** in the configuration panel.

### Result

When the policy executes this block, it processes each Source Validation entry in order. For each entry the block queries the database using the schema, ownership flags, and Source Filters you configured. It then tests each returned document against the Conditions. If at least one source document satisfies all conditions, the entry passes and execution continues to the next entry. If no source document satisfies all conditions — or the query returns no results — the block emits a `BlockActionError` with a detailed message listing which conditions failed and on how many candidate documents. The event is routed to the `ErrorEvent` output.

### Troubleshooting

**"No source documents found" error on every submission.** The query returned zero results. Check that the selected schema matches documents that actually exist in the policy's context, that the ownership/assignment flags match how those documents were created, and that each Source Filter field path is correct.

**Conditions fail even though the expected source document exists.** The error message lists the field name, operator, and values for each failing condition. Confirm that the field paths on both sides resolve correctly — use the document-path picker rather than typing paths manually. Also confirm that the value types are set to **Variable** (not **Value**) when you intend to compare against a field on the incoming document.

**An entry passes when it should fail.** Remember that the pass condition is "at least one source document satisfies all conditions." If multiple source documents match the query and one of them happens to satisfy the conditions, the entry will pass. Add more restrictive Source Filters to narrow the candidate set (e.g., filter documents by `projectId`).

### Related

* Concept: [Document Validator Block Source Validations](document-validator-block-source-validations.md)
* Reference: [documentValidatorBlock](./)
