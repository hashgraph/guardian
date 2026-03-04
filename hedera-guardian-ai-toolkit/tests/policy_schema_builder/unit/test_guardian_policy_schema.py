"""Unit tests for guardian_policy_schema.py models and validators"""

import pytest
from pydantic import ValidationError

from policy_schema_builder.models.guardian_policy_schema import (
    EnumOptions,
    FieldSchemaReferencesError,
    GuardianPolicySchema,
    GuardianPolicySchemaWithDefinitions,
    SchemaReference,
)


class TestGuardianPolicySchema:
    """Tests for GuardianPolicySchema model"""

    def test_valid_basic_schema(self):
        """Test creation of a valid basic schema"""
        schema = GuardianPolicySchema.model_validate(
            {
                "schema_name": "Test Schema",
                "metadata": {
                    "description": "A test schema",
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
        )
        assert schema.schema_name == "Test Schema"
        assert len(schema.schema_fields) == 1
        assert schema.schema_fields[0].field_type == "String"

    def test_schema_with_enum_field(self):
        """Test schema with enum field type"""
        schema = GuardianPolicySchema.model_validate(
            {
                "schema_name": "Enum Test Schema",
                "metadata": {
                    "description": "Schema with enum",
                    "schema_type": "Verifiable Credentials",
                },
                "schema_fields": [
                    {
                        "required_field": "Yes",
                        "field_type": "Enum",
                        "parameter": {
                            "unique_name": "age_enum",
                            "options": ["18-24", "25-34", "35-44", "45+"],
                        },
                        "visibility": "",
                        "question": "Select your age",
                        "allow_multiple_answers": "No",
                        "answer": "",
                        "key": "age",
                    }
                ],
            }
        )
        assert schema.schema_fields[0].field_type == "Enum"
        assert isinstance(schema.schema_fields[0].parameter, EnumOptions)

    def test_schema_with_reference_field(self):
        """Test schema with reference to another schema"""
        schema = GuardianPolicySchema.model_validate(
            {
                "schema_name": "Parent Schema",
                "metadata": {
                    "description": "Schema with reference",
                    "schema_type": "Verifiable Credentials",
                },
                "schema_fields": [
                    {
                        "required_field": "No",
                        "field_type": {"unique_schema_name_ref": "Child Schema"},
                        "parameter": "",
                        "visibility": "",
                        "question": "Child schema reference",
                        "allow_multiple_answers": "No",
                        "answer": "",
                        "key": "child_ref",
                    }
                ],
            }
        )
        assert isinstance(schema.schema_fields[0].field_type, SchemaReference)
        assert schema.schema_fields[0].field_type.unique_schema_name_ref == "Child Schema"


class TestGuardianPolicySchemaWithDefinitions:
    """Tests for GuardianPolicySchemaWithDefinitions model and validators"""

    def test_valid_schema_with_inline_enum(self):
        """Test valid schema with inline EnumOptions in parameter"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "Test Schema",
                        "metadata": {
                            "description": "Test schema",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [
                            {
                                "required_field": "Yes",
                                "field_type": "Enum",
                                "parameter": {
                                    "unique_name": "age_enum",
                                    "options": ["18-24", "25-34", "35-44", "45+"],
                                },
                                "visibility": "",
                                "question": "Select age",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "age",
                            }
                        ],
                    }
                ],
            }
        )
        assert len(schema_with_defs.guardian_policy_schemas) == 1
        assert isinstance(
            schema_with_defs.guardian_policy_schemas[0].schema_fields[0].parameter, EnumOptions
        )

    def test_enum_field_without_enum_options_fails(self):
        """Test that enum field without EnumOptions in parameter fails validation"""
        with pytest.raises(ValidationError, match="Enum but parameter is not EnumOptions"):
            GuardianPolicySchemaWithDefinitions.model_validate(
                {
                    "guardian_policy_schemas": [
                        {
                            "schema_name": "Test Schema",
                            "metadata": {
                                "description": "Test schema",
                                "schema_type": "Verifiable Credentials",
                            },
                            "schema_fields": [
                                {
                                    "required_field": "Yes",
                                    "field_type": "Enum",
                                    "parameter": "",
                                    "visibility": "",
                                    "question": "Select option",
                                    "allow_multiple_answers": "No",
                                    "answer": "",
                                    "key": "option",
                                }
                            ],
                        }
                    ],
                }
            )

    def test_enum_field_with_string_parameter_fails(self):
        """Test that enum field with string parameter fails validation"""
        with pytest.raises(ValidationError, match="Enum but parameter is not EnumOptions"):
            GuardianPolicySchemaWithDefinitions.model_validate(
                {
                    "guardian_policy_schemas": [
                        {
                            "schema_name": "Test Schema",
                            "metadata": {
                                "description": "Test schema",
                                "schema_type": "Verifiable Credentials",
                            },
                            "schema_fields": [
                                {
                                    "required_field": "Yes",
                                    "field_type": "Enum",
                                    "parameter": "some_string",
                                    "visibility": "",
                                    "question": "Name",
                                    "allow_multiple_answers": "No",
                                    "answer": "",
                                    "key": "name",
                                }
                            ],
                        }
                    ],
                },
            )


class TestCyclicSubschemaReferences:
    """Tests for cyclic subschema reference validation"""

    def test_valid_schema_without_cycles(self):
        """Test that valid schema without cycles passes validation"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "Parent Schema",
                        "metadata": {
                            "description": "Parent schema",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [
                            {
                                "required_field": "Yes",
                                "field_type": "String",
                                "parameter": "",
                                "visibility": "",
                                "question": "Parent field",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "parent_field",
                            },
                            {
                                "required_field": "No",
                                "field_type": {"unique_schema_name_ref": "Child Schema"},
                                "parameter": "",
                                "visibility": "",
                                "question": "Child schema reference",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "child_ref",
                            },
                        ],
                    },
                    {
                        "schema_name": "Child Schema",
                        "metadata": {
                            "description": "Child schema",
                            "schema_type": "Sub-Schema",
                        },
                        "schema_fields": [
                            {
                                "required_field": "Yes",
                                "field_type": "String",
                                "parameter": "",
                                "visibility": "",
                                "question": "Child field",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "child_field",
                            },
                        ],
                    },
                ],
            }
        )
        assert len(schema_with_defs.guardian_policy_schemas) == 2

    def test_direct_cyclic_reference_fails(self):
        """Test that direct cyclic reference (A -> A) fails validation"""
        with pytest.raises(ValidationError, match="Cyclic subschema reference detected"):
            GuardianPolicySchemaWithDefinitions.model_validate(
                {
                    "guardian_policy_schemas": [
                        {
                            "schema_name": "Self Referencing Schema",
                            "metadata": {
                                "description": "Schema that references itself",
                                "schema_type": "Verifiable Credentials",
                            },
                            "schema_fields": [
                                {
                                    "required_field": "No",
                                    "field_type": {
                                        "unique_schema_name_ref": "Self Referencing Schema"
                                    },
                                    "parameter": "",
                                    "visibility": "",
                                    "question": "Self reference",
                                    "allow_multiple_answers": "No",
                                    "answer": "",
                                    "key": "self_ref",
                                },
                            ],
                        },
                    ],
                }
            )

    def test_two_way_cyclic_reference_fails(self):
        """Test that two-way cyclic reference (A -> B -> A) fails validation"""
        with pytest.raises(ValidationError, match="Cyclic subschema reference detected"):
            GuardianPolicySchemaWithDefinitions.model_validate(
                {
                    "guardian_policy_schemas": [
                        {
                            "schema_name": "Schema A",
                            "metadata": {
                                "description": "Schema A",
                                "schema_type": "Verifiable Credentials",
                            },
                            "schema_fields": [
                                {
                                    "required_field": "No",
                                    "field_type": {"unique_schema_name_ref": "Schema B"},
                                    "parameter": "",
                                    "visibility": "",
                                    "question": "Reference to B",
                                    "allow_multiple_answers": "No",
                                    "answer": "",
                                    "key": "ref_b",
                                },
                            ],
                        },
                        {
                            "schema_name": "Schema B",
                            "metadata": {
                                "description": "Schema B",
                                "schema_type": "Sub-Schema",
                            },
                            "schema_fields": [
                                {
                                    "required_field": "No",
                                    "field_type": {"unique_schema_name_ref": "Schema A"},
                                    "parameter": "",
                                    "visibility": "",
                                    "question": "Reference to A",
                                    "allow_multiple_answers": "No",
                                    "answer": "",
                                    "key": "ref_a",
                                },
                            ],
                        },
                    ],
                }
            )

    def test_three_way_cyclic_reference_fails(self):
        """Test that three-way cyclic reference (A -> B -> C -> A) fails validation"""
        with pytest.raises(ValidationError, match="Cyclic subschema reference detected"):
            GuardianPolicySchemaWithDefinitions.model_validate(
                {
                    "guardian_policy_schemas": [
                        {
                            "schema_name": "Schema A",
                            "metadata": {
                                "description": "Schema A",
                                "schema_type": "Verifiable Credentials",
                            },
                            "schema_fields": [
                                {
                                    "required_field": "No",
                                    "field_type": {"unique_schema_name_ref": "Schema B"},
                                    "parameter": "",
                                    "visibility": "",
                                    "question": "Reference to B",
                                    "allow_multiple_answers": "No",
                                    "answer": "",
                                    "key": "ref_b",
                                },
                            ],
                        },
                        {
                            "schema_name": "Schema B",
                            "metadata": {
                                "description": "Schema B",
                                "schema_type": "Sub-Schema",
                            },
                            "schema_fields": [
                                {
                                    "required_field": "No",
                                    "field_type": {"unique_schema_name_ref": "Schema C"},
                                    "parameter": "",
                                    "visibility": "",
                                    "question": "Reference to C",
                                    "allow_multiple_answers": "No",
                                    "answer": "",
                                    "key": "ref_c",
                                },
                            ],
                        },
                        {
                            "schema_name": "Schema C",
                            "metadata": {
                                "description": "Schema C",
                                "schema_type": "Sub-Schema",
                            },
                            "schema_fields": [
                                {
                                    "required_field": "No",
                                    "field_type": {"unique_schema_name_ref": "Schema A"},
                                    "parameter": "",
                                    "visibility": "",
                                    "question": "Reference to A (creates cycle)",
                                    "allow_multiple_answers": "No",
                                    "answer": "",
                                    "key": "ref_a",
                                },
                            ],
                        },
                    ],
                }
            )

    def test_complex_nested_schema_without_cycles(self):
        """Test complex nested schema structure without cycles passes"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "Root Schema",
                        "metadata": {
                            "description": "Root schema",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [
                            {
                                "required_field": "No",
                                "field_type": {"unique_schema_name_ref": "Level 1 Schema"},
                                "parameter": "",
                                "visibility": "",
                                "question": "Level 1",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "level1",
                            },
                        ],
                    },
                    {
                        "schema_name": "Level 1 Schema",
                        "metadata": {
                            "description": "Level 1",
                            "schema_type": "Sub-Schema",
                        },
                        "schema_fields": [
                            {
                                "required_field": "No",
                                "field_type": {"unique_schema_name_ref": "Level 2 Schema"},
                                "parameter": "",
                                "visibility": "",
                                "question": "Level 2",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "level2",
                            },
                        ],
                    },
                    {
                        "schema_name": "Level 2 Schema",
                        "metadata": {
                            "description": "Level 2",
                            "schema_type": "Sub-Schema",
                        },
                        "schema_fields": [
                            {
                                "required_field": "Yes",
                                "field_type": "String",
                                "parameter": "",
                                "visibility": "",
                                "question": "Leaf field",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "leaf",
                            },
                        ],
                    },
                ],
            }
        )
        assert len(schema_with_defs.guardian_policy_schemas) == 3

    def test_non_existent_schema_reference_fails(self):
        """Test that reference to non-existent schema fails validation when context flag is set"""
        with pytest.raises(FieldSchemaReferencesError, match="non-existent schemas"):
            GuardianPolicySchemaWithDefinitions.model_validate(
                {
                    "guardian_policy_schemas": [
                        {
                            "schema_name": "Schema A",
                            "metadata": {
                                "description": "Schema A",
                                "schema_type": "Verifiable Credentials",
                            },
                            "schema_fields": [
                                {
                                    "required_field": "No",
                                    "field_type": {"unique_schema_name_ref": "Non Existent Schema"},
                                    "parameter": "",
                                    "visibility": "",
                                    "question": "Reference to non-existent",
                                    "allow_multiple_answers": "No",
                                    "answer": "",
                                    "key": "ref_nonexistent",
                                },
                            ],
                        },
                    ],
                },
            )

    def test_multiple_fields_referencing_same_subschema(self):
        """Test that multiple fields can reference the same subschema without issues"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "Parent Schema",
                        "metadata": {
                            "description": "Parent",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [
                            {
                                "required_field": "No",
                                "field_type": {"unique_schema_name_ref": "Shared Schema"},
                                "parameter": "",
                                "visibility": "",
                                "question": "First reference",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "ref1",
                            },
                            {
                                "required_field": "No",
                                "field_type": {"unique_schema_name_ref": "Shared Schema"},
                                "parameter": "",
                                "visibility": "",
                                "question": "Second reference",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "ref2",
                            },
                        ],
                    },
                    {
                        "schema_name": "Shared Schema",
                        "metadata": {
                            "description": "Shared",
                            "schema_type": "Sub-Schema",
                        },
                        "schema_fields": [
                            {
                                "required_field": "Yes",
                                "field_type": "String",
                                "parameter": "",
                                "visibility": "",
                                "question": "Shared field",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "shared",
                            },
                        ],
                    },
                ],
            }
        )
        assert len(schema_with_defs.guardian_policy_schemas) == 2
        assert len(schema_with_defs.guardian_policy_schemas[0].schema_fields) == 2


