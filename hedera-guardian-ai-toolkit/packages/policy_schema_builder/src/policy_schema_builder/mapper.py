import json
import logging
from typing import Any, Literal

from .compound_excel_builder import CompoundExcelBuilderParams
from .enum_builder import ExcelPolicyEnumBuilderParams
from .expression_convertor import CellReference, Expression, ExpressionLeaf, convert_to_excel
from .models import (
    ExcelPolicySchemaParams,
    FieldColumnParams,
    MetadataParams,
    WorksheetNameParams,
)
from .models.guardian_policy_schema import (
    BooleanExpression,
    ComparisonExpression,
    ConstantValue,
    EnumOptions,
    FieldReference,
    GuardianPolicySchema,
    GuardianPolicySchemas,
    HelpTextStyle,
    LogicalExpression,
    MetadataBase,
    SchemaFields,
    VisibilityCondition,
)
from .policy_schema_builder import ExcelPolicySchemaBuilder
from .utils import sort_guardian_policy_schemas

logger = logging.getLogger(__name__)


class SheetNameManager:
    """Manages unique sheet names respecting Excel's 31-character limit and naming rules."""

    def __init__(self):
        self._sheet_name_mapping: dict[str, str] = {}

    def _sanitize_name(self, name: str) -> str:
        if not name or not name.strip():
            return "Sheet"

        # Replace invalid characters with underscore
        invalid_chars = ["\\", "/", "?", "*", "[", "]", ":"]
        cleaned = name
        for char in invalid_chars:
            cleaned = cleaned.replace(char, "_")

        # Remove leading/trailing apostrophes and whitespace
        cleaned = cleaned.strip().strip("'")

        # Ensure not empty after cleaning
        if not cleaned:
            return "Sheet"

        # Remove trailing apostrophe again (in case of edge cases)
        cleaned = cleaned.rstrip("'")

        return cleaned if cleaned else "Sheet"

    def _get_unique_truncated_sheet_name(self, desired_name: str, max_length: int) -> str:
        # Sanitize the desired name first
        sanitized_name = self._sanitize_name(desired_name)

        # If the exact sanitized name already exists in our mapping, return the mapped name
        if desired_name in self._sheet_name_mapping:
            return self._sheet_name_mapping[desired_name]

        # Truncate to max length if needed
        truncated_name = sanitized_name[:max_length].rstrip(
            "'"
        )  # Remove trailing apostrophe after truncation

        # Check if any existing sheet name would collide with this truncated name.
        # Excel treats sheet names as case-insensitive, so compare lowercase.
        existing_truncated_names_lower = {v.lower() for v in self._sheet_name_mapping.values()}

        # If no collision, use the truncated name directly
        if truncated_name.lower() not in existing_truncated_names_lower:
            self._sheet_name_mapping[desired_name] = truncated_name
            return truncated_name

        # Collision detected - need to add index
        index = 1
        while True:
            # Calculate how much space we need for the suffix (underscore + index)
            suffix = f"_{index}"
            max_base_length = max_length - len(suffix)

            # Create indexed name
            indexed_name = f"{sanitized_name[:max_base_length]}{suffix}".rstrip("'")

            # Check if this indexed name is available (case-insensitive)
            if indexed_name.lower() not in existing_truncated_names_lower:
                self._sheet_name_mapping[desired_name] = indexed_name
                logger.info(
                    f"Sheet name '{desired_name}' sanitized/truncated and indexed to '{indexed_name}' "
                    f"due to collision after processing"
                )
                return indexed_name

            index += 1

    def get_unique_sheet_name(self, name: str, type: Literal["ENUM", "TOOL", "SCHEMA"]) -> str:
        """Get unique sheet name with type suffix."""
        if type == "ENUM":
            return self._get_unique_truncated_sheet_name(name, 23) + " (enum)"

        if type == "TOOL":
            return self._get_unique_truncated_sheet_name(name, 23) + " (tool)"

        return self._get_unique_truncated_sheet_name(name, 30).strip()


