"""Unit tests for GuardianPolicySchemaToCompoundExcelMapper"""

import pytest

from policy_schema_builder.compound_excel_builder import CompoundExcelBuilderParams
from policy_schema_builder.mapper import (
    GuardianPolicySchemaToCompoundExcelMapper,
    SheetNameManager,
)
from policy_schema_builder.models.guardian_policy_schema import (
    GuardianPolicySchema,
    GuardianPolicySchemaWithDefinitions,
)
from policy_schema_builder.policy_schema_builder import ExcelPolicySchemaBuilder


class TestGuardianPolicySchemaToCompoundExcelMapperConstants:
    """Tests for mapper constants and mappings"""

    def test_metadata_definitions(self):
        """Test metadata definitions list"""
        definitions = GuardianPolicySchemaToCompoundExcelMapper.METADATA_DEFINITIONS
        assert len(definitions) == 2
        assert definitions[0]["source_key"] == "description"
        assert definitions[0]["key"] == "Description"
        assert definitions[1]["source_key"] == "schema_type"
        assert definitions[1]["key"] == "Schema Type"

    def test_field_mapping(self):
        """Test field mapping dictionary"""
        mapping = GuardianPolicySchemaToCompoundExcelMapper.FIELD_MAPPING
        assert "required_field" in mapping
        assert "field_type" in mapping
        assert "question" in mapping
        assert "key" in mapping
        assert mapping["required_field"] == "Required Field"
        assert mapping["field_type"] == "Field Type"

    def test_column_definitions(self):
        """Test column definitions list"""
        columns = GuardianPolicySchemaToCompoundExcelMapper.COLUMN_DEFINITIONS
        assert len(columns) > 0
        assert isinstance(columns, list)

        # Check first column
        first_col = columns[0]
        assert "value" in first_col
        assert first_col["value"] == "Required Field"

    def test_get_column_index(self):
        """Test getting column index by name"""
        index = GuardianPolicySchemaToCompoundExcelMapper._get_column_index("Required Field")
        assert index == 0

        index = GuardianPolicySchemaToCompoundExcelMapper._get_column_index("Field Type")
        assert index == 1

    def test_get_column_index_invalid(self):
        """Test getting column index for non-existent column"""
        with pytest.raises(ValueError, match="not found in definitions"):
            GuardianPolicySchemaToCompoundExcelMapper._get_column_index("NonExistentColumn")


class TestGuardianPolicySchemaToCompoundExcelMapperMetadata:
    """Tests for metadata mapping"""

    def test_map_metadata_basic(self):
        """Test mapping basic metadata"""
        schema = GuardianPolicySchema.model_validate(
            {
                "schema_name": "Test Schema",
                "metadata": {
                    "description": "Test description",
                    "schema_type": "Verifiable Credentials",
                },
                "schema_fields": [],
            }
        )

        metadata_params = GuardianPolicySchemaToCompoundExcelMapper._map_metadata(schema.metadata)

        assert len(metadata_params) == 2
        assert metadata_params[0].key == "Description"
        assert metadata_params[0].value == "Test description"
        assert metadata_params[1].key == "Schema Type"
        assert metadata_params[1].value == "Verifiable Credentials"

    def test_map_metadata_empty_values(self):
        """Test mapping metadata with empty values"""
        schema = GuardianPolicySchema.model_validate(
            {
                "schema_name": "Test Schema",
                "metadata": {"description": "", "schema_type": "Sub-Schema"},
                "schema_fields": [],
            }
        )

        metadata_params = GuardianPolicySchemaToCompoundExcelMapper._map_metadata(schema.metadata)

        assert len(metadata_params) == 2
        assert metadata_params[0].value == ""


