"""Unit tests for policy_schema_builder models"""

import pytest
from pydantic import ValidationError

from policy_schema_builder.models import (
    ExcelPolicySchemaParams,
    FieldColumnParams,
    MetadataParams,
    WorksheetNameParams,
)


class TestFieldColumnParams:
    """Tests for FieldColumnParams model"""

    def test_valid_field_column_basic(self):
        """Test creation of a basic field column"""
        field = FieldColumnParams(value="Test Column")
        assert field.value == "Test Column"
        assert field.width is None
        assert field.value_restrictions is None

    def test_valid_field_column_with_width(self):
        """Test field column with custom width"""
        field = FieldColumnParams(value="Test Column", width=25.5)
        assert field.value == "Test Column"
        assert field.width == 25.5

    def test_valid_field_column_with_restrictions(self):
        """Test field column with value restrictions"""
        restrictions = ["Yes", "No"]
        field = FieldColumnParams(value="Required", value_restrictions=restrictions)
        assert field.value == "Required"
        assert field.value_restrictions == restrictions

    def test_field_column_with_all_params(self):
        """Test field column with all parameters"""
        field = FieldColumnParams(
            value="Test Column", width=30.0, value_restrictions=["Option1", "Option2", "Option3"]
        )
        assert field.value == "Test Column"
        assert field.width == 30.0
        assert len(field.value_restrictions) == 3


class TestMetadataParams:
    """Tests for MetadataParams model"""

    def test_valid_metadata_basic(self):
        """Test creation of basic metadata"""
        metadata = MetadataParams(key="Description", value="Test description")
        assert metadata.key == "Description"
        assert metadata.value == "Test description"
        assert metadata.value_restrictions is None

    def test_metadata_with_empty_value(self):
        """Test metadata with empty value"""
        metadata = MetadataParams(key="Description", value="")
        assert metadata.key == "Description"
        assert metadata.value == ""

    def test_metadata_with_restrictions(self):
        """Test metadata with value restrictions"""
        restrictions = ["Type1", "Type2", "Type3"]
        metadata = MetadataParams(key="Schema Type", value="Type1", value_restrictions=restrictions)
        assert metadata.key == "Schema Type"
        assert metadata.value == "Type1"
        assert metadata.value_restrictions == restrictions

    def test_metadata_invalid_value_against_restrictions(self):
        """Test that value not in restrictions fails validation"""
        with pytest.raises(ValidationError, match="is not allowed"):
            MetadataParams(
                key="Schema Type",
                value="InvalidType",
                value_restrictions=["Type1", "Type2", "Type3"],
            )

    def test_metadata_valid_none_value_with_restrictions(self):
        """Test that None/empty value is allowed even with restrictions"""
        metadata = MetadataParams(
            key="Schema Type", value=None, value_restrictions=["Type1", "Type2"]
        )
        assert metadata.value is None

    def test_metadata_empty_string_value_with_restrictions(self):
        """Test that empty string value is allowed with restrictions"""
        metadata = MetadataParams(
            key="Schema Type", value="", value_restrictions=["Type1", "Type2"]
        )
        assert metadata.value == ""


class TestWorksheetNameParams:
    """Tests for WorksheetNameParams model"""

    def test_valid_worksheet_name(self):
        """Test creation of valid worksheet name"""
        worksheet = WorksheetNameParams(value="My Worksheet")
        assert worksheet.value == "My Worksheet"

    def test_worksheet_name_with_special_characters(self):
        """Test worksheet name with special characters"""
        worksheet = WorksheetNameParams(value="Test-Schema_2024")
        assert worksheet.value == "Test-Schema_2024"

    def test_worksheet_name_required(self):
        """Test that worksheet name is required"""
        with pytest.raises(ValidationError):
            WorksheetNameParams()


