# Cross-Schema Conditions

A cross-schema condition lets a field in one referenced sub-schema control a field in a **different** referenced sub-schema on the same parent. The condition is defined on the parent schema that owns both sub-schema references.

### The problem it solves

Sub-schemas are designed to stay independent and reusable across policies. Sometimes a field in one sub-schema must determine a field in another sub-schema.

Without cross-schema conditions, the usual workaround is to merge schemas or duplicate fields on the parent. Both approaches reduce reuse and make maintenance harder.

Cross-schema conditions keep that relationship on the parent schema. Each sub-schema stays self-contained.

### How it works

A cross-schema condition uses the same `if/then/else` structure as a regular condition, with two key differences.

**The IF trigger is a nested field.** The `if` clause points to a leaf field inside one referenced sub-schema. The condition editor shows these fields grouped under each sub-schema name.

**THEN and ELSE target existing sub-schema fields.** The `then` and `else` branches point to fields that already exist inside referenced sub-schemas through **Sub-schema THEN** and **Sub-schema ELSE** targets.

When a branch is active, the target field appears in its sub-schema. When inactive, the field is hidden and must not appear in the submitted document.

Guardian compiles this into a standard JSON Schema `if/then/else` block on the parent schema. It uses nested `required` rules and `false` property constraints.

### Key distinctions

The condition belongs to the **lowest common ancestor**. This is the schema that references both the sub-schema containing the `if` field and the sub-schema containing the target field.

That placement keeps the sub-schemas independent. Neither sub-schema needs to know about the other.

### Related

* Task: [Configure Nested and Cross-Schema Conditions](configure-nested-and-cross-schema-conditions.md)
* Reference: [Conditional and Visibility Logic](../best-practices-to-implement-schema/conditional-and-visibility-logic.md)
* Concept: [Cross-Schema Conditions](./)
