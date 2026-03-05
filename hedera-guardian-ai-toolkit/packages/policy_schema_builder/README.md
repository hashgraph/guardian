# Policy Schema Builder Package

Policy Schema Builder is a Python package for creating and managing Guardian Policy Schemas using Excel files. It provides a high-level service for CRUD operations on schemas and fields, bidirectional conversion between Excel and JSON formats, and tools for visualizing schema structures. The main goal is to convert JSON-formatted schemas to Guardian-formatted Excel files.

## Features and Capabilities

### Excel Export

#### Supported Field Types

##### Basic Types
- `String` — Text input
- `Number` — Numeric values (decimals allowed)
- `Integer` — Whole numbers only
- `Boolean` — True/False values
- `Date`, `Time`, `DateTime` — Temporal values
- `Duration` — Time span
- `URL`, `URI`, `Email` — Validated links and email addresses
- `Image` — Image upload
- `File` — File upload
- `GeoJSON` — Geographic coordinates
- `HederaAccount` — Hedera account ID
- `Auto-Calculate` — Computed field

##### Special Types
- `Enum` — Dropdown selection (requires `EnumOptions` in `parameter`)
- `Pattern` — Regex-validated text (regular expression defined in `parameter`)
- `Help Text` — Section heading (styling defined in `parameter`)
- `Prefix` / `Postfix` — Formatted numeric values (symbol defined in `parameter`)

##### Nested Types
- `SchemaReference` — Reference to another schema (supports nested structures)

### Conditional Logic

Fields may define a `VisibilityCondition` to dynamically show or hide content based on other field values.

#### Supported Boolean Expressions

- **Equal**: `=EXACT(field_ref, value)`
- **And**: `=AND(condition1, condition2)`
- **Or**: `=OR(condition1, condition2)`
- **Not**: `=NOT(condition)`

#### Supported Arithmetic Operations

- **Add**: `=field_ref1 + field_ref2`
- **Subtract**: `=field_ref1 - field_ref2`
- **Multiply**: `=field_ref1 * field_ref2`
- **Divide**: `=field_ref1 / field_ref2`

#### Nested Expressions

```text
=AND(
    EXACT(field_ref1, value),
    OR(
        EXACT(field_ref2, value2),
        EXACT(field_ref3, value3)
    )
)
```

### Data Handling & Validation

- **Data Validation** — Built-in dropdown lists and validation rules for enum fields
- **Enum Sheets** — Separate sheets for enum definitions with proper linking
- **Nested Schemas** — Hierarchical sub-schemas with grouping and collapsible rows
- **Sheet References** — Hyperlinked references between related schemas

### Schema Management

- **CRUD Operations**: Insert, update, patch, and delete schema fields
- **Validation**: Automatic Pydantic validation of all schema data
- **JSON Persistence**: Save and load schemas from JSON files
- **Dependency Sorting**: Topological sorting of schemas based on references
- **Batch Operations**: Process multiple schemas and fields efficiently

### Visualization

- **Mermaid Diagrams**: Generate graph visualizations of schema relationships
- **Interactive Graphs**: Visual representation of schema hierarchies and dependencies

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Guardian Policy Schema                    │
│                      (Pydantic Models)                       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ├──► JSON Loader/Saver
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
         Schema Manager           Mapper (JSON → Excel)
         (CRUD Operations)               │
                                         │
                                         ▼
                              Excel Builder Parameters
                                         │
                ┌────────────────────────┼────────────────────┐
                │                        │                    │
                ▼                        ▼                    ▼
    Policy Schema Builder    Compound Excel Builder   Enum Builder
                │                        │                    │
                └────────────────────────┼────────────────────┘
                                         │
                                         ▼
                                   Excel File (.xlsx)