class TestGuardianPolicySchemaToCompoundExcelMapperFields:
    """Tests for field mapping"""

    def test_map_fields_basic(self):
        """Test mapping basic fields"""
        schema = GuardianPolicySchema.model_validate(
            {
                "schema_name": "Test Schema",
                "metadata": {"description": "Test", "schema_type": "Verifiable Credentials"},
                "schema_fields": [
                    {
                        "required_field": "Yes",
                        "field_type": "String",
                        "parameter": "",
                        "visibility": "",
                        "question": "What is your name?",
                        "allow_multiple_answers": "No",
                        "answer": "John Doe",
                        "key": "name",
                    }
                ],
            }
        )

        sheet_name_manager = SheetNameManager()
        field_key_to_row_map = {}
        rows = GuardianPolicySchemaToCompoundExcelMapper._map_fields(
            schema.schema_fields,
            other_schemas=[],
            rows_start_index=4,
            field_key_to_row_map=field_key_to_row_map,
            sheet_name_manager=sheet_name_manager,
        )

        assert len(rows) == 1
        assert isinstance(rows[0], ExcelPolicySchemaBuilder.Row)
        assert rows[0].values[0].title == "Yes"  # Required Field
        assert "String" in str(rows[0].values[1].title)  # Field Type

    def test_map_fields_with_enum(self):
        """Test mapping fields with inline EnumOptions"""
        schema = GuardianPolicySchema.model_validate(
            {
                "schema_name": "Test Schema",
                "metadata": {"description": "Test", "schema_type": "Verifiable Credentials"},
                "schema_fields": [
                    {
                        "required_field": "Yes",
                        "field_type": "Enum",
                        "parameter": {
                            "unique_name": "status_enum",
                            "options": ["Active", "Inactive"],
                        },
                        "visibility": "",
                        "question": "What is your status?",
                        "allow_multiple_answers": "No",
                        "answer": "",
                        "key": "status",
                    }
                ],
            }
        )

        sheet_name_manager = SheetNameManager()
        field_key_to_row_map = {}
        rows = GuardianPolicySchemaToCompoundExcelMapper._map_fields(
            schema.schema_fields,
            other_schemas=[],
            rows_start_index=4,
            field_key_to_row_map=field_key_to_row_map,
            sheet_name_manager=sheet_name_manager,
        )

        assert len(rows) == 1
        # Parameter column should have SheetRefCell for enum
        parameter_col_idx = 2  # Parameter is 3rd column (index 2)
        assert isinstance(rows[0].values[parameter_col_idx], ExcelPolicySchemaBuilder.SheetRefCell)

    def test_map_fields_with_schema_reference(self):
        """Test mapping fields with schema references"""
        main_schema = GuardianPolicySchema.model_validate(
            {
                "schema_name": "Main Schema",
                "metadata": {"description": "Main", "schema_type": "Verifiable Credentials"},
                "schema_fields": [
                    {
                        "required_field": "No",
                        "field_type": {"unique_schema_name_ref": "Sub Schema"},
                        "parameter": "",
                        "visibility": "",
                        "question": "Sub schema field",
                        "allow_multiple_answers": "No",
                        "answer": "",
                        "key": "sub",
                    }
                ],
            }
        )

        sub_schema = GuardianPolicySchema.model_validate(
            {
                "schema_name": "Sub Schema",
                "metadata": {"description": "Sub", "schema_type": "Sub-Schema"},
                "schema_fields": [
                    {
                        "required_field": "Yes",
                        "field_type": "String",
                        "parameter": "",
                        "visibility": "",
                        "question": "Sub field",
                        "allow_multiple_answers": "No",
                        "answer": "",
                        "key": "sub_field",
                    }
                ],
            }
        )

        sheet_name_manager = SheetNameManager()
        field_key_to_row_map = {}
        rows = GuardianPolicySchemaToCompoundExcelMapper._map_fields(
            main_schema.schema_fields,
            other_schemas=[main_schema, sub_schema],
            rows_start_index=4,
            field_key_to_row_map=field_key_to_row_map,
            sheet_name_manager=sheet_name_manager,
        )

        assert len(rows) == 1
        assert isinstance(rows[0], ExcelPolicySchemaBuilder.SubRows)
        assert rows[0].heading_row is not None
        assert len(rows[0].subrows) == 1

    def test_map_fields_multiple(self):
        """Test mapping multiple fields"""
        schema = GuardianPolicySchema.model_validate(
            {
                "schema_name": "Test Schema",
                "metadata": {"description": "Test", "schema_type": "Verifiable Credentials"},
                "schema_fields": [
                    {
                        "required_field": "Yes",
                        "field_type": "String",
                        "parameter": "",
                        "visibility": "",
                        "question": "Question 1",
                        "allow_multiple_answers": "No",
                        "answer": "Answer 1",
                        "key": "field1",
                    },
                    {
                        "required_field": "No",
                        "field_type": "Integer",
                        "parameter": "",
                        "visibility": "Hidden",
                        "question": "Question 2",
                        "allow_multiple_answers": "No",
                        "answer": "42",
                        "key": "field2",
                    },
                ],
            }
        )

        sheet_name_manager = SheetNameManager()
        field_key_to_row_map = {}
        rows = GuardianPolicySchemaToCompoundExcelMapper._map_fields(
            schema.schema_fields,
            other_schemas=[],
            rows_start_index=4,
            field_key_to_row_map=field_key_to_row_map,
            sheet_name_manager=sheet_name_manager,
        )

        assert len(rows) == 2
        assert isinstance(rows[0], ExcelPolicySchemaBuilder.Row)
        assert isinstance(rows[1], ExcelPolicySchemaBuilder.Row)