class GuardianPolicySchemaToCompoundExcelMapper:
    # DEFINE EXPECTED METADATA FIELDS WITH OPTIONAL VALUE RESTRICTIONS

    METADATA_DEFINITIONS: list[dict[str, Any]] = [
        {"source_key": "description", "key": "Description"},
        {
            "source_key": "schema_type",
            "key": "Schema Type",
            "value_restrictions": [
                "Verifiable Credentials",
                "Encrypted Verifiable Credential",
                "Sub-Schema",
            ],
        },
    ]

    # DEFINE EXPECTED COLUMNS IN THE EXCEL TABLE

    FIELD_MAPPING = {
        "required_field": "Required Field",
        "field_type": "Field Type",
        "parameter": "Parameter",
        "visibility": "Visibility",
        "question": "Question",
        "allow_multiple_answers": "Allow Multiple Answers",
        "answer": "Answer",
        "key": "Key",
        "suggest": "Suggest",
        "default": "Default",
    }

    # DEFINE EXPECTED COLUMNS IN THE EXCEL TABLE

    COLUMN_DEFINITIONS: list[FieldColumnParams] = [
        {"value": "Required Field", "width": 20.0, "value_restrictions": ["Yes", "No"]},
        {"value": "Field Type", "width": 40.0},
        {"value": "Parameter", "width": 20.0},
        {"value": "Visibility", "width": 15.0},
        {"value": "Question", "width": 70.0},
        {"value": "Allow Multiple Answers", "width": 30.0, "value_restrictions": ["Yes", "No"]},
        {"value": "Answer", "width": 50.0},
        {"value": "Default", "width": 30.0},
        {"value": "Suggest", "width": 30.0},
        {"value": "Key", "width": 30.0},
    ]

    @classmethod
    def _get_column_letter(cls, column_name: str) -> str:
        index = cls._get_column_index(column_name)
        return ExcelPolicySchemaBuilder.get_column_letter(index + 1)  # 1-based

    @classmethod
    def _map_metadata(cls, metadata: MetadataBase) -> list[MetadataParams]:
        """
        Map metadata using METADATA_DEFINITIONS with support for value_restrictions.
        """
        metadata_params = []
        for metadata_def in cls.METADATA_DEFINITIONS:
            source_key = metadata_def["source_key"]
            target_key = metadata_def["key"]
            value_restrictions = metadata_def.get("value_restrictions")

            value = getattr(metadata, source_key, "")

            metadata_params.append(
                MetadataParams(
                    key=target_key,
                    value=value,
                    value_restrictions=value_restrictions,
                )
            )
        return metadata_params

    @classmethod
    def _map_visibility_condition_refs_to_expression(
        cls,
        visibility_condition: VisibilityCondition,
        field_key_to_row_map: dict[str, int],
    ) -> Expression:
        def get_answer_row_index(field_key: str) -> str:
            column_letter = cls._get_column_letter("Answer")

            if field_key not in field_key_to_row_map:
                raise KeyError(f"Field key '{field_key}' not found in field_key_to_row_map")

            row_index = field_key_to_row_map[field_key]
            return f"{column_letter}{row_index}"

        def convert_boolean_expression(bool_expr: BooleanExpression) -> Expression:
            if isinstance(bool_expr, LogicalExpression):
                # Map AND/OR operators directly
                return Expression(
                    operator=bool_expr.operator,
                    left=convert_boolean_expression(bool_expr.left),
                    right=convert_boolean_expression(bool_expr.right),
                )
            if isinstance(bool_expr, ComparisonExpression):
                # Map EQUAL to EXACT
                return Expression(
                    operator=bool_expr.operator,
                    left=convert_operand(bool_expr.left),
                    right=convert_operand(bool_expr.right),
                )
            raise ValueError(f"Unknown boolean expression type: {type(bool_expr)}")

        def convert_operand(operand: FieldReference | ConstantValue) -> ExpressionLeaf:
            if isinstance(operand, FieldReference):
                # Look up the Excel reference from the values dictionary
                excel_ref = get_answer_row_index(operand.field_key_ref)

                return CellReference(cell_ref=excel_ref)
            if isinstance(operand, ConstantValue):
                # Return the value directly
                return operand.value
            raise ValueError(f"Unknown operand type: {type(operand)}")

        return convert_boolean_expression(visibility_condition.condition)

    @classmethod
    def _map_fields(
        cls,
        schema_fields: SchemaFields,
        other_schemas: list[GuardianPolicySchema],
        rows_start_index: int,
        field_key_to_row_map: dict[str, int],
        sheet_name_manager: SheetNameManager,
    ) -> list[list[str]]:
        """
        Map schema fields to table rows (list of lists).
        Each inner list contains cell values in the same order as COLUMN_DEFINITIONS.

        Args:
            schema_fields: Fields to map
            other_schemas: All schemas (for reference resolution)
            rows_start_index: Starting row index for this schema in Excel
            field_key_to_row_map: Mapping of field keys to their actual Excel row numbers
        """

        # Track current row offset as we process fields
        current_row_offset = rows_start_index

        def _create_cell_for_column(
            column_name: str,
            value: Any,
            field_type: str,
            field,
            enum_options: EnumOptions | None,
        ):
            """
            Create appropriate cell object based on column name and value type.

            Args:
                column_name: Name of the column being processed
                value: The raw value for the cell
                field_type: Type of the field (e.g., "Enum", "String")
                field: The original field object
                enum_options: EnumOptions if field_type is Enum

            Returns:
                Cell object or value to be added to the row
            """
            # Sheet reference handling for Enum parameter or sub-schema Field Type
            sheet_ref_unique_name = None
            sheet_ref_type = None
            if column_name == "Parameter" and field_type == "Enum":
                # Use field key as the identifier for enum sheet
                sheet_ref_unique_name = field.parameter.unique_name
                sheet_ref_type = "ENUM"
            elif column_name == "Field Type" and isinstance(value, dict):
                sheet_ref_unique_name = value.get("unique_schema_name_ref", "")
                sheet_ref_type = "SCHEMA"

            if sheet_ref_unique_name is not None:
                unique_sheet_name = sheet_name_manager.get_unique_sheet_name(
                    sheet_ref_unique_name, type=sheet_ref_type
                )
                return ExcelPolicySchemaBuilder.SheetRefCell(
                    title=unique_sheet_name,
                    sheet_name=unique_sheet_name,
                )

            # Help Text style handling - serialize HelpTextStyle to JSON string
            if column_name == "Parameter" and field_type == "Help Text" and isinstance(value, dict):
                return json.dumps(value)
            if column_name == "Answer" and field_type == "Enum" and enum_options:
                # For Enum field types, set value restrictions on the Answer cell
                return ExcelPolicySchemaBuilder.CellBase(value).set_value_restrictions(
                    enum_options.options.copy()
                )

            if column_name == "Answer" and field_type in ("Prefix", "Postfix"):
                # For Prefix/Postfix field types, apply custom number format with prefix/postfix symbol
                parameter_value = field_dict.get("parameter", "")
                if parameter_value:
                    cell_base = ExcelPolicySchemaBuilder.CellBase(value)
                    return (
                        cell_base.set_prefix_format(parameter_value)
                        if field_type == "Prefix"
                        else cell_base.set_postfix_format(parameter_value)
                    )

            if column_name == "Visibility" and isinstance(value, dict):
                visibility_condition: VisibilityCondition = field.visibility

                expression = cls._map_visibility_condition_refs_to_expression(
                    visibility_condition, field_key_to_row_map
                )

                excel_formula = convert_to_excel(expression, invert=visibility_condition.invert)

                return ExcelPolicySchemaBuilder.FormulaCell(excel_formula)
            # Default: return the value as string
            return ExcelPolicySchemaBuilder.CellBase(str(value))

        def _complete_row(row, enum_options: EnumOptions | None = None):
            for col_def in cls.COLUMN_DEFINITIONS:
                column_name = col_def["value"]
                # Find the source key that maps to this column name
                source_key = None
                for src_key, target_key in cls.FIELD_MAPPING.items():
                    if target_key == column_name:
                        source_key = src_key
                        break
                # Get the value from field_dict or empty string
                value = field_dict.get(source_key, "") if source_key else ""

                # Create appropriate cell using the extracted function
                cell = _create_cell_for_column(column_name, value, field_type, field, enum_options)
                row.add_cell(cell)

        field_rows = []
        for field in schema_fields:
            field_dict = field.model_dump(mode="json")
            # Build row as a list matching the column order

            field_type = field_dict.get("field_type", "")

            # Check if field_type is a reference to another schema
            if isinstance(field_type, dict) and "unique_schema_name_ref" in field_type:
                unique_schema_name_ref = field_type.get("unique_schema_name_ref", "")

                # Find the referenced schema
                referenced_schema = None
                for schema in other_schemas:
                    if schema.schema_name == unique_schema_name_ref:
                        referenced_schema = schema
                        break

                if referenced_schema:
                    # Map this field's key to the current row (heading row)
                    field_key_to_row_map[field.key] = current_row_offset

                    # Create heading row
                    heading_row = ExcelPolicySchemaBuilder.Row()

                    _complete_row(heading_row)

                    # Increment row offset for the heading row
                    current_row_offset += 1

                    # Recursively map fields from referenced schema
                    # Pass the current offset and shared map
                    # Note: The recursive call will update field_key_to_row_map
                    # and return the row count indirectly
                    subrows_start_offset = current_row_offset
                    subrows = cls._map_fields(
                        referenced_schema.schema_fields,
                        other_schemas,
                        current_row_offset,
                        field_key_to_row_map,
                        sheet_name_manager,
                    )

                    # Count how many rows were added by the subrows
                    subrows_count = cls._count_rows(subrows)
                    current_row_offset = subrows_start_offset + subrows_count

                    # Create SubRows with heading and subrows
                    sub_rows = ExcelPolicySchemaBuilder.SubRows(
                        heading_row=heading_row, subrows=subrows, is_nested=True
                    )
                    field_rows.append(sub_rows)
                    continue

            # Regular row (no reference)
            # Map this field's key to the current row
            field_key_to_row_map[field.key] = current_row_offset

            row = ExcelPolicySchemaBuilder.Row()

            # Get EnumOptions directly from field parameter if field_type is Enum
            enum_options: EnumOptions | None = None
            if field_type == "Enum" and isinstance(field.parameter, EnumOptions):
                enum_options = field.parameter

            _complete_row(row, enum_options)

            field_rows.append(row)
            # Increment row offset for this regular row
            current_row_offset += 1

        return field_rows

    @classmethod
    def _count_rows(cls, rows: list) -> int:
        """
        Count the total number of Excel rows that will be created from a list of Row/SubRows objects.

        Args:
            rows: List of Row or SubRows objects

        Returns:
            Total number of Excel rows
        """
        count = 0
        for row in rows:
            if isinstance(row, ExcelPolicySchemaBuilder.SubRows):
                # SubRows contribute 1 row for heading + all subrows
                count += 1 + cls._count_rows(row.subrows)
            else:
                # Regular Row contributes 1 row
                count += 1
        return count

    @classmethod
    def _map_columns(cls) -> list[FieldColumnParams]:
        return [FieldColumnParams(**col_def) for col_def in cls.COLUMN_DEFINITIONS]

    @classmethod
    def _get_column_index(cls, column_name: str) -> int:
        for i, col_def in enumerate(cls.COLUMN_DEFINITIONS):
            if col_def["value"] == column_name:
                return i
        raise ValueError(f"Column '{column_name}' not found in definitions.")

    @classmethod
    def _create_excel_policy_schema_params(
        cls,
        guardian_policy_schemas: GuardianPolicySchemas,
        sheet_name_manager: SheetNameManager,
    ):
        excel_policy_schema_params: list[ExcelPolicySchemaParams] = []

        for schema in guardian_policy_schemas:
            # Calculate the starting row index for this schema
            # WorksheetName (1 row) + Metadata rows + Fields Header (1 row) = rows_start_index
            rows_start_index = 1 + len(cls.METADATA_DEFINITIONS) + 1 + 1  # +1 for 1-based indexing

            # Create a mapping for field keys to their Excel row numbers
            field_key_to_row_map: dict[str, int] = {}

            table_rows = cls._map_fields(
                schema.schema_fields,
                guardian_policy_schemas,
                rows_start_index,
                field_key_to_row_map,
                sheet_name_manager,
            )

            # Get unique sheet name for this schema
            unique_sheet_name = sheet_name_manager.get_unique_sheet_name(
                schema.schema_name, type="SCHEMA"
            )

            excel_policy_schema_params.append(
                ExcelPolicySchemaParams(
                    worksheet_name=WorksheetNameParams(value=unique_sheet_name),
                    schema_name=schema.schema_name,
                    metadata=cls._map_metadata(schema.metadata),
                    table_columns=cls._map_columns(),
                    table_rows=table_rows,
                )
            )

        return excel_policy_schema_params

    @classmethod
    def _create_excel_enums_params(
        cls,
        policy_schemas: list[GuardianPolicySchema],
        sheet_name_manager: SheetNameManager,
    ) -> list[ExcelPolicyEnumBuilderParams]:
        """Create enum sheet params by extracting EnumOptions from Enum fields."""
        excel_enums_params = []
        seen_unique_names: set[str] = set()  # Avoid duplicate sheets for same enum definition

        for schema in policy_schemas:
            for field in schema.schema_fields:
                if field.field_type == "Enum" and isinstance(field.parameter, EnumOptions):
                    # Track by unique_name to avoid duplicates of the same enum definition
                    if field.parameter.unique_name in seen_unique_names:
                        continue
                    seen_unique_names.add(field.parameter.unique_name)

                    # Get unique sheet name for this enum
                    unique_sheet_name = sheet_name_manager.get_unique_sheet_name(
                        field.parameter.unique_name, type="ENUM"
                    )

                    enum_params = ExcelPolicyEnumBuilderParams(
                        schema_name=schema.schema_name,
                        field_name=field.question,
                        sheet_name=unique_sheet_name,
                        options=field.parameter.options,
                    )
                    excel_enums_params.append(enum_params)

        return excel_enums_params

    @classmethod
    def map(cls, guardian_policy_schemas: GuardianPolicySchemas, file_name: str = ""):
        # Create sheet name manager to establish unique names upfront
        sheet_name_manager = SheetNameManager()

        # Pre-register all schema names
        for schema in guardian_policy_schemas:
            sheet_name_manager.get_unique_sheet_name(schema.schema_name, type="SCHEMA")

        # Pre-register all enum unique names (for Enum fields with EnumOptions)
        seen_unique_names: set[str] = set()
        for schema in guardian_policy_schemas:
            for field in schema.schema_fields:
                if (
                    field.field_type == "Enum"
                    and isinstance(field.parameter, EnumOptions)
                    and field.parameter.unique_name not in seen_unique_names
                ):
                    # Only pre-register each unique_name once to avoid duplicates
                    seen_unique_names.add(field.parameter.unique_name)
                    sheet_name_manager.get_unique_sheet_name(
                        field.parameter.unique_name, type="ENUM"
                    )

        excel_enums_params = cls._create_excel_enums_params(
            guardian_policy_schemas,
            sheet_name_manager,
        )

        return CompoundExcelBuilderParams(
            excel_policy_schema_params=cls._create_excel_policy_schema_params(
                sort_guardian_policy_schemas(guardian_policy_schemas),
                sheet_name_manager,
            ),
            enum_params=excel_enums_params,
            worksheet_file_name=file_name,
        )


