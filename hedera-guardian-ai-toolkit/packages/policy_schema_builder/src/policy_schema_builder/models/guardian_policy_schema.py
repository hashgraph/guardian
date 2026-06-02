from enum import StrEnum
from typing import Annotated, Literal, Union

from pydantic import (
    AfterValidator,
    BaseModel,
    Field,
    ValidationInfo,
    model_serializer,
    model_validator,
)


class YesNo(StrEnum):
    """Enum for Yes/No fields"""

    YES = "Yes"
    NO = "No"


FieldType = Literal[
    "Enum",
    "Number",
    "Integer",
    "String",
    "Pattern",
    "Boolean",
    "Date",
    "Time",
    "DateTime",
    "Duration",
    "URL",
    "URI",
    "Email",
    "Image",
    "Help Text",
    "GeoJSON",
    "Prefix",
    "Postfix",
    "HederaAccount",
    "Auto-Calculate",
    "File",
]


class SchemaType(StrEnum):
    """Enumeration of schema types"""

    VERIFIABLE_CREDENTIAL = "Verifiable Credentials"
    # ENCRYPTED_VERIFIABLE_CREDENTIAL = "Encrypted Verifiable Credential"
    SUB_SCHEMA = "Sub-Schema"
    TOOL_INTEGRATION = "Tool-integration"


class SchemaReference(BaseModel):
    """Reference to another existing schema"""

    unique_schema_name_ref: str = Field(
        description="Unique name of the referenced guardian policy schema"
    )


class EnumOptions(BaseModel):
    """Enum options for fields with field_type='Enum'"""

    unique_name: str = Field(description="Unique name of the enum")
    options: list[str] = Field(description="List of enum options")


ExtendedFieldType = Annotated[
    SchemaReference | FieldType,
    Field(
        description="""
            Either a basic field type or a reference to another sub schema.
                - If it is "Enum" - EnumOptions must be provided in 'parameter' field!.
                - If it is "Help Text" - Should be automatically listed as a section heading describing a group of subsequent questions, the text must be inside "question" field. HelpTextStyle can be provided in 'parameter' field!.
                - If it is a "Prefix" or "Postfix" - the symbol must be provided in 'parameter' field!.
                - If it is "Pattern" - the regular expression must be provided in 'parameter' field!.
        """
    ),
]


class HelpTextStyle(BaseModel):
    size: int | None = Field(
        18,
        description="Size of the helper text",
    )
    bold: bool = Field(False, description="Whether the helper text is bold")
    color: str | None = Field(
        "#000000",
        description="Color of the helper text in HEX format",
    )

    @model_serializer(mode="wrap", when_used="json")
    def exclude_false_fields(self, serializer):
        """Exclude fields with False values from JSON serialization"""
        data = serializer(self)
        # Remove fields that have False values
        return {k: v for k, v in data.items() if v is not False}


# Parameter – additional field for information relevant for some data types.

# Possible values:
# Enum – list of possible options (EnumOptions)
# Pattern – regular expression
# Help Text – text style
# Prefix – symbol
# Postfix – symbol
# https://docs.guardianservice.io/technical-information/users/standard-registry-users-schemas-and-policies/policies/import-export-from-excel/import-and-export-excel-file-user-guide?q=+non-data+field#id-1.3-template
Parameter = Annotated[
    str | EnumOptions | HelpTextStyle,
    Field(
        default="",
        description="Enum options, calculation parameters, or additional metadata relevant to the field type",
    ),
]


class FieldReference(BaseModel):
    field_key_ref: str = Field(description="Reference to a certain field by its key")


class ConstantValue(BaseModel):
    value: str = Field(
        description="Constant primitive value. (if field_key_ref refers to an 'Enum' field, the value must match one of the defined options in EnumOptions)"
    )


BooleanExpression = Union["LogicalExpression", "ComparisonExpression"]


class LogicalExpression(BaseModel):
    operator: Literal["AND", "OR"]
    left: BooleanExpression
    right: BooleanExpression


class ComparisonExpression(BaseModel):
    operator: Literal["EQUAL"]
    left: FieldReference | ConstantValue
    right: FieldReference | ConstantValue


class VisibilityCondition(BaseModel):
    """Visibility condition for a schema field"""

    invert: bool = Field(False, description="If True, the logic result is inverted")
    condition: BooleanExpression