class TestGuardianPolicySchemaToCompoundExcelMapperColumns:
    """Tests for column mapping"""

    def test_map_columns(self):
        """Test mapping column definitions"""
        columns = GuardianPolicySchemaToCompoundExcelMapper._map_columns()

        assert len(columns) > 0
        assert all(hasattr(col, "value") for col in columns)
        assert columns[0].value == "Required Field"


class TestGuardianPolicySchemaToCompoundExcelMapperCreateSchemaParams:
    """Tests for creating Excel policy schema params"""

    def test_create_excel_policy_schema_params_single(self):
        """Test creating params for single schema"""
        schema = GuardianPolicySchema.model_validate(
            {
                "schema_name": "Test Schema",
                "metadata": {
                    "description": "Test description",
                    "schema_type": "Verifiable Credentials",
                },
                "schema_fields": [
                    {
                        "required_field": "Yes",
                        "field_type": "String",
                        "parameter": "",
                        "visibility": "",
                        "question": "What is your name?",
                        "allow_multiple_answers": "No",
                        "answer": "John",
                        "key": "name",
                    }
                ],
            }
        )

        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {"guardian_policy_schemas": [schema.model_dump()]}
        )

        sheet_name_manager = SheetNameManager()
        params = GuardianPolicySchemaToCompoundExcelMapper._create_excel_policy_schema_params(
            schema_with_defs.guardian_policy_schemas,
            sheet_name_manager,
        )

        assert len(params) == 1
        assert params[0].worksheet_name.value == "Test Schema"
        assert len(params[0].metadata) == 2
        assert len(params[0].table_columns) > 0
        assert len(params[0].table_rows) == 1

    def test_create_excel_policy_schema_params_multiple(self):
        """Test creating params for multiple schemas"""
        schemas = [
            GuardianPolicySchema.model_validate(
                {
                    "schema_name": "Schema 1",
                    "metadata": {"description": "First", "schema_type": "Verifiable Credentials"},
                    "schema_fields": [],
                }
            ),
            GuardianPolicySchema.model_validate(
                {
                    "schema_name": "Schema 2",
                    "metadata": {"description": "Second", "schema_type": "Sub-Schema"},
                    "schema_fields": [],
                }
            ),
        ]

        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [s.model_dump() for s in schemas],
            }
        )

        sheet_name_manager = SheetNameManager()
        params = GuardianPolicySchemaToCompoundExcelMapper._create_excel_policy_schema_params(
            schema_with_defs.guardian_policy_schemas,
            sheet_name_manager,
        )

        assert len(params) == 2
        assert params[0].worksheet_name.value == "Schema 1"
        assert params[1].worksheet_name.value == "Schema 2"