```

## Key Components

### Models (`models/`)

#### `guardian_policy_schema.py`

Defines the core data structures describing Guardian policy schemas:

**!!!Important note**: The descriptions of models in this file are used as a context for LLM to generate the corresponding JSON schemas; thus, they must be in a LLM-friendly format. Changing them will lead to a change in the quality of generation of schemas in the places used.

#### `excel_models.py`

Excel-specific models for defining the structure and styling of the generated Excel files. Used to decouple the Excel generation logic from the core schema definitions, allowing for more flexible and maintainable code.

### Builders

#### `policy_schema_builder.py`

Accepts the params defined in `excel_models.py` and builds the Excel sheets according to the defined structure and styling rules.
Includes support for:
- Row and cell styling
- Data validation
- Hyperlink support
- Nested row structures
- Formula integration

#### `enum_builder.py`

Creates enum definition sheets:
- Proper formatting
- Cell merging
- Value listing

#### `compound_excel_builder.py`

Accepts both parameters for `policy_schema_builder.py` and `enum_builder.py` to build a complete Excel file with multiple interlinked sheets:
- Manages multiple sheets
- Handles schema dependencies
- Creates enum sheets
- Sorts schemas based on references to ensure proper ordering in the Excel file

### Utilities

#### `mapper.py`

Maps Guardian schemas model from `guardian_policy_schema.py` to Excel builder parameters used in `compound_excel_builder.py`:

- Handles Excel's sheet long name limit
- Ensures uniqueness of sheet names based on schema names and references
- Adds postfixes for certain types of fields (e.g. enum fields)
- Converts schema fields to Excel rows
- Manages enum options

#### `expression_convertor.py`

Converts boolean expressions to Excel formulas:
- Supports AND, OR, EQUAL operators
- Arithmetic operations (ADD, SUBTRACT, MULTIPLY, DIVIDE)
- Cell references
- Nested expressions

##### Example

Field visible when (status == "Active" AND score > 80)

```json
{
    "operator": "AND",
    "left": {
        "operator": "EQUAL",
        "left": {"field_key_ref": "status"},
        "right": {"value": "Active"}
    },
    "right": {
        "operator": "EQUAL",
        "left": {"field_key_ref": "score"},
        "right": {"value": "80"}
    }
}
```

Converted to Excel: `=AND(EXACT(A10,"Active"),EXACT(B10,80))`

#### `utils.py`

Helper functions:
- `sort_guardian_policy_schemas()` - Topological sorting of schemas, used to sort schemas based on schema references hierarchy, ensuring that referenced schemas are defined before they are used.

##### Example

```python
Input:

Schema Sheet: Type-C Sub-Schema (Links to Another Root Schema)
Schema Sheet: Another Sub-Schema
Schema Sheet: Type-B Sub-Schema (References Type-C Sub-Schema)
Schema Sheet: Test Root Schema (References Type-A Sub-Schema)
Schema Sheet: Sub-Schema of Another Sub-Schema
Schema Sheet: Type-A Sub-Schema (References Type-B Sub-Schema)
Schema Sheet: Another Root Schema (Follows the same logic)

Output:

Schema Sheet: Test Root Schema (References Type-A Sub-Schema)
Schema Sheet: Type-A Sub-Schema (References Type-B Sub-Schema)
Schema Sheet: Type-B Sub-Schema (References Type-C Sub-Schema)
Schema Sheet: Type-C Sub-Schema (Links to Another Root Schema)
Schema Sheet: Another Root Schema (Follows the same logic)
Schema Sheet: Another Sub-Schema
Schema Sheet: Sub-Schema of Another Sub-Schema
```

### Core Service

#### `json_schema_manager_service.py`

Service layer for schema management, this is the main entry point for managing schemas for converting JSON to Excel and CRUD operations on schemas and fields:
- LLM-friendly error and warning reporting
- Insert fields at specific positions
- Patch existing fields
- Delete fields
- Add/remove schemas
- Batch operations with validation

**Common Validation Errors:**
- Duplicate field keys within a schema
- Missing required fields
- Invalid enum options
- Broken schema references
- Invalid conditional visibility expressions

**Warnings:**
- Orphaned schema references (schema no longer referenced)
- Unused enum definitions

### Visualization

#### `json_to_mermaid.py`

Generates Mermaid diagram format from schemas:
- Schema nodes (different styles for root/sub-schemas)
- Reference edges
- Field information
- CLI support

## Installation

```bash
cd packages/policy_schema_builder
poetry install
```

## Configuration

When used through the MCP server, the output directory is controlled by the `EXCEL_OUTPUT_DIR` environment variable (default: `./data/output`). This is set on the MCP server side — see [MCP Server Configuration](../hedera_guardian_mcp_server/README.md#configuration).

When used programmatically, pass `output_dir` to the `JSONSchemaManagerService` constructor.

For the end-user schema generation workflow with Claude Desktop, see [USER-GUIDE.md](../../docs/USER-GUIDE.md#schema-generation-workflow).

## Quick Start

Create a new Guardian Policy Schema and generate an Excel file:

```python
from policy_schema_builder.json_schema_manager_service import JSONSchemaManagerService
from policy_schema_builder.models import (
    GuardianPolicySchema,
    MetadataBase,
    SchemaField,
)

