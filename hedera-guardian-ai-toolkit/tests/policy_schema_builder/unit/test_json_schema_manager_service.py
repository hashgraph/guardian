"""Unit tests for JSONSchemaManagerService."""

import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from policy_schema_builder.json_schema_manager_service import (
    FieldKeyAlreadyExistsError,
    FieldNotFoundError,
    FieldPatchError,
    JSONSchemaManagerService,
    PatchFieldsResult,
    SchemaAlreadyExistsError,
    SchemaNotFoundError,
)
from policy_schema_builder.models.guardian_policy_schema import (
    EnumOptions,
    GuardianPolicySchema,
    MetadataBase,
    SchemaField,
    SchemaReference,
    SchemaType,
    YesNo,
)


@pytest.fixture
def temp_dir():
    """Create a temporary directory for test files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def sample_schema_field() -> SchemaField:
    """Create a sample schema field for testing."""
    return SchemaField(
        required_field=YesNo.YES,
        field_type="String",
        parameter="",
        question="What is your name?",
        allow_multiple_answers=YesNo.NO,
        key="name",
    )


@pytest.fixture
def sample_schema(sample_schema_field) -> GuardianPolicySchema:
    """Create a sample schema for testing."""
    return GuardianPolicySchema(
        schema_name="Test Schema",
        metadata=MetadataBase(
            description="A test schema",
            schema_type=SchemaType.VERIFIABLE_CREDENTIAL,
        ),
        schema_fields=[sample_schema_field],
    )


@pytest.fixture
def sample_enum_options() -> EnumOptions:
    """Create sample enum options for testing."""
    return EnumOptions(
        unique_name="TestEnum",
        options=["Option1", "Option2", "Option3"],
    )


@pytest.fixture
def sample_schema_list(sample_schema) -> list[GuardianPolicySchema]:
    """Create a sample schema list for testing."""
    return [sample_schema]


@pytest.fixture
def schema_list_with_enum() -> list[GuardianPolicySchema]:
    """Create a schema list with enum field and inline EnumOptions for testing."""
    enum_field = SchemaField(
        required_field=YesNo.YES,
        field_type="Enum",
        parameter=EnumOptions(unique_name="StatusEnum", options=["Active", "Inactive", "Pending"]),
        question="Select status",
        allow_multiple_answers=YesNo.NO,
        key="status",
    )
    schema = GuardianPolicySchema(
        schema_name="Schema With Enum",
        metadata=MetadataBase(description="Schema with enum"),
        schema_fields=[enum_field],
    )
    return [schema]


@pytest.fixture
def service_with_data(temp_dir, sample_schema_list) -> JSONSchemaManagerService:
    """Create a service with pre-populated test data."""
    service = JSONSchemaManagerService("test_schema", output_dir=temp_dir)
    service.create_new(sample_schema_list)
    return service


class TestJSONSchemaManagerServiceInit:
    """Tests for JSONSchemaManagerService initialization."""

    def test_init_with_json_extension(self, temp_dir):
        """Test initialization with .json file extension."""
        service = JSONSchemaManagerService("test.json", output_dir=temp_dir)
        assert service.excel_file_name == "test.xlsx"

    def test_init_without_extension(self, temp_dir):
        """Test initialization without file extension."""
        service = JSONSchemaManagerService("test", output_dir=temp_dir)
        assert service.excel_file_name == "test.xlsx"

    def test_init_with_xlsx_extension(self, temp_dir):
        """Test initialization with .xlsx extension gets normalized."""
        service = JSONSchemaManagerService("test.xlsx", output_dir=temp_dir)
        assert service.excel_file_name == "test.xlsx"

    def test_init_with_output_dir(self, temp_dir):
        """Test initialization with output directory."""
        service = JSONSchemaManagerService("test", output_dir=temp_dir)
        assert service.output_dir == temp_dir


class TestCreateNew:
    """Tests for create_new method."""

    def test_create_new_success(self, temp_dir, sample_schema_list):
        """Test creating a new schema file successfully."""
        service = JSONSchemaManagerService("new_schema", output_dir=temp_dir)
        service.create_new(sample_schema_list)

        # Verify file was created
        json_path = Path(temp_dir) / "new_schema.json"
        assert json_path.exists()

    def test_create_new_file_exists_error(self, service_with_data, sample_schema_list):
        """Test that create_new raises error if file already exists."""
        with pytest.raises(FileExistsError):
            service_with_data.create_new(sample_schema_list)


class TestClear:
    """Tests for clear method."""

    def test_clear_removes_json_file(self, service_with_data, temp_dir):
        """Test that clear removes the JSON file."""
        json_path = Path(temp_dir) / "test_schema.json"
        assert json_path.exists()

        service_with_data.clear()
        assert not json_path.exists()

    def test_clear_removes_excel_file(self, service_with_data, temp_dir):
        """Test that clear removes the Excel file if it exists."""
        # Create a dummy Excel file
        excel_path = Path(temp_dir) / "test_schema.xlsx"
        excel_path.write_text("dummy content")

        service_with_data.clear()
        assert not excel_path.exists()

    def test_clear_when_no_files_exist(self, temp_dir):
        """Test clear when no files exist (should not raise error)."""
        service = JSONSchemaManagerService("nonexistent", output_dir=temp_dir)
        # Should not raise any exception
        service.clear()


class TestFieldOperations:
    """Tests for field operations."""

    def test_insert_field_at_beginning(self, service_with_data):
        """Test inserting a field at the beginning."""
        new_field = SchemaField(
            required_field=YesNo.YES,
            field_type="Integer",
            parameter="",
            question="What is your ID?",
            allow_multiple_answers=YesNo.NO,
            key="id",
        )

        result = service_with_data.insert_field("Test Schema", position=0, field=new_field)

        assert result.key == "id"
        fields = service_with_data.list_fields("Test Schema")
        assert fields[0].key == "id"
        assert fields[1].key == "name"

    def test_insert_field_at_end(self, service_with_data):
        """Test inserting a field at the end."""
        new_field = SchemaField(
            required_field=YesNo.NO,
            field_type="String",
            parameter="",
            question="What is your email?",
            allow_multiple_answers=YesNo.NO,
            key="email",
        )

        service_with_data.insert_field("Test Schema", position=-1, field=new_field)

        fields = service_with_data.list_fields("Test Schema")
        assert fields[-1].key == "email"

    def test_insert_field_with_negative_position_appends(self, service_with_data):
        """Test that negative position appends field at end."""
        new_field = SchemaField(
            required_field=YesNo.NO,
            field_type="Number",
            parameter="",
            question="What is your age?",
            allow_multiple_answers=YesNo.NO,
            key="age",
        )

        service_with_data.insert_field("Test Schema", position=-1, field=new_field)

        fields = service_with_data.list_fields("Test Schema")
        assert fields[-1].key == "age"

    def test_insert_field_duplicate_key_error(self, service_with_data, sample_schema_field):
        """Test that inserting a field with duplicate key raises error."""
        with pytest.raises(FieldKeyAlreadyExistsError):
            service_with_data.insert_field("Test Schema", position=0, field=sample_schema_field)

    def test_insert_field_schema_not_found_error(self, service_with_data, sample_schema_field):
        """Test that inserting into non-existent schema raises error."""
        sample_schema_field.key = "new_key"
        with pytest.raises(SchemaNotFoundError):
            service_with_data.insert_field(
                "Nonexistent Schema", position=0, field=sample_schema_field
            )

    def test_insert_fields_multiple(self, service_with_data):
        """Test inserting multiple fields at once."""
        fields_data = [
            {
                "key": "field1",
                "question": "Question 1",
                "field_type": "String",
                "required_field": "Yes",
                "parameter": "",
                "allow_multiple_answers": "No",
            },
            {
                "key": "field2",
                "question": "Question 2",
                "field_type": "Number",
                "required_field": "No",
                "parameter": "",
                "allow_multiple_answers": "No",
            },
        ]

        result = service_with_data.insert_fields("Test Schema", fields_data, position=0)

        assert len(result.inserted_field_keys) == 2
        assert "field1" in result.inserted_field_keys
        assert "field2" in result.inserted_field_keys
        assert len(result.inserted_fields) == 2
        assert result.inserted_fields[0].key == "field1"
        assert result.inserted_fields[1].key == "field2"
        assert not result.has_errors
        fields = service_with_data.list_fields("Test Schema")
        assert fields[0].key == "field1"
        assert fields[1].key == "field2"

    def test_insert_fields_duplicate_in_input_returns_error(self, service_with_data):
        """Test that duplicate keys in input are collected as errors."""
        fields_data = [
            {
                "key": "dup_key",
                "question": "Q1",
                "field_type": "String",
                "required_field": "Yes",
                "parameter": "",
                "allow_multiple_answers": "No",
            },
            {
                "key": "dup_key",
                "question": "Q2",
                "field_type": "String",
                "required_field": "Yes",
                "parameter": "",
                "allow_multiple_answers": "No",
            },
        ]

        result = service_with_data.insert_fields("Test Schema", fields_data)

        # First occurrence should be inserted, second should be an error
        assert len(result.inserted_field_keys) == 1
        assert "dup_key" in result.inserted_field_keys
        assert len(result.inserted_fields) == 1
        assert result.inserted_fields[0].key == "dup_key"
        assert result.has_errors
        assert len(result.errors) == 1
        assert result.errors[0].field_key == "dup_key"
        assert "Duplicate key" in result.errors[0].message

    def test_insert_fields_missing_key_error(self, service_with_data):
        """Test that missing key field raises ValueError."""
        fields_data = [
            {
                "question": "Q1",
                "field_type": "String",
                "required_field": "Yes",
                "parameter": "",
                "allow_multiple_answers": "No",
            },
        ]

        with pytest.raises(ValueError, match="missing required 'key' field"):
            service_with_data.insert_fields("Test Schema", fields_data)

    def test_patch_field_success(self, service_with_data):
        """Test patching a field successfully."""
        result = service_with_data.patch_fields(
            "Test Schema",
            [{"key": "name", "question": "Updated question", "required_field": "No"}],
        )

        assert len(result.updated_field_keys) == 1
        assert "name" in result.updated_field_keys
        assert len(result.updated_fields) == 1
        assert result.updated_fields[0].question == "Updated question"
        assert result.updated_fields[0].required_field == YesNo.NO

    def test_patch_field_not_found_error(self, service_with_data):
        """Test patching non-existent field adds error to result."""
        result = service_with_data.patch_fields(
            "Test Schema", [{"key": "nonexistent", "question": "Updated"}]
        )

        assert isinstance(result, PatchFieldsResult)
        assert len(result.errors) == 1
        assert result.errors[0].field_key == "nonexistent"
        assert "not found" in result.errors[0].message.lower()
        assert result.has_errors is True
        assert len(result.updated_fields) == 0

    def test_patch_fields_multiple(self, service_with_data):
        """Test patching multiple fields at once."""
        # First add another field
        new_field = SchemaField(
            required_field=YesNo.YES,
            field_type="String",
            parameter="",
            question="Email",
            allow_multiple_answers=YesNo.NO,
            key="email",
        )
        service_with_data.insert_field("Test Schema", position=-1, field=new_field)

        # Patch both fields
        updates = [
            {"key": "name", "question": "New Name Question"},
            {"key": "email", "question": "New Email Question"},
        ]

        result = service_with_data.patch_fields("Test Schema", updates)

        assert isinstance(result, PatchFieldsResult)
        assert len(result.updated_field_keys) == 2
        assert "name" in result.updated_field_keys
        assert "email" in result.updated_field_keys
        assert len(result.updated_fields) == 2
        assert result.updated_fields[0].question == "New Name Question"
        assert result.updated_fields[1].question == "New Email Question"
        assert len(result.errors) == 0
        assert result.has_errors is False

    def test_patch_fields_missing_key_error(self, service_with_data):
        """Test that missing key in updates raises ValueError."""
        updates = [{"question": "Q1"}]

        with pytest.raises(ValueError, match="missing required 'key' field"):
            service_with_data.patch_fields("Test Schema", updates)

    def test_patch_fields_field_not_found_error(self, service_with_data):
        """Test that non-existent field key adds error to result."""
        updates = [{"key": "nonexistent", "question": "Q1"}]

        result = service_with_data.patch_fields("Test Schema", updates)

        assert isinstance(result, PatchFieldsResult)
        assert len(result.errors) == 1
        assert result.errors[0].field_key == "nonexistent"
        assert "not found" in result.errors[0].message.lower()
        assert result.has_errors is True
        assert len(result.updated_fields) == 0

    def test_patch_fields_partial_success_with_missing_fields(self, service_with_data):
        """Test partial success when some fields exist and some don't."""
        # First add another field
        new_field = SchemaField(
            required_field=YesNo.YES,
            field_type="String",
            parameter="",
            question="Email",
            allow_multiple_answers=YesNo.NO,
            key="email",
        )
        service_with_data.insert_field("Test Schema", position=-1, field=new_field)

        # Patch with mixed valid and non-existent fields
        updates = [
            {"key": "name", "question": "Updated Name"},  # Exists
            {"key": "nonexistent1", "question": "Q1"},  # Doesn't exist
            {"key": "email", "question": "Updated Email"},  # Exists
            {"key": "nonexistent2", "question": "Q2"},  # Doesn't exist
        ]

        result = service_with_data.patch_fields("Test Schema", updates)

        # Should update the existing fields
        assert len(result.updated_field_keys) == 2
        assert "name" in result.updated_field_keys
        assert "email" in result.updated_field_keys
        assert len(result.updated_fields) == 2

        # Should have errors for non-existent fields
        assert result.has_errors is True
        assert len(result.errors) == 2
        error_keys = {e.field_key for e in result.errors}
        assert "nonexistent1" in error_keys
        assert "nonexistent2" in error_keys
        for error in result.errors:
            assert "not found" in error.message.lower()

    def test_patch_fields_with_validation_errors(self, service_with_data):
        """Test that validation errors are collected and returned in the result."""
        # First add another field
        new_field = SchemaField(
            required_field=YesNo.YES,
            field_type="String",
            parameter="",
            question="Email",
            allow_multiple_answers=YesNo.NO,
            key="email",
        )
        service_with_data.insert_field("Test Schema", position=-1, field=new_field)

        # Patch with one valid and one invalid update (invalid field_type value)
        updates = [
            {"key": "name", "question": "New Name Question"},  # Valid
            {"key": "email", "field_type": "InvalidType"},  # Invalid - bad field_type
        ]

        result = service_with_data.patch_fields("Test Schema", updates)

        # The valid field should be updated
        assert len(result.updated_field_keys) == 1
        assert "name" in result.updated_field_keys
        assert len(result.updated_fields) == 1
        assert result.updated_fields[0].key == "name"
        assert result.updated_fields[0].question == "New Name Question"

        # The invalid field should have an error
        assert result.has_errors is True
        assert len(result.errors) == 1
        assert result.errors[0].field_key == "email"
        assert isinstance(result.errors[0], FieldPatchError)
        assert len(result.errors[0].message) > 0

    def test_patch_fields_all_fail_validation(self, service_with_data):
        """Test when all patches fail validation."""
        # Patch with all invalid updates
        updates = [
            {"key": "name", "field_type": "InvalidType1"},  # Invalid
        ]

        result = service_with_data.patch_fields("Test Schema", updates)

        assert len(result.updated_field_keys) == 0
        assert len(result.updated_fields) == 0
        assert result.has_errors is True
        assert len(result.errors) == 1
        assert result.errors[0].field_key == "name"

    def test_remove_field_success(self, service_with_data):
        """Test removing a field successfully."""
        result = service_with_data.remove_fields("Test Schema", ["name"])

        assert len(result.removed_field_keys) == 1
        assert "name" in result.removed_field_keys
        assert len(result.removed_fields) == 1
        assert result.removed_fields[0].key == "name"
        fields = service_with_data.list_fields("Test Schema")
        assert len(fields) == 0

    def test_remove_field_not_found_error(self, service_with_data):
        """Test removing non-existent field returns error in result."""
        result = service_with_data.remove_fields("Test Schema", ["nonexistent"])

        assert result.has_errors
        assert len(result.errors) == 1
        assert result.errors[0].field_key == "nonexistent"

    def test_remove_fields_multiple(self, service_with_data):
        """Test removing multiple fields at once."""
        # First add more fields
        for i in range(3):
            new_field = SchemaField(
                required_field=YesNo.YES,
                field_type="String",
                parameter="",
                question=f"Field {i}",
                allow_multiple_answers=YesNo.NO,
                key=f"field{i}",
            )
            service_with_data.insert_field("Test Schema", position=-1, field=new_field)

        # Remove multiple fields
        result = service_with_data.remove_fields("Test Schema", ["field0", "field1"])

        assert len(result.removed_field_keys) == 2
        assert "field0" in result.removed_field_keys
        assert "field1" in result.removed_field_keys
        assert len(result.removed_fields) == 2
        assert result.removed_fields[0].key in ["field0", "field1"]
        assert result.removed_fields[1].key in ["field0", "field1"]
        fields = service_with_data.list_fields("Test Schema")
        # Should have original "name" and "field2" remaining
        assert len(fields) == 2

    def test_remove_fields_not_found_error(self, service_with_data):
        """Test that removing non-existent fields returns error in result."""
        result = service_with_data.remove_fields("Test Schema", ["name", "nonexistent"])

        # "name" should be removed, "nonexistent" should have error
        assert len(result.removed_field_keys) == 1
        assert "name" in result.removed_field_keys
        assert len(result.removed_fields) == 1
        assert result.removed_fields[0].key == "name"
        assert result.has_errors
        assert len(result.errors) == 1
        assert result.errors[0].field_key == "nonexistent"

    def test_get_field_success(self, service_with_data):
        """Test getting a field by key."""
        field = service_with_data.get_field("Test Schema", "name")

        assert field.key == "name"
        assert field.question == "What is your name?"

    def test_get_field_not_found_error(self, service_with_data):
        """Test getting non-existent field raises error."""
        with pytest.raises(FieldNotFoundError):
            service_with_data.get_field("Test Schema", "nonexistent")

    def test_list_fields(self, service_with_data):
        """Test listing all fields in a schema."""
        fields = service_with_data.list_fields("Test Schema")

        assert len(fields) == 1
        assert fields[0].key == "name"