class TestGuardianPolicySchemaToCompoundExcelMapperCreateEnumParams:
    """Tests for creating enum params from inline EnumOptions"""

    def test_create_excel_enums_params_single(self):
        """Test creating enum params for single enum field"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "Test Schema",
                        "metadata": {
                            "description": "Test",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [
                            {
                                "required_field": "Yes",
                                "field_type": "Enum",
                                "parameter": {
                                    "unique_name": "status_enum",
                                    "options": ["Active", "Inactive"],
                                },
                                "visibility": "",
                                "question": "What is your status?",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "status",
                            }
                        ],
                    }
                ],
            }
        )

        sheet_name_manager = SheetNameManager()
        enum_params = GuardianPolicySchemaToCompoundExcelMapper._create_excel_enums_params(
            schema_with_defs.guardian_policy_schemas,
            sheet_name_manager,
        )

        assert len(enum_params) == 1
        assert enum_params[0].sheet_name == "status_enum (enum)"
        assert enum_params[0].schema_name == "Test Schema"
        assert enum_params[0].field_name == "What is your status?"
        assert enum_params[0].options == ["Active", "Inactive"]

    def test_create_excel_enums_params_multiple(self):
        """Test creating enum params for multiple enum fields"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "Test Schema",
                        "metadata": {
                            "description": "Test",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [
                            {
                                "required_field": "Yes",
                                "field_type": "Enum",
                                "parameter": {
                                    "unique_name": "status_enum",
                                    "options": ["Active", "Inactive"],
                                },
                                "visibility": "",
                                "question": "Status?",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "status",
                            },
                            {
                                "required_field": "No",
                                "field_type": "Enum",
                                "parameter": {
                                    "unique_name": "type_enum",
                                    "options": ["Type A", "Type B"],
                                },
                                "visibility": "",
                                "question": "Type?",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "type",
                            },
                        ],
                    }
                ],
            }
        )

        sheet_name_manager = SheetNameManager()
        enum_params = GuardianPolicySchemaToCompoundExcelMapper._create_excel_enums_params(
            schema_with_defs.guardian_policy_schemas,
            sheet_name_manager,
        )

        assert len(enum_params) == 2

    def test_enum_field_without_enum_options_fails_validation(self):
        """Test that enum field without EnumOptions fails at validation level"""
        # This should fail at the pydantic validation level
        with pytest.raises(Exception) as exc_info:
            GuardianPolicySchemaWithDefinitions.model_validate(
                {
                    "guardian_policy_schemas": [
                        {
                            "schema_name": "Test Schema",
                            "metadata": {
                                "description": "Test",
                                "schema_type": "Verifiable Credentials",
                            },
                            "schema_fields": [
                                {
                                    "required_field": "Yes",
                                    "field_type": "Enum",
                                    "parameter": "",
                                    "visibility": "",
                                    "question": "Status?",
                                    "allow_multiple_answers": "No",
                                    "answer": "",
                                    "key": "status",
                                }
                            ],
                        }
                    ],
                },
            )
        # Should fail with validation error about Enum without EnumOptions
        assert "Enum but parameter is not EnumOptions" in str(exc_info.value)


class TestSheetNameManager:
    """Tests for SheetNameManager truncation and deduplication."""

    def test_case_insensitive_collision(self):
        """Sheet names differing only in case should be deduplicated (Excel is case-insensitive)."""
        mgr = SheetNameManager()
        name1 = mgr.get_unique_sheet_name("Commercially Sensitive Informat", type="SCHEMA")
        name2 = mgr.get_unique_sheet_name("Commercially sensitive informat", type="SCHEMA")

        assert name1 != name2
        assert name1.lower() != name2.lower()

    def test_exact_duplicate_returns_same(self):
        """Same input string should return the same mapped name."""
        mgr = SheetNameManager()
        name1 = mgr.get_unique_sheet_name("My Schema", type="SCHEMA")
        name2 = mgr.get_unique_sheet_name("My Schema", type="SCHEMA")

        assert name1 == name2

    def test_truncation_to_max_length(self):
        """Schema sheet names should not exceed 31 characters (30 base + strip)."""
        mgr = SheetNameManager()
        long_name = "A" * 50
        result = mgr.get_unique_sheet_name(long_name, type="SCHEMA")

        assert len(result) <= 31

    def test_enum_sheet_name_limit(self):
        """Enum sheet names should not exceed 30 characters (23 base + ' (enum)')."""
        mgr = SheetNameManager()
        long_name = "B" * 50
        result = mgr.get_unique_sheet_name(long_name, type="ENUM")

        assert result.endswith(" (enum)")
        assert len(result) <= 30

    def test_collision_adds_suffix(self):
        """When truncated names collide, a numeric suffix is added."""
        mgr = SheetNameManager()
        # Two different names that truncate to the same 30-char prefix
        base = "A" * 30
        name1 = mgr.get_unique_sheet_name(base + "_first", type="SCHEMA")
        name2 = mgr.get_unique_sheet_name(base + "_second", type="SCHEMA")

        assert name1 != name2
        assert len(name1) <= 31
        assert len(name2) <= 31