# Define a simple schema
schema = GuardianPolicySchema(
    schema_name="Project Registration",
    metadata=MetadataBase(
        description="Carbon credit project registration form",
        schema_type="Verifiable Credentials"
    ),
    schema_fields=[
        SchemaField(
            key="project_name",
            question="What is the project name?",
            field_type="String",
            required_field="Yes",
            allow_multiple_answers="No",
            answer="",
            parameter="",
            visibility="",
            default="",
            suggest=""
        ),
        SchemaField(
            key="project_type",
            question="Select project type",
            field_type="Enum",
            required_field="Yes",
            allow_multiple_answers="No",
            answer="Forestry",
            parameter={"unique_name": "ProjectTypes", "options": ["Forestry", "Renewable Energy", "Agriculture"]},
            visibility="",
            default="",
            suggest=""
        )
    ]
)

# Create service and generate files
service = JSONSchemaManagerService("project_schema", output_dir="./output")
service.create_new([schema])
excel_path = service.create_excel()

print(f"Excel file created: {excel_path}")
```

## Usage

The `JSONSchemaManagerService` is the primary interface for managing Guardian policy schemas. It provides a high-level API for all operations.

### Initialization

```python
from policy_schema_builder.json_schema_manager_service import JSONSchemaManagerService

# Initialize with file name (extension optional)
service = JSONSchemaManagerService(
    file_name="my_policy_schema",  # or "my_policy_schema.json"
    output_dir="./data/output"     # optional, defaults to current directory
)
```

## API Reference

### JSONSchemaManagerService

Main service class for managing Guardian policy schemas.

#### Constructor

```python
service = JSONSchemaManagerService(file_name: str, output_dir: str = "")
```

- `file_name`: Name of the file; extension is optional and normalized to `.json` automatically. The same stem is used for the paired `.xlsx` file.
- `output_dir`: Directory for JSON/Excel files. Defaults to the current working directory.

**Example:**

```python
service = JSONSchemaManagerService("my_schema", output_dir="./schemas")
# Creates: ./schemas/my_schema.json and ./schemas/my_schema.xlsx
```

---

#### File Operations

- `get_raw() -> list[Any]` — Returns the raw JSON content of the schema file as a plain Python list, bypassing model validation. Useful for inspection or debugging.

- `create_new(guardian_policy_schemas: GuardianPolicySchemas) -> None` — Validates and writes an initial schema collection to the JSON file. Raises `FileExistsError` if the file already exists — use `clear()` first or choose a different file name.

- `clear() -> None` — Deletes both the `.json` and `.xlsx` files if they exist. Logs a warning for each file that is already missing. No error is raised.

- `create_excel() -> Path` — Loads the current JSON data, maps it through `GuardianPolicySchemaToCompoundExcelMapper`, builds the workbook via `CompoundExcelBuilder`, and saves it to `output_dir`. Overwrites an existing Excel file with a warning. Returns the full path to the created `.xlsx` file.

- `extend_with_schema(guardian_policy_schemas: GuardianPolicySchemas) -> None` — Appends a validated list of schemas to the existing file. Raises `SchemaAlreadyExistsError` if any incoming schema name duplicates an existing one or appears more than once within the input — no partial writes occur.

---

#### Schema Operations

- `get_all() -> GuardianPolicySchemas` — Loads and returns all schemas from the file as a fully validated `GuardianPolicySchemas` list.

- `list_schemas() -> list[GuardianPolicySchema]` — Alias for `get_all()`; returns all schemas.

- `list_schemas_short_info() -> list[SchemaShortInfo]` — Returns a lightweight summary of every schema: just `schema_name` and `metadata`. Useful for overview listings without loading all field data.

- `get_schema(schema_name: str) -> GuardianPolicySchema` — Returns the full schema object for the given name. Raises `SchemaNotFoundError` if not found.

- `add_schemas(schemas: list[GuardianPolicySchema]) -> list[GuardianPolicySchema]` — Adds multiple schemas in one call. Schemas whose names already exist are silently skipped (logged as warnings). Raises `SchemaAlreadyExistsError` if the input itself contains duplicate names. Returns only the schemas that were actually added.

- `remove_schemas(schema_names: list[str]) -> RemoveSchemasResult` — Attempts to remove each named schema. Each removal is validated against the full schema set before being committed — if validation fails (e.g. another schema's field still references the removed one), that schema is reverted and recorded as an error. Successfully removed schemas are saved immediately.
  - `RemoveSchemasResult.removed_schemas` / `removed_schema_names` — schemas that were successfully deleted.
  - `RemoveSchemasResult.errors` — schemas that could not be removed, each with a reason.
  - `RemoveSchemasResult.warnings` — emitted when a removed schema contained fields referencing other schemas that are now unreferenced anywhere (potential orphans).

---

#### Field Operations

- `get_field(schema_name: str, field_key: str) -> SchemaField` — Returns a single field by key. Raises `SchemaNotFoundError` or `FieldNotFoundError` if either lookup fails.

- `get_fields_by_keys(schema_name: str, field_keys: list[str]) -> list[SchemaField]` — Convenience wrapper that calls `get_field` for each key in order and returns the collected list. Raises on the first missing field or schema.

- `list_fields(schema_name: str) -> list[SchemaField]` — Returns all fields in a schema in their stored order. Raises `SchemaNotFoundError` if the schema doesn't exist.

- `list_fields_short(schema_name: str) -> list[FieldShortInfo]` — Returns a summary list of `(key, field_type, question)` for every field. Questions longer than 50 characters are truncated with `...`. Raises `SchemaNotFoundError` if the schema doesn't exist.

- `insert_field(schema_name: str, position: int, field: SchemaField) -> SchemaField` — Inserts a single validated `SchemaField` at the given zero-based position. A `position` of `-1` or beyond the current length appends to the end. Returns the inserted field.
  - Raises `SchemaNotFoundError` if the schema is missing.
  - Raises `FieldKeyAlreadyExistsError` if a field with the same key already exists.

- `insert_fields(schema_name: str, fields: list[dict], position: int = -1) -> InsertFieldsResult` — Inserts multiple fields starting at `position`. Each field is validated individually; failed insertions are reverted and recorded without blocking the others. Raises `SchemaNotFoundError` if the schema is missing, or `ValueError` if any field dict is missing the `key` attribute.
  - `InsertFieldsResult.inserted_fields` / `inserted_field_keys` — fields that were successfully inserted.
  - `InsertFieldsResult.errors` — fields that failed (duplicate key, validation error, etc.), each with a reason.

- `patch_fields(schema_name: str, field_updates: list[dict]) -> PatchFieldsResult` — Partially updates fields in a schema. Each dict must contain `key` (used to locate the field) plus any subset of field attributes to overwrite. Updates are applied one-by-one; if the full-schema validation fails after an update, that change is reverted. Raises `SchemaNotFoundError` if the schema is missing, or `ValueError` if any update dict lacks `key`.
  - `PatchFieldsResult.updated_fields` / `updated_field_keys` — fields that were successfully patched.
  - `PatchFieldsResult.errors` — fields that failed validation or were not found.
  - `PatchFieldsResult.warnings` — emitted when a patched field previously referenced a sub-schema that is now unreferenced anywhere (potential orphan).

- `remove_fields(schema_name: str, field_keys: list[str]) -> RemoveFieldsResult` — Removes fields by key. Each removal is individually validated; if the schema becomes invalid without that field (e.g. an Enum reference becomes inconsistent), the removal is reverted and recorded as an error. Raises `SchemaNotFoundError` if the schema is missing.
  - `RemoveFieldsResult.removed_fields` / `removed_field_keys` — fields that were successfully removed.
  - `RemoveFieldsResult.errors` — fields that could not be removed, each with a reason (including fields not found).
  - `RemoveFieldsResult.warnings` — emitted when a removed field referenced a sub-schema that is no longer referenced by anything else.

### CompoundExcelBuilder

Low-level builder for creating Excel files with multiple schemas.

```python
from policy_schema_builder.compound_excel_builder import (
    CompoundExcelBuilder,
    CompoundExcelBuilderParams,
)
from policy_schema_builder.models import (
    ExcelPolicySchemaParams,
    WorksheetNameParams,
    MetadataParams,
    FieldColumnParams,
)