class TestExcelPolicySchemaParams:
    """Tests for ExcelPolicySchemaParams model"""

    def test_valid_basic_schema(self):
        """Test creation of basic schema params"""
        params = ExcelPolicySchemaParams(
            schema_name="Test",
            worksheet_name=WorksheetNameParams(value="Test"),
            metadata=[MetadataParams(key="Description", value="Test schema")],
            table_columns=[FieldColumnParams(value="Column1"), FieldColumnParams(value="Column2")],
            table_rows=[["Value1", "Value2"]],
        )
        assert params.worksheet_name.value == "Test"
        assert len(params.metadata) == 1
        assert len(params.table_columns) == 2
        assert len(params.table_rows) == 1

    def test_schema_with_multiple_rows(self):
        """Test schema with multiple data rows"""
        params = ExcelPolicySchemaParams(
            schema_name="Test",
            worksheet_name=WorksheetNameParams(value="Test"),
            metadata=[MetadataParams(key="Description", value="Test")],
            table_columns=[
                FieldColumnParams(value="Col1"),
                FieldColumnParams(value="Col2"),
                FieldColumnParams(value="Col3"),
            ],
            table_rows=[
                ["Row1Col1", "Row1Col2", "Row1Col3"],
                ["Row2Col1", "Row2Col2", "Row2Col3"],
                ["Row3Col1", "Row3Col2", "Row3Col3"],
            ],
        )
        assert len(params.table_rows) == 3
        assert len(params.table_columns) == 3

    def test_schema_row_length_mismatch_fails(self):
        """Test that row length mismatch fails validation"""
        with pytest.raises(ValidationError, match="has .* cells but .* columns are defined"):
            ExcelPolicySchemaParams(
                schema_name="Test",
                worksheet_name=WorksheetNameParams(value="Test"),
                metadata=[MetadataParams(key="Description", value="Test")],
                table_columns=[FieldColumnParams(value="Col1"), FieldColumnParams(value="Col2")],
                table_rows=[
                    ["Value1", "Value2", "Value3"]  # 3 values but only 2 columns
                ],
            )

    def test_schema_empty_row_fails(self):
        """Test that empty row fails validation"""
        with pytest.raises(ValidationError, match="is empty"):
            ExcelPolicySchemaParams(
                schema_name="Test",
                worksheet_name=WorksheetNameParams(value="Test"),
                metadata=[MetadataParams(key="Description", value="Test")],
                table_columns=[FieldColumnParams(value="Col1"), FieldColumnParams(value="Col2")],
                table_rows=[
                    []  # Empty row
                ],
            )

    def test_schema_with_nested_rows(self):
        """Test schema with nested row structure"""
        from policy_schema_builder.policy_schema_builder import ExcelPolicySchemaBuilder

        params = ExcelPolicySchemaParams(
            schema_name="Test",
            worksheet_name=WorksheetNameParams(value="Test"),
            metadata=[MetadataParams(key="Description", value="Test")],
            table_columns=[FieldColumnParams(value="Col1"), FieldColumnParams(value="Col2")],
            table_rows=[
                ExcelPolicySchemaBuilder.Row("Value1", "Value2"),
                ExcelPolicySchemaBuilder.SubRows(
                    heading_row=ExcelPolicySchemaBuilder.Row("Parent1", "Parent2"),
                    subrows=[ExcelPolicySchemaBuilder.Row("Child1", "Child2")],
                ),
            ],
        )
        assert len(params.table_rows) == 2

    def test_schema_nested_row_incorrect_length_fails(self):
        """Test that nested rows with incorrect length fail validation"""
        from policy_schema_builder.policy_schema_builder import ExcelPolicySchemaBuilder

        with pytest.raises(ValidationError, match="has .* cells but .* columns are defined"):
            ExcelPolicySchemaParams(
                schema_name="Test",
                worksheet_name=WorksheetNameParams(value="Test"),
                metadata=[MetadataParams(key="Description", value="Test")],
                table_columns=[FieldColumnParams(value="Col1"), FieldColumnParams(value="Col2")],
                table_rows=[
                    ExcelPolicySchemaBuilder.SubRows(
                        heading_row=ExcelPolicySchemaBuilder.Row(
                            "Value1", "Value2", "Value3"
                        ),  # 3 values but 2 columns
                        subrows=[],
                    )
                ],
            )

    def test_schema_with_complex_metadata(self):
        """Test schema with multiple metadata entries and restrictions"""
        params = ExcelPolicySchemaParams(
            schema_name="ComplexSchema",
            worksheet_name=WorksheetNameParams(value="Complex Schema"),
            metadata=[
                MetadataParams(key="Description", value="Complex test schema"),
                MetadataParams(
                    key="Schema Type",
                    value="Verifiable Credentials",
                    value_restrictions=[
                        "Verifiable Credentials",
                        "Encrypted Verifiable Credential",
                        "Sub-Schema",
                    ],
                ),
                MetadataParams(key="Version", value="1.0"),
            ],
            table_columns=[
                FieldColumnParams(value="Field", width=20.0),
                FieldColumnParams(value="Required", width=15.0, value_restrictions=["Yes", "No"]),
            ],
            table_rows=[["Field1", "Yes"], ["Field2", "No"]],
        )
        assert len(params.metadata) == 3
        assert params.metadata[1].value_restrictions is not None
        assert len(params.metadata[1].value_restrictions) == 3

    def test_schema_required_fields(self):
        """Test that all required fields are enforced"""
        with pytest.raises(ValidationError):
            ExcelPolicySchemaParams(
                worksheet_name=WorksheetNameParams(value="Test")
                # Missing metadata, table_columns, and table_rows
            )

    def test_schema_with_callable_cells(self):
        """Test schema with callable cell values"""

        def custom_cell_handler(cell):
            cell.value = "Custom Value"
            return "Custom Value"

        params = ExcelPolicySchemaParams(
            schema_name="Test",
            worksheet_name=WorksheetNameParams(value="Test"),
            metadata=[MetadataParams(key="Description", value="Test")],
            table_columns=[FieldColumnParams(value="Col1"), FieldColumnParams(value="Col2")],
            table_rows=[[custom_cell_handler, "Value2"]],
        )
        assert len(params.table_rows) == 1
        assert callable(params.table_rows[0][0])