class TestGuardianPolicySchemaToCompoundExcelMapperMap:
    """Tests for complete mapping process"""

    def test_map_simple_schema(self):
        """Test mapping simple schema without enums or subschemas"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "Simple Schema",
                        "metadata": {
                            "description": "Simple test schema",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [
                            {
                                "required_field": "Yes",
                                "field_type": "String",
                                "parameter": "",
                                "visibility": "",
                                "question": "What is your name?",
                                "allow_multiple_answers": "No",
                                "answer": "John Doe",
                                "key": "name",
                            }
                        ],
                    }
                ],
            }
        )

        result = GuardianPolicySchemaToCompoundExcelMapper.map(
            schema_with_defs.guardian_policy_schemas, file_name="Simple Schema"
        )

        assert isinstance(result, CompoundExcelBuilderParams)
        assert len(result.excel_policy_schema_params) == 1
        assert len(result.enum_params) == 0
        assert result.worksheet_file_name == "Simple Schema"

    def test_map_schema_with_enums(self):
        """Test mapping schema with inline EnumOptions"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "Schema With Enum",
                        "metadata": {
                            "description": "Test",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [
                            {
                                "required_field": "Yes",
                                "field_type": "Enum",
                                "parameter": {
                                    "unique_name": "status_enum",
                                    "options": ["Active", "Inactive", "Pending"],
                                },
                                "visibility": "",
                                "question": "What is your status?",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "status",
                            }
                        ],
                    }
                ],
            }
        )

        result = GuardianPolicySchemaToCompoundExcelMapper.map(
            schema_with_defs.guardian_policy_schemas
        )

        assert len(result.excel_policy_schema_params) == 1
        assert len(result.enum_params) == 1
        assert result.enum_params[0].sheet_name == "status_enum (enum)"
        assert len(result.enum_params[0].options) == 3

    def test_map_schema_with_subschemas(self):
        """Test mapping schema with subschemas"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "Main Schema",
                        "metadata": {
                            "description": "Main",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [
                            {
                                "required_field": "No",
                                "field_type": {"unique_schema_name_ref": "Sub Schema"},
                                "parameter": "",
                                "visibility": "",
                                "question": "Sub schema",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "sub",
                            }
                        ],
                    },
                    {
                        "schema_name": "Sub Schema",
                        "metadata": {"description": "Sub", "schema_type": "Sub-Schema"},
                        "schema_fields": [
                            {
                                "required_field": "Yes",
                                "field_type": "String",
                                "parameter": "",
                                "visibility": "",
                                "question": "Sub field",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "sub_field",
                            }
                        ],
                    },
                ],
            }
        )

        result = GuardianPolicySchemaToCompoundExcelMapper.map(
            schema_with_defs.guardian_policy_schemas
        )

        assert len(result.excel_policy_schema_params) == 2
        assert result.excel_policy_schema_params[0].worksheet_name.value == "Main Schema"
        assert result.excel_policy_schema_params[1].worksheet_name.value == "Sub Schema"

    def test_map_complex_schema(self):
        """Test mapping complex schema with enums and subschemas"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "Complex Schema",
                        "metadata": {
                            "description": "Complex",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [
                            {
                                "required_field": "Yes",
                                "field_type": "String",
                                "parameter": "",
                                "visibility": "",
                                "question": "Name?",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "name",
                            },
                            {
                                "required_field": "Yes",
                                "field_type": "Enum",
                                "parameter": {
                                    "unique_name": "status_enum",
                                    "options": ["Active", "Inactive"],
                                },
                                "visibility": "",
                                "question": "Status?",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "status",
                            },
                            {
                                "required_field": "No",
                                "field_type": {"unique_schema_name_ref": "Details"},
                                "parameter": "",
                                "visibility": "",
                                "question": "Details?",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "details",
                            },
                        ],
                    },
                    {
                        "schema_name": "Details",
                        "metadata": {"description": "Details", "schema_type": "Sub-Schema"},
                        "schema_fields": [
                            {
                                "required_field": "No",
                                "field_type": "Integer",
                                "parameter": "",
                                "visibility": "",
                                "question": "Age?",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "age",
                            }
                        ],
                    },
                ],
            }
        )

        result = GuardianPolicySchemaToCompoundExcelMapper.map(
            schema_with_defs.guardian_policy_schemas, file_name="Complex Schema"
        )

        assert len(result.excel_policy_schema_params) == 2
        assert len(result.enum_params) == 1
        assert result.worksheet_file_name == "Complex Schema"

    def test_map_worksheet_file_name(self):
        """Test that worksheet file name is set to first schema name"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "First Schema Name",
                        "metadata": {
                            "description": "Test",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [],
                    },
                    {
                        "schema_name": "Second Schema Name",
                        "metadata": {"description": "Test", "schema_type": "Sub-Schema"},
                        "schema_fields": [],
                    },
                ],
            }
        )

        result = GuardianPolicySchemaToCompoundExcelMapper.map(
            schema_with_defs.guardian_policy_schemas, file_name="First Schema Name"
        )

        assert result.worksheet_file_name == "First Schema Name"

    def test_map_empty_schemas(self):
        """Test mapping with empty schema list returns empty worksheet_file_name"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {"guardian_policy_schemas": []}
        )

        # Mapping empty schemas should return empty worksheet_file_name
        result = GuardianPolicySchemaToCompoundExcelMapper.map(
            schema_with_defs.guardian_policy_schemas
        )
        assert result.worksheet_file_name == ""
        assert len(result.excel_policy_schema_params) == 0

    def test_map_visibility_conditions_with_nested_subschemas(self):
        """Test that visibility conditions correctly reference fields accounting for SubRows offsets"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "Main Schema",
                        "metadata": {
                            "description": "Main schema with nested sub-schemas",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [
                            {
                                "key": "type",
                                "answer": "Type-A",
                                "default": "",
                                "suggest": "",
                                "question": "Select Type",
                                "parameter": {
                                    "unique_name": "TypeEnum",
                                    "options": ["Type-A", "Type-B", "Type-C"],
                                },
                                "field_type": "Enum",
                                "visibility": "",
                                "required_field": "Yes",
                                "allow_multiple_answers": "No",
                            },
                            {
                                "key": "type_a_data",
                                "answer": "",
                                "default": "",
                                "suggest": "",
                                "question": "Type-A Specific Data",
                                "parameter": "",
                                "field_type": {"unique_schema_name_ref": "Type-A Sub-Schema"},
                                "visibility": {
                                    "condition": {
                                        "left": {"field_key_ref": "type"},
                                        "right": {"value": "Type-A"},
                                        "operator": "EQUAL",
                                    }
                                },
                                "required_field": "No",
                                "allow_multiple_answers": "No",
                            },
                            {
                                "key": "field_after_subschema",
                                "answer": "",
                                "default": "",
                                "suggest": "",
                                "question": "Field After SubSchema",
                                "parameter": "",
                                "field_type": "String",
                                "visibility": {
                                    "condition": {
                                        "left": {"field_key_ref": "type"},
                                        "right": {"value": "Type-A"},
                                        "operator": "EQUAL",
                                    }
                                },
                                "required_field": "No",
                                "allow_multiple_answers": "No",
                            },
                        ],
                    },
                    {
                        "schema_name": "Type-A Sub-Schema",
                        "metadata": {
                            "description": "Sub-schema with 2 fields",
                            "schema_type": "Sub-Schema",
                        },
                        "schema_fields": [
                            {
                                "key": "sub_field_1",
                                "answer": "",
                                "default": "",
                                "suggest": "",
                                "question": "Sub Field 1",
                                "parameter": "",
                                "field_type": "String",
                                "visibility": "",
                                "required_field": "Yes",
                                "allow_multiple_answers": "No",
                            },
                            {
                                "key": "sub_field_2",
                                "answer": "",
                                "default": "",
                                "suggest": "",
                                "question": "Sub Field 2",
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
        )

        result = GuardianPolicySchemaToCompoundExcelMapper.map(
            schema_with_defs.guardian_policy_schemas
        )

        # Verify the mapping succeeded
        assert len(result.excel_policy_schema_params) == 2

        # Check that the visibility formulas reference the correct cells
        # Row layout:
        # Row 1: Worksheet Name
        # Row 2: Metadata 1 (Description)
        # Row 3: Metadata 2 (Schema Type)
        # Row 4: Fields Header
        # Row 5: "type" field (first data row)
        # Row 6: "type_a_data" SubRows heading
        # Row 7: sub_field_1
        # Row 8: sub_field_2
        # Row 9: "field_after_subschema"

        main_schema_params = result.excel_policy_schema_params[0]
        rows = main_schema_params.table_rows

        # First row is "type" (Enum)
        assert isinstance(rows[0], ExcelPolicySchemaBuilder.Row)

        # Second row is "type_a_data" (SubRows)
        assert isinstance(rows[1], ExcelPolicySchemaBuilder.SubRows)
        # The SubRows has 1 heading + 2 subrows
        assert len(rows[1].subrows) == 2

        # Third row is "field_after_subschema" with visibility condition
        assert isinstance(rows[2], ExcelPolicySchemaBuilder.Row)

        # The visibility cell should be a FormulaCell
        visibility_col_idx = 3  # Visibility is 4th column (index 3)
        visibility_cell = rows[2].values[visibility_col_idx]
        assert isinstance(visibility_cell, ExcelPolicySchemaBuilder.FormulaCell)

        # The formula should reference G5 (Answer column for "type" field at row 5)
        # The exact formula format depends on convert_to_excel implementation
        assert "G5" in visibility_cell.formula  # G is the Answer column