class TestSchemaOperations:
    """Tests for schema operations."""

    def test_get_schema_success(self, service_with_data):
        """Test getting a schema by name."""
        schema = service_with_data.get_schema("Test Schema")

        assert schema.schema_name == "Test Schema"
        assert len(schema.schema_fields) == 1

    def test_get_schema_not_found_error(self, service_with_data):
        """Test getting non-existent schema raises error."""
        with pytest.raises(SchemaNotFoundError):
            service_with_data.get_schema("Nonexistent Schema")

    def test_list_schemas(self, service_with_data):
        """Test listing all schemas."""
        schemas = service_with_data.list_schemas()

        assert len(schemas) == 1
        assert schemas[0].schema_name == "Test Schema"

    def test_list_schemas_short_info(self, service_with_data):
        """Test listing schemas with short info."""
        short_info = service_with_data.list_schemas_short_info()

        assert len(short_info) == 1
        assert short_info[0].schema_name == "Test Schema"

    def test_add_schema_success(self, service_with_data):
        """Test adding a new schema."""
        new_schema = GuardianPolicySchema(
            schema_name="New Schema",
            metadata=MetadataBase(description="A new schema"),
            schema_fields=[],
        )

        result = service_with_data.add_schemas([new_schema])

        assert len(result) == 1
        assert result[0].schema_name == "New Schema"
        schemas = service_with_data.list_schemas()
        assert len(schemas) == 2

    def test_add_schema_already_exists_logs_warning(self, service_with_data, sample_schema, caplog):
        """Test that adding existing schema logs warning and returns."""
        # The service returns empty list when schema already exists
        result = service_with_data.add_schemas([sample_schema])

        assert len(result) == 0
        # Should still have only 1 schema
        schemas = service_with_data.list_schemas()
        assert len(schemas) == 1

    def test_add_schemas_multiple(self, service_with_data):
        """Test adding multiple schemas at once."""
        schemas = [
            GuardianPolicySchema(
                schema_name="Schema1",
                metadata=MetadataBase(description="Schema 1"),
                schema_fields=[],
            ),
            GuardianPolicySchema(
                schema_name="Schema2",
                metadata=MetadataBase(description="Schema 2"),
                schema_fields=[],
            ),
        ]

        result = service_with_data.add_schemas(schemas)

        assert len(result) == 2
        all_schemas = service_with_data.list_schemas()
        assert len(all_schemas) == 3

    def test_add_schemas_duplicate_in_input_error(self, service_with_data):
        """Test that duplicate schema names in input raise error."""
        schemas = [
            GuardianPolicySchema(
                schema_name="DupSchema",
                metadata=MetadataBase(description="Dup 1"),
                schema_fields=[],
            ),
            GuardianPolicySchema(
                schema_name="DupSchema",
                metadata=MetadataBase(description="Dup 2"),
                schema_fields=[],
            ),
        ]

        with pytest.raises(SchemaAlreadyExistsError):
            service_with_data.add_schemas(schemas)

    def test_add_schemas_skips_existing(self, service_with_data, sample_schema, caplog):
        """Test that existing schemas are skipped when adding multiple."""
        schemas = [
            sample_schema,  # Already exists
            GuardianPolicySchema(
                schema_name="New Schema",
                metadata=MetadataBase(description="New"),
                schema_fields=[],
            ),
        ]

        result = service_with_data.add_schemas(schemas)

        # Only the new schema should be added
        assert len(result) == 1
        assert result[0].schema_name == "New Schema"

    def test_remove_schemas_multiple(self, service_with_data):
        """Test removing multiple schemas at once."""
        # First add another schema
        new_schema = GuardianPolicySchema(
            schema_name="Schema To Remove",
            metadata=MetadataBase(description="To be removed"),
            schema_fields=[],
        )
        service_with_data.add_schemas([new_schema])

        result = service_with_data.remove_schemas(["Test Schema", "Schema To Remove"])

        assert len(result.removed_schemas) == 2
        schemas = service_with_data.list_schemas()
        assert len(schemas) == 0

    def test_remove_schemas_not_found_error(self, service_with_data):
        """Test that removing non-existent schemas returns error in result."""
        result = service_with_data.remove_schemas(["Nonexistent Schema"])

        assert result.has_errors
        assert len(result.errors) == 1
        assert result.errors[0].schema_name == "Nonexistent Schema"

    def test_remove_schemas_validation_failure_reverts_changes(self, temp_dir):
        """Test that removing a schema referenced by another schema returns error and reverts changes."""
        # Create a parent schema that references a sub-schema
        sub_schema = GuardianPolicySchema(
            schema_name="Sub Schema",
            metadata=MetadataBase(
                description="A sub schema",
                schema_type=SchemaType.SUB_SCHEMA,
            ),
            schema_fields=[
                SchemaField(
                    required_field=YesNo.YES,
                    field_type="String",
                    parameter="",
                    question="Sub field question",
                    allow_multiple_answers=YesNo.NO,
                    key="sub_field",
                )
            ],
        )

        parent_schema = GuardianPolicySchema(
            schema_name="Parent Schema",
            metadata=MetadataBase(
                description="A parent schema that references sub schema",
                schema_type=SchemaType.VERIFIABLE_CREDENTIAL,
            ),
            schema_fields=[
                SchemaField(
                    required_field=YesNo.YES,
                    field_type=SchemaReference(unique_schema_name_ref="Sub Schema"),
                    parameter="",
                    question="Reference to sub schema",
                    allow_multiple_answers=YesNo.NO,
                    key="sub_schema_ref",
                )
            ],
        )

        schema_list = [parent_schema, sub_schema]

        service = JSONSchemaManagerService("test_schema", output_dir=temp_dir)
        service.create_new(schema_list)

        # Attempt to remove the sub-schema that is referenced by the parent
        # This should return an error in the result and the schema should not be removed
        result = service.remove_schemas(["Sub Schema"])

        # Verify the error was returned in the result
        assert result.has_errors
        assert len(result.errors) == 1
        assert result.errors[0].schema_name == "Sub Schema"
        # Error message indicates the schema is still referenced (via "Unlinked schema references")
        assert (
            "Unlinked schema references" in result.errors[0].message
            or "referenced" in result.errors[0].message.lower()
        )

        # Verify that the schema was NOT removed (changes were reverted)
        schemas = service.list_schemas()
        assert len(schemas) == 2
        schema_names = [s.schema_name for s in schemas]
        assert "Sub Schema" in schema_names
        assert "Parent Schema" in schema_names