params = CompoundExcelBuilderParams(
    excel_policy_schema_params=[...],  # List of ExcelPolicySchemaParams
    enum_params=[...],  # List of ExcelPolicyEnumBuilderParams
    worksheet_file_name="output.xlsx"
)

builder = CompoundExcelBuilder(params)
builder.build()
builder.save(output_dir="./output")
```

### GuardianPolicySchemaToCompoundExcelMapper

Converts Guardian Policy Schemas to Excel builder parameters.

```python
from policy_schema_builder.mapper import GuardianPolicySchemaToCompoundExcelMapper

compound_params = GuardianPolicySchemaToCompoundExcelMapper.map(
    guardian_policy_schemas,
    file_name="output.xlsx"
)
```

### Field Definition Example

```python
from policy_schema_builder.models import (
    SchemaField,
    EnumOptions,
    SchemaReference,
    VisibilityCondition,
    ComparisonExpression,
    FieldReference,
    ConstantValue,
)

# Enum field with options
enum_field = SchemaField(
    key="country",
    question="Select your country",
    field_type="Enum",
    required_field="Yes",
    allow_multiple_answers="No",
    answer="USA",
    parameter=EnumOptions(
        unique_name="Countries",
        options=["USA", "Canada", "UK", "Australia"]
    ),
    visibility="",
    default="",
    suggest=""
)