if __name__ == "__main__":
    # EXAMPLE USAGE AND TESTING OF THE MAPPER
    root_verifiable_credentials_schema_with_defs = {
        "guardian_policy_schemas": [
            {
                "metadata": {
                    "description": "Demonstrates nested schemas with conditional visibility based on type selection",
                    "schema_type": "Verifiable Credentials",
                },
                "schema_name": "Test Root Schema",
                "schema_fields": [
                    {
                        "key": "help_text_intro",
                        "answer": "1. This is an introductory help text for the root schema.",
                        "default": "",
                        "suggest": "",
                        "question": "Root Schema Introduction",
                        "parameter": HelpTextStyle(),
                        "field_type": "Help Text",
                        "visibility": "",
                        "required_field": "No",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "prefix_currency",
                        "answer": "99",
                        "default": "",
                        "suggest": "",
                        "question": "Currency Prefix",
                        "parameter": "$",
                        "field_type": "Prefix",
                        "visibility": "",
                        "required_field": "No",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "unique_id",
                        "answer": "1",
                        "default": "",
                        "suggest": "",
                        "question": "Unique Identifier",
                        "parameter": "",
                        "field_type": "Integer",
                        "visibility": "",
                        "required_field": "Yes",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "type_a_enum",
                        "answer": "Type-A",
                        "default": "",
                        "suggest": "",
                        "question": "Select Type",
                        "parameter": {
                            "options": ["Type-A", "Type-B", "Type-C"],
                            "unique_name": "TypeEnum",
                        },
                        "field_type": "Enum",
                        "visibility": "",
                        "required_field": "Yes",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "sample_name",
                        "answer": "Sample Name",
                        "default": "",
                        "suggest": "",
                        "question": "Name",
                        "parameter": "",
                        "field_type": "String",
                        "visibility": "",
                        "required_field": "Yes",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "postfix_unit",
                        "answer": "100",
                        "default": "",
                        "suggest": "",
                        "question": "Unit Postfix",
                        "parameter": "kg",
                        "field_type": "Postfix",
                        "visibility": "",
                        "required_field": "No",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "special_field",
                        "answer": "Special Value",
                        "default": "",
                        "suggest": "",
                        "question": "Special Field (for Type-A and Type-B only)",
                        "parameter": "",
                        "field_type": "String",
                        "visibility": {
                            "condition": {
                                "left": {
                                    "left": {"field_key_ref": "type_a_enum"},
                                    "right": {"value": "Type-A"},
                                    "operator": "EQUAL",
                                },
                                "right": {
                                    "left": {"field_key_ref": "type_a_enum"},
                                    "right": {"value": "Type-B"},
                                    "operator": "EQUAL",
                                },
                                "operator": "OR",
                            }
                        },
                        "required_field": "No",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "type_a_data",
                        "answer": "",
                        "default": "",
                        "suggest": "",
                        "question": "Type-A Specific Data",
                        "parameter": "",
                        "field_type": {
                            "unique_schema_name_ref": "Type-A Sub-Schema Long Long L ong"
                        },
                        "visibility": {
                            "condition": {
                                "left": {"field_key_ref": "type_a_enum"},
                                "right": {"value": "Type-A"},
                                "operator": "EQUAL",
                            }
                        },
                        "required_field": "No",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "type_b_data",
                        "answer": "",
                        "default": "",
                        "suggest": "",
                        "question": "Type-B Specific Data",
                        "parameter": "",
                        "field_type": {"unique_schema_name_ref": "Type-B Sub-Schema"},
                        "visibility": {
                            "condition": {
                                "left": {"field_key_ref": "type_a_enum"},
                                "right": {"value": "Type-B"},
                                "operator": "EQUAL",
                            }
                        },
                        "required_field": "No",
                        "allow_multiple_answers": "No",
                    },
                ],
            }
        ],
    }

    root_2_verifiable_credentials_schema_with_defs = {
        "guardian_policy_schemas": [
            {
                "metadata": {
                    "description": "Another root schema for testing",
                    "schema_type": "Verifiable Credentials",
                },
                "schema_name": "Another Root Schema",
                "schema_fields": [
                    {
                        "key": "another_field",
                        "answer": "Another Value",
                        "default": "",
                        "suggest": "",
                        "question": "Another Field",
                        "parameter": "",
                        "field_type": "String",
                        "visibility": "",
                        "required_field": "Yes",
                        "allow_multiple_answers": "No",
                    }
                ],
            }
        ],
    }

    type_a_sub_schema_with_defs = {
        "guardian_policy_schemas": [
            {
                "metadata": {
                    "description": "Sub-schema containing fields specific to Type-A",
                    "schema_type": "Sub-Schema",
                },
                "schema_name": "Type-A Sub-Schema Long Long L ong",
                "schema_fields": [
                    {
                        "key": "type_a_field1",
                        "answer": "Type-A Value 1",
                        "default": "",
                        "suggest": "",
                        "question": "Type-A Field 1",
                        "parameter": "",
                        "field_type": "String",
                        "visibility": "",
                        "required_field": "Yes",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "field_type": {"unique_schema_name_ref": "Type-B Sub-Schema"},
                        "key": "nested_type_b_data",
                        "answer": "",
                        "default": "",
                        "suggest": "",
                        "question": "Nested Type-B Specific Data",
                        "parameter": "",
                        "visibility": "",
                        "required_field": "No",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "type_a_field2",
                        "answer": "Type-A Value 2",
                        "default": "",
                        "suggest": "",
                        "question": "Type-A Field 2",
                        "parameter": "",
                        "field_type": "String",
                        "visibility": "",
                        "required_field": "Yes",
                        "allow_multiple_answers": "No",
                    },
                ],
            },
        ],
    }

    type_b_sub_schema_with_defs = {
        "guardian_policy_schemas": [
            {
                "metadata": {
                    "description": "Sub-schema containing fields specific to Type-B",
                    "schema_type": "Sub-Schema",
                },
                "schema_name": "Type-B Sub-Schema",
                "schema_fields": [
                    {
                        "key": "type_b_field1",
                        "answer": "Type-B Value 1",
                        "default": "",
                        "suggest": "",
                        "question": "Type-B Field 1",
                        "parameter": "",
                        "field_type": "String",
                        "visibility": "",
                        "required_field": "Yes",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "type_b_field2",
                        "answer": "Type-B Value 2",
                        "default": "",
                        "suggest": "",
                        "question": "Type-B Field 2",
                        "parameter": "",
                        "field_type": "String",
                        "visibility": "",
                        "required_field": "Yes",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "field_type": {"unique_schema_name_ref": "Type-C Sub-Schema"},
                        "key": "nested_type_c_data",
                        "answer": "",
                        "default": "",
                        "suggest": "",
                        "question": "Nested Type-C Specific Data",
                        "parameter": "",
                        "visibility": "",
                        "required_field": "No",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "sub_type_a_enum",
                        "answer": "Type-A",
                        "default": "",
                        "suggest": "",
                        "question": "Select Type",
                        "parameter": {
                            "options": ["Type-A2", "Type-B2", "Type-C2"],
                            "unique_name": "TypeEnum2",
                        },
                        "field_type": "Enum",
                        "visibility": "",
                        "required_field": "Yes",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "sub_type_b_data",
                        "answer": "",
                        "default": "",
                        "suggest": "",
                        "question": "Type-B Specific Data",
                        "parameter": "",
                        "field_type": "String",
                        "visibility": {
                            "condition": {
                                "left": {"field_key_ref": "sub_type_a_enum"},
                                "right": {"value": "Type-B2"},
                                "operator": "EQUAL",
                            }
                        },
                        "required_field": "No",
                        "allow_multiple_answers": "No",
                    },
                ],
            },
        ],
    }

    type_c_sub_schema_with_defs = {
        "guardian_policy_schemas": [
            {
                "metadata": {
                    "description": "Sub-schema containing fields specific to Type-C",
                    "schema_type": "Sub-Schema",
                },
                "schema_name": "Type-C Sub-Schema",
                "schema_fields": [
                    {
                        "key": "simple_field",
                        "answer": "Simple Answer",
                        "default": "",
                        "suggest": "",
                        "question": "Simple Question",
                        "parameter": "",
                        "field_type": "String",
                        "visibility": "",
                        "required_field": "Yes",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "simple_enum_field",
                        "answer": "Type-A2",
                        "default": "",
                        "suggest": "",
                        "question": "Simple Enum Question",
                        "parameter": {
                            "options": ["Type-A3", "Type-B3", "Type-C3"],
                            "unique_name": "TypeEnum3VeryVeryLongName",
                        },
                        "field_type": "Enum",
                        "visibility": "",
                        "required_field": "Yes",
                        "allow_multiple_answers": "No",
                    },
                    {
                        "key": "color_field",
                        "answer": "Red",
                        "default": "",
                        "suggest": "",
                        "question": "Select Color",
                        "parameter": {
                            "options": ["Red", "Green", "Blue"],
                            "unique_name": "ColorEnumVeryVeryLongName",
                        },
                        "field_type": "Enum",
                        "visibility": "",
                        "required_field": "Yes",
                        "allow_multiple_answers": "No",
                    },
                ],
            },
        ],
    }

    from pydantic import TypeAdapter

    from .compound_excel_builder import CompoundExcelBuilder

    #  Single step schema example -----------------------------

    guardian_policy_schemas_adapter = TypeAdapter(GuardianPolicySchemas)

    compound_params = GuardianPolicySchemaToCompoundExcelMapper.map(
        guardian_policy_schemas_adapter.validate_python(
            [
                *type_b_sub_schema_with_defs["guardian_policy_schemas"],
                *root_verifiable_credentials_schema_with_defs["guardian_policy_schemas"],
                *root_2_verifiable_credentials_schema_with_defs["guardian_policy_schemas"],
                *type_a_sub_schema_with_defs["guardian_policy_schemas"],
                *type_c_sub_schema_with_defs["guardian_policy_schemas"],
            ],
        ),
        file_name="Test_Root_Schema_SingleStep.xlsx",
    )

    builder = CompoundExcelBuilder(compound_params)
    builder.build()
    builder.save()