class TestMixedValidations:
    """Tests for combined enum and subschema validations"""

    def test_complex_schema_with_enums_and_subschemas(self):
        """Test complex schema with both inline EnumOptions and subschema references"""
        schema_with_defs = GuardianPolicySchemaWithDefinitions.model_validate(
            {
                "guardian_policy_schemas": [
                    {
                        "schema_name": "Main Schema",
                        "metadata": {
                            "description": "Main schema",
                            "schema_type": "Verifiable Credentials",
                        },
                        "schema_fields": [
                            {
                                "required_field": "Yes",
                                "field_type": "String",
                                "parameter": "",
                                "visibility": "",
                                "question": "Name",
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
                                "question": "Status",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "status",
                            },
                            {
                                "required_field": "No",
                                "field_type": {"unique_schema_name_ref": "Details Schema"},
                                "parameter": "",
                                "visibility": "",
                                "question": "Details",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "details",
                            },
                        ],
                    },
                    {
                        "schema_name": "Details Schema",
                        "metadata": {
                            "description": "Details",
                            "schema_type": "Sub-Schema",
                        },
                        "schema_fields": [
                            {
                                "required_field": "No",
                                "field_type": "Enum",
                                "parameter": {
                                    "unique_name": "category_enum",
                                    "options": ["Type A", "Type B"],
                                },
                                "visibility": "",
                                "question": "Category",
                                "allow_multiple_answers": "No",
                                "answer": "",
                                "key": "category",
                            },
                        ],
                    },
                ],
            }
        )
        assert len(schema_with_defs.guardian_policy_schemas) == 2