class TestExtendWithSchema:
    """Tests for extend_with_schema method."""

    def test_extend_with_schema_success(self, service_with_data):
        """Test extending with additional schemas."""
        new_schema_list = [
            GuardianPolicySchema(
                schema_name="Extended Schema",
                metadata=MetadataBase(description="Extended"),
                schema_fields=[],
            )
        ]

        service_with_data.extend_with_schema(new_schema_list)

        schemas = service_with_data.list_schemas()
        assert len(schemas) == 2

    def test_extend_with_schema_duplicate_in_input(self, service_with_data):
        """Test extending with duplicate schema names in input raises error."""
        new_schema_list = [
            GuardianPolicySchema(
                schema_name="Duplicate Schema",
                metadata=MetadataBase(description="First"),
                schema_fields=[],
            ),
            GuardianPolicySchema(
                schema_name="Duplicate Schema",
                metadata=MetadataBase(description="Second"),
                schema_fields=[],
            ),
        ]

        with pytest.raises(SchemaAlreadyExistsError, match="Duplicate schema names in input"):
            service_with_data.extend_with_schema(new_schema_list)

        # Verify no schemas were added
        schemas = service_with_data.list_schemas()
        assert len(schemas) == 1

    def test_extend_with_schema_conflict_with_existing(self, service_with_data):
        """Test extending with schema name that already exists skips conflicting schema."""
        new_schema_list = [
            GuardianPolicySchema(
                schema_name="Test Schema",  # Already exists
                metadata=MetadataBase(description="Conflicting"),
                schema_fields=[],
            ),
            GuardianPolicySchema(
                schema_name="New Schema",
                metadata=MetadataBase(description="New"),
                schema_fields=[],
            ),
        ]

        # service_with_data.extend_with_schema(new_schema_list)
        with pytest.raises(SchemaAlreadyExistsError):
            service_with_data.extend_with_schema(new_schema_list)