# Conditional field (visible only if country == "USA")
conditional_field = SchemaField(
    key="state",
    question="Select your state",
    field_type="String",
    required_field="No",
    allow_multiple_answers="No",
    answer="",
    parameter="",
    visibility=VisibilityCondition(
        condition=ComparisonExpression(
            operator="EQUAL",
            left=FieldReference(field_key_ref="country"),
            right=ConstantValue(value="USA")
        ),
        invert=False
    ),
    default="",
    suggest=""
)

# Nested schema reference
nested_field = SchemaField(
    key="project_details",
    question="Project details",
    field_type=SchemaReference(unique_schema_name_ref="Project Sub-Schema"),
    required_field="Yes",
    allow_multiple_answers="No",
    answer="",
    parameter="",
    visibility="",
    default="",
    suggest=""
)
```

## Exceptions

| Exception | When raised |
|---|---|
| `SchemaNotFoundError` | Schema name not found in the file |
| `FieldNotFoundError` | Field key not found within a schema |
| `FieldKeyAlreadyExistsError` | Inserting a field whose key already exists |
| `SchemaAlreadyExistsError` | Adding schemas with names that conflict with existing ones or with each other |
| `FileExistsError` (built-in) | Calling `create_new` when the JSON file already exists |

## Validation and Error Handling

All mutating operations (`insert_fields`, `patch_fields`, `remove_fields`, `remove_schemas`) re-validate the **entire schema collection** after each individual change using Pydantic. If validation fails, only that specific change is rolled back — other successful changes in the same call are kept and saved. Validation errors are returned in the result object rather than raised as exceptions, allowing partial success.

```python
# Field operations return result objects with errors
result = service.insert_fields("MySchema", [
    {"key": "field1", "field_type": "String", "question": "Q1", "required_field": "Yes", "allow_multiple_answers": "No"},
    {"key": "field1", "field_type": "Integer", "question": "Q2", "required_field": "No", "allow_multiple_answers": "No"}  # Duplicate key
])