class TestVisibilityFieldReferenceValidation:
    """Tests for visibility condition field reference validation"""

    def test_valid_visibility_field_reference(self):
        """Test that valid visibility field references are accepted"""
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
                                "key": "type",
                                "answer": "Type-A",
                                "default": "",
                                "suggest": "",
                                "question": "Select Type",
                                "parameter": {
                                    "unique_name": "TypeEnum",
                                    "options": ["Type-A", "Type-B"],
                                },
                                "field_type": "Enum",
                                "visibility": "",
                                "required_field": "Yes",
                                "allow_multiple_answers": "No",
                            },
                            {
                                "key": "conditional_field",
                                "answer": "",
                                "default": "",
                                "suggest": "",
                                "question": "Conditional Field",
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
                    }
                ],
            }
        )
        # Should not raise any validation error
        assert len(schema_with_defs.guardian_policy_schemas) == 1

    def test_invalid_visibility_field_reference_missing_field(self):
        """Test that visibility condition referencing non-existent field raises error"""
        with pytest.raises(ValidationError) as exc_info:
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
                                    "key": "field1",
                                    "answer": "",
                                    "default": "",
                                    "suggest": "",
                                    "question": "Field 1",
                                    "parameter": "",
                                    "field_type": "String",
                                    "visibility": {
                                        "condition": {
                                            "left": {"field_key_ref": "non_existent_field"},
                                            "right": {"value": "some_value"},
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
            )

        error_msg = str(exc_info.value)
        assert "non_existent_field" in error_msg
        assert "visibility condition" in error_msg
        assert "non-existent field" in error_msg

    def test_invalid_visibility_field_reference_complex_expression(self):
        """Test validation with complex logical expressions (AND/OR)"""
        with pytest.raises(ValidationError) as exc_info:
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
                                    "key": "type",
                                    "answer": "Type-A",
                                    "default": "",
                                    "suggest": "",
                                    "question": "Select Type",
                                    "parameter": {
                                        "unique_name": "TypeEnum",
                                        "options": ["Type-A", "Type-B"],
                                    },
                                    "field_type": "Enum",
                                    "visibility": "",
                                    "required_field": "Yes",
                                    "allow_multiple_answers": "No",
                                },
                                {
                                    "key": "conditional_field",
                                    "answer": "",
                                    "default": "",
                                    "suggest": "",
                                    "question": "Conditional Field",
                                    "parameter": "",
                                    "field_type": "String",
                                    "visibility": {
                                        "condition": {
                                            "operator": "OR",
                                            "left": {
                                                "left": {"field_key_ref": "type"},
                                                "right": {"value": "Type-A"},
                                                "operator": "EQUAL",
                                            },
                                            "right": {
                                                "left": {"field_key_ref": "missing_field"},
                                                "right": {"value": "some_value"},
                                                "operator": "EQUAL",
                                            },
                                        }
                                    },
                                    "required_field": "No",
                                    "allow_multiple_answers": "No",
                                },
                            ],
                        }
                    ],
                }
            )

        error_msg = str(exc_info.value)
        assert "missing_field" in error_msg
        assert "visibility condition" in error_msg

    def test_valid_visibility_with_multiple_field_references(self):
        """Test that valid complex visibility with multiple field references works"""
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
                                "key": "field1",
                                "answer": "value1",
                                "default": "",
                                "suggest": "",
                                "question": "Field 1",
                                "parameter": "",
                                "field_type": "String",
                                "visibility": "",
                                "required_field": "Yes",
                                "allow_multiple_answers": "No",
                            },
                            {
                                "key": "field2",
                                "answer": "value2",
                                "default": "",
                                "suggest": "",
                                "question": "Field 2",
                                "parameter": "",
                                "field_type": "String",
                                "visibility": "",
                                "required_field": "Yes",
                                "allow_multiple_answers": "No",
                            },
                            {
                                "key": "conditional_field",
                                "answer": "",
                                "default": "",
                                "suggest": "",
                                "question": "Conditional Field",
                                "parameter": "",
                                "field_type": "String",
                                "visibility": {
                                    "condition": {
                                        "operator": "AND",
                                        "left": {
                                            "left": {"field_key_ref": "field1"},
                                            "right": {"value": "value1"},
                                            "operator": "EQUAL",
                                        },
                                        "right": {
                                            "left": {"field_key_ref": "field2"},
                                            "right": {"value": "value2"},
                                            "operator": "EQUAL",
                                        },
                                    }
                                },
                                "required_field": "No",
                                "allow_multiple_answers": "No",
                            },
                        ],
                    }
                ],
            }
        )
        # Should not raise any validation error
        assert len(schema_with_defs.guardian_policy_schemas) == 1

    def test_visibility_reference_across_schemas_not_allowed(self):
        """Test that referencing fields from different schemas is caught"""
        # Note: The current implementation validates within each schema separately,
        # so this test ensures that cross-schema references are not allowed
        with pytest.raises(ValidationError) as exc_info:
            GuardianPolicySchemaWithDefinitions.model_validate(
                {
                    "guardian_policy_schemas": [
                        {
                            "schema_name": "Schema A",
                            "metadata": {
                                "description": "Schema A",
                                "schema_type": "Verifiable Credentials",
                            },
                            "schema_fields": [
                                {
                                    "key": "field_in_schema_a",
                                    "answer": "",
                                    "default": "",
                                    "suggest": "",
                                    "question": "Field in A",
                                    "parameter": "",
                                    "field_type": "String",
                                    "visibility": "",
                                    "required_field": "Yes",
                                    "allow_multiple_answers": "No",
                                },
                            ],
                        },
                        {
                            "schema_name": "Schema B",
                            "metadata": {
                                "description": "Schema B",
                                "schema_type": "Sub-Schema",
                            },
                            "schema_fields": [
                                {
                                    "key": "field_in_schema_b",
                                    "answer": "",
                                    "default": "",
                                    "suggest": "",
                                    "question": "Field in B",
                                    "parameter": "",
                                    "field_type": "String",
                                    "visibility": {
                                        "condition": {
                                            "left": {"field_key_ref": "field_in_schema_a"},
                                            "right": {"value": "some_value"},
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
            )

        error_msg = str(exc_info.value)
        assert "field_in_schema_a" in error_msg
        assert "Schema B" in error_msg

    def test_visibility_with_constant_values_only(self):
        """Test that visibility conditions with only constant values (no field refs) work"""
        # This is an edge case - while unusual, it should be valid
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
                                "key": "field1",
                                "answer": "",
                                "default": "",
                                "suggest": "",
                                "question": "Field 1",
                                "parameter": "",
                                "field_type": "String",
                                "visibility": {
                                    "condition": {
                                        "left": {"value": "constant1"},
                                        "right": {"value": "constant2"},
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
        )
        # Should not raise any validation error
        assert len(schema_with_defs.guardian_policy_schemas) == 1