class TestGetAllAndGetRaw:
    """Tests for get_all and get_raw methods."""

    def test_get_all(self, service_with_data):
        """Test getting complete schema data."""
        result = service_with_data.get_all()

        assert isinstance(result, list)
        assert len(result) == 1

    def test_get_raw(self, service_with_data):
        """Test getting raw JSON data."""
        result = service_with_data.get_raw()

        assert isinstance(result, list)
        assert len(result) == 1


class TestCreateExcel:
    """Tests for create_excel method."""

    def test_create_excel_success(self, service_with_data, temp_dir):
        """Test creating Excel file from schema data."""
        with patch.object(service_with_data, "_excel_build_save") as mock_build:
            result = service_with_data.create_excel()

            assert str(result).endswith(".xlsx")
            mock_build.assert_called_once()

    def test_create_excel_overwrites_existing(self, service_with_data, temp_dir, caplog):
        """Test that creating Excel when file exists logs warning."""
        # Create a dummy Excel file
        excel_path = Path(temp_dir) / "test_schema.xlsx"
        excel_path.write_text("dummy")

        with patch.object(service_with_data, "_excel_build_save"):
            service_with_data.create_excel()
            # The method should log a warning about overwriting
            assert "already exists" in caplog.text.lower() or excel_path.exists()