class SchemaField(BaseModel):
    """Represents a single field (column) in the schema"""

    required_field: YesNo = Field(
        description="Whether users must complete this field before submission (Yes/No)"
    )

    field_type: ExtendedFieldType

    parameter: Parameter

    visibility: VisibilityCondition | Literal["Hidden"] | Literal[""] = Field(
        "",
        description="Determines the visibility of the field for user. (either 'Hidden' or a condition object default is empty string meaning always visible)",
    )

    question: str = Field("", description="User-facing text that appears as the field label")
    allow_multiple_answers: YesNo = Field(
        description="Whether the field accepts multiple values (Yes/No)"
    )
    answer: str | None = Field(
        "",
        description="Example of the valid data shown to users. (if field type is Enum, should be one of the enum options)",
    )

    key: str = Field(
        description="Generated unique key for the field that reflects its semantic meaning (e.g., 'full_name' for 'What is your full name?')"
    )

    # TODO: find out what is the purpose?
    suggest: str | None = Field(
        "", description="Recommended value shown to guide users (usually equal to 'answer')"
    )

    default: str | None = Field(
        "",
        description="Pre-filled value that appears when users first see the field (usually equal to 'answer')",
    )

    @model_validator(mode="after")
    def set_default_help_text_style(self, _info: ValidationInfo):
        """Automatically fills parameter with default HelpTextStyle when field_type is 'Help Text' and parameter is not provided"""
        if self.field_type == "Help Text" and not isinstance(self.parameter, HelpTextStyle):
            # Set default HelpTextStyle if parameter is not already a HelpTextStyle object
            self.parameter = HelpTextStyle()
        return self


"""
Detailed info about Policy Schema Structure
https://docs.guardianservice.io/technical-information/users/standard-registry-users-schemas-and-policies/policies/import-export-from-excel/import-and-export-excel-file-user-guide#id-1.-import
"""


class MetadataBase(BaseModel):
    """Metadata section of Policy Schema Structure"""

    description: str = Field("", description="Description of the schema")
    schema_type: SchemaType = Field(
        SchemaType.VERIFIABLE_CREDENTIAL,
        description="Type of schema. For example:(Verifiable Credentials, Sub-Schema, or Tool-integration)",
    )


"""
Fields (Columns) for the Policy Schema Structure
https://docs.guardianservice.io/learn/methodology-digitization-handbook/part-iii-schema-design-and-development/chapter-9-project-design-document-pdd-schema-development#schema-template-structure
"""
SchemaFields = Annotated[
    list[SchemaField], Field(description="List of field definitions for the table")
]

SchemaName = Annotated[
    str, Field(description="Name of the schema (If the sheet exists, it will be replaced)")
]
# rename
"""
    Base Policy Schema Structure (No explicit validation present here like pattern checks etc.)
    The schema based on but with primitive values: https://docs.guardianservice.io/learn/methodology-digitization-handbook/part-iii-schema-design-and-development/chapter-9-project-design-document-pdd-schema-development
"""


class GuardianPolicySchema(BaseModel):
    """
    Represents the overall structure of a guardian policy schema.
    """

    schema_name: SchemaName
    metadata: MetadataBase
    schema_fields: SchemaFields


def validate_enum_fields_have_enum_options_parameter(
    guardian_policy_schemas: list[GuardianPolicySchema],
):
    """Validates that all Enum fields have EnumOptions in their parameter"""
    errors = []
    for schema in guardian_policy_schemas:
        for field in schema.schema_fields:
            if field.field_type == "Enum" and not isinstance(field.parameter, EnumOptions):
                errors.append(
                    f"Schema '{schema.schema_name}': Field '{field.key}' has type Enum but parameter is not EnumOptions"
                )

    if errors:
        raise ValueError("\n".join(errors))

    return guardian_policy_schemas


def validate_no_cyclic_subschema_references(
    guardian_policy_schemas: list[GuardianPolicySchema], info: ValidationInfo
):
    """Validates that there are no cyclic references in subschema relationships"""

    if info.context and info.context.get("skip_cyclic_subschema_references_validation"):
        return guardian_policy_schemas

    def detect_cycle(
        schema_name: str, visited: set[str], path: list[str]
    ) -> tuple[bool, list[str]]:
        """
        Detect cycles in schema references using DFS.

        Args:
            schema_name: Current schema name being explored
            visited: Set of all visited schema names in this path
            path: Current path of schema names

        Returns:
            Tuple of (has_cycle, cycle_path) where cycle_path shows the cyclic reference chain
        """
        if schema_name in visited:
            # Found a cycle - return the path from the repeated schema
            cycle_start_index = path.index(schema_name)
            return True, path[cycle_start_index:] + [schema_name]

        # Find the schema by name
        current_schema = None
        for schema in guardian_policy_schemas:
            if schema.schema_name == schema_name:
                current_schema = schema
                break

        if not current_schema:
            # Schema not found - this will be caught by another validator
            return False, []

        # Add to visited set and path
        visited.add(schema_name)
        path.append(schema_name)

        # Check all schema references in fields
        for field in current_schema.schema_fields:
            if isinstance(field.field_type, SchemaReference):
                ref_schema_name = field.field_type.unique_schema_name_ref
                has_cycle, cycle_path = detect_cycle(ref_schema_name, visited.copy(), path.copy())
                if has_cycle:
                    return True, cycle_path

        return False, []

    # Check each schema for cycles
    for schema in guardian_policy_schemas:
        has_cycle, cycle_path = detect_cycle(schema.schema_name, set(), [])
        if has_cycle:
            cycle_str = " -> ".join(cycle_path)
            raise ValueError(
                f"Cyclic subschema reference detected: {cycle_str}. "
                f"Schemas cannot reference each other in a circular manner."
            )

    return guardian_policy_schemas