if result.has_errors:
    for error in result.errors:
        print(f"Field '{error.field_key}': {error.message}")
        # Output: Field 'field1': Field with key 'field1' already exists in schema 'MySchema'

# Successfully inserted fields
print(f"Inserted: {result.inserted_field_keys}")
```

## Policy Schema Visualizer

Convert between Excel and JSON formats, and generate visualizations.

### Installation

Install additional dependency for interactive graph visualization:

```bash
poetry add networkx==3.6
```

> **Note:** `networkx` is only required for the `graph_interactive` visualizer. Excel-to-JSON conversion and Mermaid diagram generation work without it.

### Excel to JSON Conversion

Parse Excel file and convert to JSON schema:

```bash
cd packages/policy_schema_builder
poetry run python -m policy_schema_builder.policy_schema_visualizer.excel_to_json <path_to_excel_file> [output.json]
```

**Example:**

```bash
poetry run python -m policy_schema_builder.policy_schema_visualizer.excel_to_json ./schemas/project_schema.xlsx ./schemas/project_schema.json
```

### Interactive HTML Visualization

Generate interactive HTML graph showing schema structure and relationships:

```bash
poetry run python -m policy_schema_builder.policy_schema_visualizer.graph_interactive <path_to_json_file> [output.html]
```

**Example:**

```bash
poetry run python -m policy_schema_builder.policy_schema_visualizer.graph_interactive ./schemas/project_schema.json
# Creates: ./schemas/project_schema_visualization_interactive.html
```

The interactive graph includes:
- Schema nodes with field counts
- Field type indicators
- Enum references
- Nested schema relationships
- Conditional visibility paths

### Mermaid Diagram Generation

Generate Mermaid markdown diagram for documentation:

```bash
poetry run python -m policy_schema_builder.policy_schema_visualizer.json_to_mermaid <path_to_json_file> [output.md]
```

**Example:**

```bash
poetry run python -m policy_schema_builder.policy_schema_visualizer.json_to_mermaid ./schemas/project_schema.json
# Creates: ./schemas/project_schema_mermaid.md
```

Output can be rendered in GitHub, GitLab, or [Mermaid Live Editor](https://mermaid.live/).

## Testing

Run the policy_schema_builder tests:

```bash
# From repository root
pytest tests/policy_schema_builder/ -v

# Unit tests only (fast)
pytest tests/policy_schema_builder/unit/ -v

# Specific test file
pytest tests/policy_schema_builder/unit/test_json_schema_manager_service.py -v
```

**Test Structure:**

```text
tests/policy_schema_builder/
├── unit/
│   ├── test_json_schema_manager_service.py  # Service CRUD tests
│   ├── test_compound_excel_builder.py       # Excel generation tests
│   ├── test_enum_builder.py                 # Enum sheet builder tests
│   ├── test_expression_convertor.py         # Formula conversion tests
│   ├── test_guardian_policy_schema.py       # Model validation tests
│   ├── test_mapper.py                       # JSON-to-Excel mapping tests
│   ├── test_models.py                       # Data model tests
│   └── test_policy_schema_builder.py        # Schema builder tests
```

## Contributing

For development guidelines and contribution instructions, see [CONTRIBUTING.md](../../docs/CONTRIBUTING.md).

## License

MIT License - see [LICENSE](../../LICENSE) file for details.