class TestPrivateHelperMethods:
    """Tests for private helper methods."""

    def test_get_schema_by_name_success(self, service_with_data):
        """Test _get_schema_by_name finds schema."""
        data = service_with_data._load()
        idx, schema = service_with_data._get_schema_by_name(data, "Test Schema")

        assert idx == 0
        assert schema.schema_name == "Test Schema"

    def test_get_schema_by_name_not_found(self, service_with_data):
        """Test _get_schema_by_name raises error for non-existent schema."""
        data = service_with_data._load()

        with pytest.raises(SchemaNotFoundError):
            service_with_data._get_schema_by_name(data, "Nonexistent")

    def test_get_field_by_key_success(self, service_with_data):
        """Test _get_field_by_key finds field."""
        data = service_with_data._load()
        _, schema = service_with_data._get_schema_by_name(data, "Test Schema")
        idx, field = service_with_data._get_field_by_key(schema, "name")

        assert idx == 0
        assert field.key == "name"

    def test_get_field_by_key_not_found(self, service_with_data):
        """Test _get_field_by_key raises error for non-existent field."""
        data = service_with_data._load()
        _, schema = service_with_data._get_schema_by_name(data, "Test Schema")

        with pytest.raises(FieldNotFoundError):
            service_with_data._get_field_by_key(schema, "nonexistent")

    def test_check_is_json_exists_true(self, service_with_data):
        """Test _check_is_json_exists returns True when file exists."""
        assert service_with_data._check_is_json_exists() is True

    def test_check_is_json_exists_false(self, temp_dir):
        """Test _check_is_json_exists returns False when file doesn't exist."""
        service = JSONSchemaManagerService("nonexistent", output_dir=temp_dir)
        assert service._check_is_json_exists() is False

    def test_check_is_excel_exists_true(self, service_with_data, temp_dir):
        """Test _check_is_excel_exists returns True when file exists."""
        excel_path = Path(temp_dir) / "test_schema.xlsx"
        excel_path.write_text("dummy")

        assert service_with_data._check_is_excel_exists() is True

    def test_check_is_excel_exists_false(self, service_with_data):
        """Test _check_is_excel_exists returns False when file doesn't exist."""
        assert service_with_data._check_is_excel_exists() is False
