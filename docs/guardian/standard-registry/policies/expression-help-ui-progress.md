# Issue #4905 — Expression Help UI for Auto-Calculated Fields

## Status: Done

## Requirements (from issue)

| # | Requirement | Status | Notes |
|---|------------|--------|-------|
| 1 | Display tooltips listing supported parameters, functions, and variables | Done | Help icon tooltip + full help panel in editor dialog |
| 2 | Clarify whether cross-schema or policy-level parameters are permitted | Done | scopeNote text explains same-schema sibling fields only |
| 3 | Provide placeholder examples | Done | Multi-line placeholder, 11 examples in help panel |
| 4 | Include a help icon with function documentation | Done | `pi-question-circle` tooltip + collapsible help panel |
| 5 | Implement validation to flag unsupported field references | Done | Real JS execution matching backend engine |

## Definition of Done

| Item | Status | Notes |
|------|--------|-------|
| UI enhanced with placeholder code and example syntax | Done | |
| Help tooltip added with comprehensive function lists | Done | |
| Validation logic expanded to catch invalid references | Done | Uses `new Function()` matching backend |
| User guide documentation updated | Done | Progress doc with architecture decisions |
| Unit and integration tests added | Done | 2 spec files, 30+ test cases |
| No high-severity UI or calculation bugs present | Done | Regression fixed, validation verified |

## Key Decisions

### Backend uses raw JavaScript, not MathJS/FormulaJS

The auto-calculate expression engine (`policy-service/src/policy-engine/helpers/utils.ts:1781`) evaluates expressions as raw JS:

```js
const func = Function('table', `with (this) { return ${field.expression} }`);
return func.apply(document, [table]);
```

MathJS/FormulaJS are used in custom logic blocks but **not** in schema auto-calculate fields. The help UI documents only what the JS engine actually supports.

### Validation: real JS execution instead of regex parsing

Instead of manually parsing identifiers with regex and maintaining whitelists, the validator
compiles and executes the expression using the same `new Function('table', 'with (this) { return ... }')` pattern as the backend. This guarantees:

- Syntax errors are caught exactly as the backend would catch them
- Undefined functions (e.g. `SUM()`, `DATEDIF()`) produce real `TypeError` messages
- No false positives for valid JS constructs (arrow functions, IIFE, ternary, etc.)
- Unicode/Cyrillic field names work correctly

Mock document is built from `availableFields` (all set to `0`), and a mock `table` helper provides the same API as `buildTableHelper()`.

### Scope: same-schema fields only

- `document` is the current schema-level form submission
- No policy parameters or cross-schema data is injected
- Nested sub-schemas recurse into their own document slice — expressions only see sibling fields
- The `table` helper is the only injected parameter
- ExpressionScope UI indicators were removed — unnecessary since scope is always the same

### Dotted notation for nested schema fields

If a sibling field is a sub-schema (isRef), it becomes a nested object on `this`, so
`subSchema.fieldName` is valid JS and resolves at runtime. The validator supports this
because it executes real JS — mock document fields are set to `0` which is an object-coercible
value, so property access doesn't throw during validation.

### Independent scrolling for editor and help panel

The editor area and help panel scroll independently. The HTML structure separates them:
`.editor-area` (flex row) → `.context` (code, overflow-y: auto) + `.help-panel` (help, overflow-y: auto).
`.editor-area` has a fixed height (`calc(100vh - 435px)`) to constrain both children.

### Future: IDE-like autocomplete for nested fields

Currently the frontend does not have access to the field structure of nested schemas
(`schemaTypeMap` stores only `{ type: iri, isRef: true }`, not child fields).
This is out of scope for #4905 and should be tracked as a separate enhancement.

### What varies per schema vs what is hardcoded

- **Dynamic**: Available field names (sibling fields extracted from the form at runtime)
- **Hardcoded**: Operators, functions, table helper methods, examples, scopeNote — constant because the JS evaluation engine is the same everywhere

## Files Changed

| File | What changed |
|------|-------------|
| `frontend/.../code-editor-dialog/code-editor-dialog.component.html` | Help panel separated from editor for independent scrolling; inline hint removed |
| `frontend/.../code-editor-dialog/code-editor-dialog.component.ts` | Validation via real JS execution; help panel, forceSave support |
| `frontend/.../code-editor-dialog/code-editor-dialog.component.scss` | Independent scroll layout, help-toggle centering, scope styles removed |
| `frontend/.../code-editor-dialog/code-editor-dialog.component.spec.ts` | **New** — 25+ tests for validation, save, toggle, init |
| `frontend/.../code-editor-dialog/editor-help-context.ts` | Simplified — removed ExpressionScope interface |
| `frontend/.../schema-field-configuration/schema-field-configuration.component.html` | Help icon tooltip with JS syntax |
| `frontend/.../schema-field-configuration/schema-field-configuration.component.ts` | Help context: JS operators/functions, 11 examples, scopeNote |
| `frontend/.../schema-field-configuration/schema-field-configuration.component.spec.ts` | **New** — tests for getSiblingFieldNames, function existence, example validity |
| `frontend/.../common/models/lang-modes/formula-lang.mode.ts` | Performance: variable regex moved out of token(), text/plain backdrop |

## Bugs Found & Fixed

- **Regression: dotted notation rejected by validator** — Initial regex-based validation split identifiers on dots. Fixed by switching to real JS execution.
- **Incorrect function documentation** — Help panel listed MathJS/FormulaJS functions (SUM, IF, DATEDIF) that don't exist in the raw JS engine. Replaced with actual JS capabilities.
- **formula-lang mode performance** — Variable regex was recompiled inside `token()` on every keystroke. Moved to mode initialization.

## Known Issues (out of scope)

- **CodeMirror input lag** — Pre-existing issue on `develop`. Caused by `ngx-codemirror` running `ngZone.run()` on every keystroke, triggering full Angular change detection. Fix options: OnPush strategy, detach CD, or migrate to CodeMirror 6.
- **IDE-like autocomplete** — No autocomplete for nested schema field names after typing dot. Requires passing full schema field trees and implementing CodeMirror hint helper.