def validate_all_schema_references_exist(
    guardian_policy_schemas: list[GuardianPolicySchema], info: ValidationInfo
):
    """Validates that all schema references point to existing schemas"""

    if info.context and info.context.get("skip_schema_to_subschema_reference_validation"):
        return guardian_policy_schemas
    schema_names = {schema.schema_name for schema in guardian_policy_schemas}

    # Collect all unlinked references: {schema_name: [(field_key, unlinked_ref), ...]}
    unlinked_refs: dict[str, list[tuple[str, str]]] = {}

    for schema in guardian_policy_schemas:
        for field in schema.schema_fields:
            if isinstance(field.field_type, SchemaReference):
                ref_schema_name = field.field_type.unique_schema_name_ref
                if ref_schema_name not in schema_names:
                    if schema.schema_name not in unlinked_refs:
                        unlinked_refs[schema.schema_name] = []
                    unlinked_refs[schema.schema_name].append((field.key, ref_schema_name))

    if unlinked_refs:
        raise FieldSchemaReferencesError(unlinked_refs)

    return guardian_policy_schemas


def validate_visibility_field_references(
    guardian_policy_schemas: list[GuardianPolicySchema], info: ValidationInfo
):
    """Validates that all field references in visibility conditions point to existing fields within the same schema"""

    # Skip validation if context flag is set (for Excel parsing where refs may cross schemas)
    if info.context and info.context.get("skip_visibility_validation"):
        return guardian_policy_schemas

    def extract_field_references(condition: BooleanExpression) -> set[str]:
        """Recursively extract all field key references from a boolean expression"""
        field_refs = set()

        if isinstance(condition, LogicalExpression):
            # Recursively extract from left and right
            field_refs.update(extract_field_references(condition.left))
            field_refs.update(extract_field_references(condition.right))
        elif isinstance(condition, ComparisonExpression):
            # Check left operand
            if isinstance(condition.left, FieldReference):
                field_refs.add(condition.left.field_key_ref)
            # Check right operand
            if isinstance(condition.right, FieldReference):
                field_refs.add(condition.right.field_key_ref)

        return field_refs

    for schema in guardian_policy_schemas:
        # Build set of all field keys in this schema
        schema_field_keys = {field.key for field in schema.schema_fields}

        # Check each field's visibility condition
        for field in schema.schema_fields:
            if isinstance(field.visibility, VisibilityCondition):
                # Extract all field references from the visibility condition
                referenced_field_keys = extract_field_references(field.visibility.condition)

                # Check if all referenced fields exist in the schema
                missing_keys = referenced_field_keys - schema_field_keys
                if missing_keys:
                    raise ValueError(
                        f"Schema '{schema.schema_name}': Field with key '{field.key}' has visibility condition "
                        f"that references non-existent field(s): {', '.join(sorted(missing_keys))}. "
                        f"Available fields in this schema: {', '.join(sorted(schema_field_keys))}"
                    )

    return guardian_policy_schemas


GuardianPolicySchemas = Annotated[
    list[GuardianPolicySchema],
    Field(description="List of guardian policy schemas"),
    AfterValidator(validate_enum_fields_have_enum_options_parameter),
    AfterValidator(validate_no_cyclic_subschema_references),
    AfterValidator(validate_all_schema_references_exist),
    AfterValidator(validate_visibility_field_references),
]


class FieldSchemaReferencesError(Exception):
    def __init__(self, unlinked_refs: dict[str, list[tuple[str, str]]]):
        """
        Args:
            unlinked_refs: Dictionary mapping schema_name to list of (field_key, ref_schema_name) tuples
        """
        self.unlinked_refs = unlinked_refs

        # Build detailed error message
        error_parts = []
        for schema_name, refs in unlinked_refs.items():
            refs_str = ", ".join(
                f"Field with key '{field_key}' to '{ref_schema}' schema"
                for field_key, ref_schema in refs
            )
            error_parts.append(
                f"Schema '{schema_name}' has fields referencing non-existent schemas: {refs_str}"
            )

        super().__init__("Unlinked schema references found:\n" + "\n".join(error_parts))


# DEPRECATED - use GuardianPolicySchemas directly
class GuardianPolicySchemaWithDefinitions(BaseModel):
    """Guardian Policy Schema container"""

    guardian_policy_schemas: GuardianPolicySchemas
