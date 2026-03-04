"""
Schema Manager Service for Guardian Policy Schema JSON files.

Provides CRUD operations for managing schema fields:
- Insert field at a specific position
- Patch field by key
- Add new schema
"""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import TypeAdapter

from .compound_excel_builder import CompoundExcelBuilder
from .guardian_policy_schema_json_loader import GuardianPolicySchemaJsonLoader
from .mapper import GuardianPolicySchemaToCompoundExcelMapper
from .models.guardian_policy_schema import (
    GuardianPolicySchema,
    GuardianPolicySchemas,
    SchemaField,
    SchemaReference,
)

# TypeAdapter for validating GuardianPolicySchemas
_guardian_policy_schemas_adapter = TypeAdapter(GuardianPolicySchemas)

logger = logging.getLogger(__name__)


def _extract_clean_error_message(error: Exception) -> str:
    """
    Extract a clean, user-friendly error message from an exception.

    For Pydantic ValidationError, extracts only the relevant error messages
    without internal function names or verbose details.
    """
    try:
        # Try to access errors() method (works for Pydantic ValidationError)
        error_list = error.errors()
        messages = []
        for err in error_list:
            msg = err.get("msg", "")
            # Get location if available (e.g., "schema_fields.2.field_type")
            loc = ".".join(str(x) for x in err.get("loc", []))
            if loc:
                messages.append(f"{loc}: {msg}")
            else:
                messages.append(msg)
        return "; ".join(messages)
    except AttributeError:
        # Not a Pydantic error, return string representation
        return str(error)


class SchemaNotFoundError(Exception):
    """Raised when a schema is not found by name."""

    pass


class FieldNotFoundError(Exception):
    """Raised when a field is not found by key."""

    pass


class FieldKeyAlreadyExistsError(Exception):
    """Raised when trying to insert a field with a key that already exists."""

    pass


class SchemaAlreadyExistsError(Exception):
    """Raised when trying to add a schema that already exists."""

    pass


@dataclass
class SchemaShortInfo:
    schema_name: str
    metadata: dict[str, Any]


@dataclass
class FieldShortInfo:
    key: str
    field_type: str
    question: str


@dataclass
class FieldPatchError:
    """Error information for a failed field patch."""

    field_key: str
    message: str


@dataclass
class FieldPatchWarning:
    """Warning information for a field patch."""

    field_key: str
    message: str


@dataclass
class FieldInsertError:
    """Error information for a failed field insertion."""

    field_key: str
    message: str


@dataclass
class PatchFieldsResult:
    """Result of patch_fields operation with validation errors."""

    updated_field_keys: list[str]
    updated_fields: list[SchemaField]
    errors: list[FieldPatchError]
    warnings: list[FieldPatchWarning]

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0

    @property
    def has_warnings(self) -> bool:
        return len(self.warnings) > 0


@dataclass
class InsertFieldsResult:
    """Result of insert_fields operation with validation errors."""

    inserted_field_keys: list[str]
    inserted_fields: list[SchemaField]
    errors: list[FieldInsertError]

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0


@dataclass
class FieldRemoveError:
    """Error information for a failed field removal."""

    field_key: str
    message: str


@dataclass
class FieldRemoveWarning:
    """Warning information for a field removal."""

    field_key: str
    message: str


@dataclass
class RemoveFieldsResult:
    """Result of remove_fields operation with validation errors."""

    removed_field_keys: list[str]
    removed_fields: list[SchemaField]
    errors: list[FieldRemoveError]
    warnings: list[FieldRemoveWarning]

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0

    @property
    def has_warnings(self) -> bool:
        return len(self.warnings) > 0


@dataclass
class SchemaRemoveError:
    """Error information for a failed schema removal."""

    schema_name: str
    message: str


@dataclass
class SchemaRemoveWarning:
    """Warning information for a schema removal."""

    schema_name: str
    message: str


@dataclass
class RemoveSchemasResult:
    """Result of remove_schemas operation with validation errors."""

    removed_schemas: list[GuardianPolicySchema]
    errors: list[SchemaRemoveError]
    removed_schema_names: list[str]
    warnings: list[SchemaRemoveWarning]

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0

    @property
    def has_warnings(self) -> bool:
        return len(self.warnings) > 0


class JSONSchemaManagerService:
    def __init__(self, file_name: str, output_dir: str = ""):
        """
        Initialize the schema manager service.

        Args:
            file_name: Name of the file (with or without extension).
                       Extension will be normalized to .json automatically.
            output_dir: Optional directory path where the JSON file is located.
                        If empty, uses current working directory.
        """
        # Remove any extension and ensure .json
        file_stem = Path(file_name).stem
        json_file_name = f"{file_stem}.json"
        self.excel_file_name = f"{file_stem}.xlsx"
        self.output_dir = output_dir

        json_file_path = Path(output_dir) / json_file_name if output_dir else Path(json_file_name)
        self._json_loader = GuardianPolicySchemaJsonLoader(json_file_path)
        self._schema_data: GuardianPolicySchemas | None = None

    def get_raw(self) -> list[Any]:
        """Get raw JSON schema data as a list."""
        return self._json_loader.load()

    def _load(self) -> GuardianPolicySchemas:
        """Load schema data from file."""
        raw_data = self.get_raw()
        return _guardian_policy_schemas_adapter.validate_python(raw_data)

    def _save(self, data: GuardianPolicySchemas) -> Path:
        """Save schema data to file."""
        return self._json_loader.save(data)

    def _get_schema_by_name(
        self, data: GuardianPolicySchemas, schema_name: str
    ) -> tuple[int, GuardianPolicySchema]:
        """
        Find a schema by name.

        Returns:
            Tuple of (index, schema)

        Raises:
            SchemaNotFoundError: If schema is not found
        """
        for idx, schema in enumerate(data):
            if schema.schema_name == schema_name:
                return idx, schema
        raise SchemaNotFoundError(f"Schema '{schema_name}' not found")

    def _get_field_by_key(
        self, schema: GuardianPolicySchema, field_key: str
    ) -> tuple[int, SchemaField]:
        """
        Find a field by key within a schema.

        Returns:
            Tuple of (index, field)

        Raises:
            FieldNotFoundError: If field is not found
        """
        for idx, field in enumerate(schema.schema_fields):
            if field.key == field_key:
                return idx, field
        raise FieldNotFoundError(
            f"Field with key '{field_key}' not found in schema '{schema.schema_name}'"
        )

    def _get_all_referenced_schema_names(self, data: GuardianPolicySchemas) -> set[str]:
        """
        Collect all schema names that are referenced by fields across all schemas.

        Returns:
            Set of schema names that are referenced via SchemaReference in field_type
        """
        referenced_schemas: set[str] = set()
        for schema in data:
            for field in schema.schema_fields:
                if isinstance(field.field_type, SchemaReference):
                    referenced_schemas.add(field.field_type.unique_schema_name_ref)
        return referenced_schemas

    def _check_is_json_exists(self) -> bool:
        """Check if the JSON file exists."""
        try:
            _ = self._json_loader.load()
            return True
        except FileNotFoundError:
            return False

    def _check_is_excel_exists(self) -> bool:
        """Check if the Excel file exists."""
        full_path = (
            Path(self.output_dir) / self.excel_file_name
            if self.output_dir
            else Path(self.excel_file_name)
        )
        return full_path.is_file()

    def create_new(self, guardian_policy_schemas: GuardianPolicySchemas) -> None:
        if self._check_is_json_exists():
            raise FileExistsError(
                "Cannot create new schema Excel file because it already exists. Please choose different file name or use update existing file."
            )

        """Create a new Guardian policy schema Excel file."""
        logger.info("Creating new Guardian policy schema Excel file.")

        validated_schemas = _guardian_policy_schemas_adapter.validate_python(
            guardian_policy_schemas
        )

        self._json_loader.save(validated_schemas)

        logger.info("Guardian policy schema Excel file created successfully.")

    def clear(self):
        """Remove existing Guardian policy schema Excel file."""
        if not self._check_is_json_exists():
            logger.warning("Excel file not found, nothing to remove.")
        else:
            logger.info("Removing existing Guardian policy schema Excel file.")
            self._json_loader.delete_json_file()

        if self._check_is_excel_exists():
            full_path = (
                Path(self.output_dir) / self.excel_file_name
                if self.output_dir
                else Path(self.excel_file_name)
            )
            full_path.unlink()
        else:
            logger.warning("Excel file not found, nothing to remove.")

    # ==================== Field Operations ====================

    def insert_field(
        self,
        schema_name: str,
        position: int,
        field: SchemaField,
    ) -> SchemaField:
        """
        Insert a new field at a specific position within a schema.

        Args:
            schema_name: Name of the schema to insert the field into
            position: Zero-based index where the field should be inserted.
                      Use -1 or a value >= len(fields) to append at the end.
            field: The SchemaField to insert

        Returns:
            The inserted SchemaField

        Raises:
            SchemaNotFoundError: If the schema is not found
            FieldKeyAlreadyExistsError: If a field with the same key already exists

        Example:
            ```python
            new_field = SchemaField(
                required_field=YesNo.YES,
                field_type="String",
                parameter="",
                question="What is your name?",
                allow_multiple_answers=YesNo.NO,
                key="name"
            )
            service.insert_field("test_VC", position=0, field=new_field)
            ```
        """
        data = self._load()
        schema_idx, schema = self._get_schema_by_name(data, schema_name)

        # Check for duplicate key
        existing_keys = {f.key for f in schema.schema_fields}
        if field.key in existing_keys:
            raise FieldKeyAlreadyExistsError(
                f"Field with key '{field.key}' already exists in schema '{schema_name}'"
            )

        # Handle position
        fields_count = len(schema.schema_fields)
        if position < 0 or position >= fields_count:
            position = fields_count  # Append at end

        # Insert field
        schema.schema_fields.insert(position, field)

        # Update and save
        data[schema_idx] = schema
        self._save(data)

        logger.info(
            f"Inserted field '{field.key}' at position {position} in schema '{schema_name}'"
        )
        return field

    def insert_fields(
        self,
        schema_name: str,
        fields: list[dict[str, Any]],
        position: int = -1,
    ) -> InsertFieldsResult:
        """
        Insert multiple fields into a schema at a specific position.

        Args:
            schema_name: Name of the schema to insert fields into
            fields: List of field dictionaries to insert
            position: Zero-based index where fields should be inserted.
                      Use -1 or a value >= len(fields) to append at the end.

        Returns:
            InsertFieldsResult with inserted fields and any errors

        Raises:
            SchemaNotFoundError: If the schema is not found
            ValueError: If any field is missing the required 'key' field
        """
        if position is None:
            position = -1

        data = self._load()
        schema_idx, schema = self._get_schema_by_name(data, schema_name)

        # Validate all fields have a "key" field
        for i, field_data in enumerate(fields):
            if "key" not in field_data:
                raise ValueError(f"Field at index {i} is missing required 'key' field")

        # Check for duplicate keys within the input and collect as errors
        input_keys = [f["key"] for f in fields]
        seen_keys: set[str] = set()
        duplicate_keys: set[str] = set()
        for key in input_keys:
            if key in seen_keys:
                duplicate_keys.add(key)
            seen_keys.add(key)

        # Track existing keys for conflict detection
        existing_keys = {f.key for f in schema.schema_fields}

        # Handle position
        fields_count = len(schema.schema_fields)
        if position < 0 or position >= fields_count:
            position = fields_count  # Append at end

        # Process each field individually with validation
        inserted_fields: list[SchemaField] = []
        errors: list[FieldInsertError] = []
        insert_offset = 0

        for field_data in fields:
            field_key = field_data["key"]

            # Check for duplicate key within input
            if field_key in duplicate_keys and field_key in [f.key for f in inserted_fields]:
                # Only report error for the second occurrence onwards
                errors.append(
                    FieldInsertError(
                        field_key=field_key,
                        message=f"Duplicate key '{field_key}' in input",
                    )
                )
                continue

            # Check for conflict with existing keys
            if field_key in existing_keys:
                errors.append(
                    FieldInsertError(
                        field_key=field_key,
                        message=f"Field with key '{field_key}' already exists in schema '{schema_name}'",
                    )
                )
                continue

            validated_field = None
            try:
                # Validate and create SchemaField
                validated_field = SchemaField.model_validate(field_data)

                # Temporarily insert for whole schema validation
                insert_position = position + insert_offset
                schema.schema_fields.insert(insert_position, validated_field)
                data[schema_idx] = schema

                # Validate the whole schema (including enum reference validation)
                _guardian_policy_schemas_adapter.validate_python(
                    _guardian_policy_schemas_adapter.dump_python(data),
                )

                # Validation passed, keep the change
                inserted_fields.append(validated_field)
                existing_keys.add(field_key)  # Track as now existing
                insert_offset += 1
                logger.debug(f"Successfully inserted field '{field_key}' in schema '{schema_name}'")

            except Exception as e:
                # Validation failed, revert this field's insertion
                if validated_field is not None and validated_field in schema.schema_fields:
                    schema.schema_fields.remove(validated_field)
                data[schema_idx] = schema

                error_message = _extract_clean_error_message(e)
                errors.append(FieldInsertError(field_key=field_key, message=error_message))
                logger.warning(
                    f"Failed to insert field '{field_key}' in schema '{schema_name}': {error_message}"
                )

        # Save changes (only successfully inserted fields are applied)
        if inserted_fields:
            self._save(data)
            logger.info(
                f"Inserted {len(inserted_fields)} field(s) to schema '{schema_name}' at position {position}: "
                f"{[f.key for f in inserted_fields]}"
            )

        if errors:
            logger.warning(
                f"Failed to insert {len(errors)} field(s) in schema '{schema_name}': "
                f"{[e.field_key for e in errors]}"
            )

        return InsertFieldsResult(
            inserted_field_keys=[f.key for f in inserted_fields],
            inserted_fields=inserted_fields,
            errors=errors,
        )

    def patch_fields(
        self,
        schema_name: str,
        field_updates: list[dict[str, Any]],
    ) -> PatchFieldsResult:
        """
        Patch multiple fields in a schema with partial updates.

        Args:
            schema_name: Name of the schema containing the fields to patch
            field_updates: List of dictionaries with field updates. Each must have a 'key' field.

        Returns:
            PatchFieldsResult with updated fields, errors (including missing fields), and warnings

        Raises:
            SchemaNotFoundError: If the schema is not found
            ValueError: If any update is missing the required 'key' field

        Note:
            Fields not found in the schema will be added to the errors list rather than raising an exception.
        """
        data = self._load()
        schema_idx, schema = self._get_schema_by_name(data, schema_name)

        # Validate all updates have a "key" field
        for i, update in enumerate(field_updates):
            if "key" not in update:
                raise ValueError(f"Update at index {i} is missing required 'key' field")

        # Build a map of field key to index for efficient lookup
        existing_keys = {f.key for f in schema.schema_fields}
        key_to_idx = {f.key: idx for idx, f in enumerate(schema.schema_fields)}

        # Apply updates one by one with validation after each
        updated_fields: list[SchemaField] = []
        errors: list[FieldPatchError] = []
        warnings: list[FieldPatchWarning] = []

        # Check for missing keys and add them to errors
        update_keys = {update["key"] for update in field_updates}
        missing_keys = update_keys - existing_keys
        for missing_key in sorted(missing_keys):
            errors.append(
                FieldPatchError(
                    field_key=missing_key,
                    message=f"Field not found in schema '{schema_name}'",
                )
            )
            logger.warning(f"Field '{missing_key}' not found in schema '{schema_name}'")

        # Filter out updates for missing keys before processing
        valid_field_updates = [
            update for update in field_updates if update["key"] not in missing_keys
        ]

        # Track original schema references for orphan detection
        original_schema_refs: dict[str, str] = {}  # field_key -> original schema ref name

        for update in valid_field_updates:
            field_key = update["key"]
            field_idx = key_to_idx[field_key]
            original_field = schema.schema_fields[field_idx]

            # Track if the original field had a schema reference
            if isinstance(original_field.field_type, SchemaReference):
                original_schema_refs[field_key] = original_field.field_type.unique_schema_name_ref

            # Create updated field by merging current data with updates (excluding "key")
            current_data = original_field.model_dump()
            updates_without_key = {k: v for k, v in update.items() if k != "key"}
            current_data.update(updates_without_key)

            try:
                # Validate and create new field
                updated_field = SchemaField.model_validate(current_data, extra="forbid")

                # Temporarily update in schema for whole schema validation
                schema.schema_fields[field_idx] = updated_field
                data[schema_idx] = schema

                # Validate the whole schema (including enum reference validation)
                _guardian_policy_schemas_adapter.validate_python(
                    _guardian_policy_schemas_adapter.dump_python(data),
                )

                # Validation passed, keep the change
                updated_fields.append(updated_field)
                logger.debug(f"Successfully patched field '{field_key}' in schema '{schema_name}'")

            except Exception as e:
                # Validation failed, revert this field's change
                schema.schema_fields[field_idx] = original_field
                data[schema_idx] = schema

                # Remove from tracking since the change was reverted
                original_schema_refs.pop(field_key, None)

                error_message = _extract_clean_error_message(e)
                errors.append(FieldPatchError(field_key=field_key, message=error_message))
                logger.warning(
                    f"Failed to patch field '{field_key}' in schema '{schema_name}': {error_message}"
                )

        # Save changes if any fields were updated
        if updated_fields:
            self._save(data)
            logger.info(
                f"Patched {len(updated_fields)} field(s) in schema '{schema_name}': "
                f"{[f.key for f in updated_fields]}"
            )

            # Check for orphaned schema references after patching
            all_referenced_schemas = self._get_all_referenced_schema_names(data)

            # Check if any patched field had a schema reference that is now orphaned
            for field_key, original_ref_schema_name in original_schema_refs.items():
                if original_ref_schema_name not in all_referenced_schemas:
                    warnings.append(
                        FieldPatchWarning(
                            field_key=field_key,
                            message=f"Warning: Schema '{original_ref_schema_name}' is not referenced anywhere",
                        )
                    )

        if errors:
            logger.warning(
                f"Failed to patch {len(errors)} field(s) in schema '{schema_name}': "
                f"{[e.field_key for e in errors]}"
            )

        return PatchFieldsResult(
            updated_field_keys=[f.key for f in updated_fields],
            updated_fields=updated_fields,
            errors=errors,
            warnings=warnings,
        )

    def remove_fields(
        self,
        schema_name: str,
        field_keys: list[str],
    ) -> RemoveFieldsResult:
        data = self._load()
        schema_idx, schema = self._get_schema_by_name(data, schema_name)

        removed_fields: list[SchemaField] = []
        errors: list[FieldRemoveError] = []
        warnings: list[FieldRemoveWarning] = []

        # Build a map of field key to field for efficient lookup
        key_to_field = {f.key: f for f in schema.schema_fields}

        for field_key in field_keys:
            # Check if field exists
            if field_key not in key_to_field:
                errors.append(
                    FieldRemoveError(
                        field_key=field_key,
                        message=f"Field '{field_key}' not found in schema '{schema_name}'",
                    )
                )
                continue

            # Store original fields for potential revert
            original_schema_fields = list(schema.schema_fields)
            field_to_remove = key_to_field[field_key]

            # Remove the field
            schema.schema_fields = [f for f in schema.schema_fields if f.key != field_key]
            data[schema_idx] = schema

            try:
                # Validate the whole schema (including enum reference validation)
                _guardian_policy_schemas_adapter.validate_python(
                    _guardian_policy_schemas_adapter.dump_python(data),
                )

                # Validation passed, keep the change
                removed_fields.append(field_to_remove)
                # Update key_to_field map since field is now removed
                del key_to_field[field_key]
                logger.debug(
                    f"Successfully removed field '{field_key}' from schema '{schema_name}'"
                )

            except Exception as e:
                # Validation failed, revert this field's removal
                schema.schema_fields = original_schema_fields
                data[schema_idx] = schema

                error_message = _extract_clean_error_message(e)
                errors.append(
                    FieldRemoveError(
                        field_key=field_key,
                        message=error_message,
                    )
                )
                logger.warning(
                    f"Failed to remove field '{field_key}' from schema '{schema_name}': {error_message}"
                )

        # Save changes if any fields were successfully removed
        if removed_fields:
            self._save(data)

            logger.info(
                f"Removed {len(removed_fields)} field(s) from schema '{schema_name}': "
                f"{[f.key for f in removed_fields]}"
            )

            # Check for orphaned schema references after removal
            all_referenced_schemas = self._get_all_referenced_schema_names(data)

            # Check if any removed field had a schema reference that is now orphaned
            for removed_field in removed_fields:
                if isinstance(removed_field.field_type, SchemaReference):
                    ref_schema_name = removed_field.field_type.unique_schema_name_ref
                    if ref_schema_name not in all_referenced_schemas:
                        warnings.append(
                            FieldRemoveWarning(
                                field_key=removed_field.key,
                                message=f"Warning: Schema '{ref_schema_name}' is not referenced anywhere",
                            )
                        )

        return RemoveFieldsResult(
            removed_field_keys=[f.key for f in removed_fields],
            removed_fields=removed_fields,
            errors=errors,
            warnings=warnings,
        )

    def get_field(
        self,
        schema_name: str,
        field_key: str,
    ) -> SchemaField:
        """
        Get a field by its key from a schema.

        Args:
            schema_name: Name of the schema containing the field
            field_key: Key of the field to retrieve

        Returns:
            The SchemaField

        Raises:
            SchemaNotFoundError: If the schema is not found
            FieldNotFoundError: If the field is not found
        """
        data = self._load()
        _, schema = self._get_schema_by_name(data, schema_name)
        _, field = self._get_field_by_key(schema, field_key)
        return field

    def get_fields_by_keys(
        self,
        schema_name: str,
        field_keys: list[str],
    ) -> list[SchemaField]:
        fields: list[SchemaField] = []

        for field_key in field_keys:
            field = self.get_field(schema_name, field_key)
            fields.append(field)

        return fields

    def list_fields(self, schema_name: str) -> list[SchemaField]:
        """
        List all fields in a schema.

        Args:
            schema_name: Name of the schema

        Returns:
            List of SchemaFields

        Raises:
            SchemaNotFoundError: If the schema is not found
        """
        data = self._load()
        _, schema = self._get_schema_by_name(data, schema_name)
        return schema.schema_fields

    def list_fields_short(self, schema_name: str) -> list[FieldShortInfo]:
        """
        List all fields in a schema with key, field_type, and question.

        Args:
            schema_name: Name of the schema

        Returns:
            List of FieldShortInfo containing key, field_type, and question (trimmed to 50 chars if needed)

        Raises:
            SchemaNotFoundError: If the schema is not found
        """
        data = self._load()
        _, schema = self._get_schema_by_name(data, schema_name)
        result = []
        for field in schema.schema_fields:
            question = field.question if field.question else ""
            if len(question) > 50:
                question = question[:50] + "..."
            result.append(
                FieldShortInfo(key=field.key, field_type=field.field_type, question=question)
            )
        return result

    # ==================== Schema Operations ====================

    def get_schema(self, schema_name: str) -> GuardianPolicySchema:
        """
        Get a schema by name.

        Args:
            schema_name: Name of the schema

        Returns:
            The GuardianPolicySchema

        Raises:
            SchemaNotFoundError: If the schema is not found
        """
        data = self._load()
        _, schema = self._get_schema_by_name(data, schema_name)
        return schema

    def list_schemas(self) -> list[GuardianPolicySchema]:
        """
        List all schemas.

        Returns:
            List of GuardianPolicySchema
        """
        return self._load()

    def list_schemas_short_info(self) -> list[SchemaShortInfo]:
        """
        List all schemas with short info (name and metadata).

        Returns:
            List of SchemaShortInfo
        """
        data = self._load()
        short_info_list = []
        for schema in data:
            short_info = SchemaShortInfo(schema_name=schema.schema_name, metadata=schema.metadata)
            short_info_list.append(short_info)
        return short_info_list

    def remove_schemas(self, schema_names: list[str]) -> RemoveSchemasResult:
        data = self._load()

        removed_schemas: list[GuardianPolicySchema] = []
        removed_schema_names: list[str] = []
        errors: list[SchemaRemoveError] = []
        warnings: list[SchemaRemoveWarning] = []

        # Build a map of schema name to schema for efficient lookup
        existing_names = {s.schema_name for s in data}
        name_to_schema = {s.schema_name: s for s in data}

        for schema_name in schema_names:
            # Check if schema exists
            if schema_name not in existing_names:
                errors.append(
                    SchemaRemoveError(
                        schema_name=schema_name,
                        message=f"Schema '{schema_name}' not found",
                    )
                )
                continue

            # Store original schemas for potential rollback
            original_schemas = data.copy()

            # Remove the schema
            data = [s for s in data if s.schema_name != schema_name]

            # Validate the resulting schema
            try:
                _guardian_policy_schemas_adapter.validate_python(
                    _guardian_policy_schemas_adapter.dump_python(data),
                )
                # Validation passed - schema successfully removed
                removed_schemas.append(name_to_schema[schema_name])
                removed_schema_names.append(schema_name)
                existing_names.discard(schema_name)
                logger.debug(f"Successfully removed schema '{schema_name}'")
            except Exception as e:
                # Revert changes on validation failure
                data = original_schemas
                error_msg = _extract_clean_error_message(e)
                errors.append(SchemaRemoveError(schema_name=schema_name, message=error_msg))
                logger.warning(f"Failed to remove schema '{schema_name}': {error_msg}")

        # Save if any schemas were successfully removed
        if removed_schemas:
            self._save(data)
            logger.info(
                f"Removed {len(removed_schemas)} schema(s): "
                f"{[s.schema_name for s in removed_schemas]}"
            )

            # Check for orphaned schema references after removal
            all_referenced_schemas = self._get_all_referenced_schema_names(data)

            # Check if any removed schema contained fields referencing schemas that are now orphaned
            for removed_schema in removed_schemas:
                for field in removed_schema.schema_fields:
                    if isinstance(field.field_type, SchemaReference):
                        ref_schema_name = field.field_type.unique_schema_name_ref
                        if ref_schema_name not in all_referenced_schemas:
                            warnings.append(
                                SchemaRemoveWarning(
                                    schema_name=removed_schema.schema_name,
                                    message=f"Warning: Schema '{ref_schema_name}' is not referenced anywhere",
                                )
                            )

        return RemoveSchemasResult(
            removed_schemas=removed_schemas,
            removed_schema_names=removed_schema_names,
            errors=errors,
            warnings=warnings,
        )

    def add_schemas(self, schemas: list[GuardianPolicySchema]) -> list[GuardianPolicySchema]:
        """
        Add multiple schemas at once.

        All schema names must be unique (both among themselves and with existing schemas),
        otherwise an error is raised and no changes are made.

        Args:
            schemas: List of GuardianPolicySchema objects to add

        Returns:
            List of added GuardianPolicySchema objects

        Raises:
            SchemaAlreadyExistsError: If any schema name already exists or if there
                                      are duplicate names in the input (no changes are made)

        Example:
            ```python
            schemas = [
                GuardianPolicySchema(
                    schema_name="schema1",
                    metadata=MetadataBase(description="First schema"),
                    schema_fields=[]
                ),
                GuardianPolicySchema(
                    schema_name="schema2",
                    metadata=MetadataBase(description="Second schema"),
                    schema_fields=[]
                )
            ]
            service.add_schemas(schemas)
            ```
        """
        data = self._load()

        # Check for duplicate names within the input
        input_names = [s.schema_name for s in schemas]
        if len(input_names) != len(set(input_names)):
            duplicates = [n for n in input_names if input_names.count(n) > 1]
            raise SchemaAlreadyExistsError(
                f"Duplicate schema names in input: {sorted(set(duplicates))}"
            )

        # Check for conflicts with existing schemas
        existing_names = {s.schema_name for s in data}
        conflicting_names = set(input_names) & existing_names
        if conflicting_names:
            logger.warning(
                f"Schema(s) with name(s) {sorted(conflicting_names)} already exist. "
                f"These will be skipped."
            )

        schemas = [s for s in schemas if s.schema_name not in conflicting_names]

        # Add all schemas
        data.extend(schemas)
        self._save(data)

        logger.info(f"Added {len(schemas)} schema(s): {[s.schema_name for s in schemas]}")
        return schemas

    def extend_with_schema(self, guardian_policy_schemas: list[dict[str, Any]]) -> None:
        """
        Append schemas to the existing schema file.

        Args:
            guardian_policy_schemas: List of GuardianPolicySchema to append

        Raises:
            SchemaAlreadyExistsError: If there are duplicate schema names within the input
        """
        data = self._load()

        guardian_policy_schemas: GuardianPolicySchemas = (
            _guardian_policy_schemas_adapter.validate_python(
                guardian_policy_schemas,
                context={
                    "skip_schema_to_subschema_reference_validation": True,
                    "skip_visibility_validation": True,
                },
            )
        )

        # Check for duplicate names within the input
        input_names = [s.schema_name for s in guardian_policy_schemas]
        if len(input_names) != len(set(input_names)):
            duplicates = [n for n in input_names if input_names.count(n) > 1]
            raise SchemaAlreadyExistsError(
                f"Duplicate schema names in input: {sorted(set(duplicates))}"
            )

        # Check for conflicts with existing schemas
        existing_names = {s.schema_name for s in data}
        conflicting_names = set(input_names) & existing_names
        if conflicting_names:
            raise SchemaAlreadyExistsError(
                f"Schema(s) with name(s) {sorted(conflicting_names)} already exist."
            )

        # Filter out conflicting schemas
        schemas_to_add = [
            s for s in guardian_policy_schemas if s.schema_name not in conflicting_names
        ]

        # Extend only with non-conflicting schemas
        data.extend(schemas_to_add)

        validated_data = _guardian_policy_schemas_adapter.validate_python(
            _guardian_policy_schemas_adapter.dump_python(data),
        )

        self._save(validated_data)

        logger.info(f"Extended schema with {len(schemas_to_add)} schema(s)")

    def get_all(self) -> GuardianPolicySchemas:
        """
        Get the complete schema data including all schemas.

        Returns:
            GuardianPolicySchemas (list of GuardianPolicySchema)
        """
        return self._load()

    def _excel_build_save(self, guardian_policy_schemas: GuardianPolicySchemas) -> None:
        _guardian_policy_schemas_adapter.validate_python(guardian_policy_schemas)

        compound_params = GuardianPolicySchemaToCompoundExcelMapper.map(
            guardian_policy_schemas,
            file_name=self.excel_file_name,
        )
        builder = CompoundExcelBuilder(compound_params)
        builder.build()
        builder.save(output_dir=self.output_dir)

    def create_excel(self) -> Path:
        if self._check_is_excel_exists():
            logger.warning("Excel file already exists and will be overwritten.")

        data = self._load()
        self._excel_build_save(data)

        return Path(self.output_dir) / self.excel_file_name


if __name__ == "__main__":
    type_c_sub_schemas = [
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
                        "unique_name": "TypeEnum3",
                        "options": ["Type-A3", "Type-B3", "Type-C3"],
                    },
                    "field_type": "Enum",
                    "visibility": "",
                    "required_field": "Yes",
                    "allow_multiple_answers": "No",
                },
            ],
        },
    ]

    type_a_sub_schemas = [
        {
            "metadata": {
                "description": "Sub-schema containing fields specific to Type-A",
                "schema_type": "Sub-Schema",
            },
            "schema_name": "Type-A Sub-Schema",
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
    ]

    type_b_sub_schemas = [
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
                        "unique_name": "TypeEnum2",
                        "options": ["Type-A2", "Type-B2", "Type-C2"],
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
    ]

    root_verifiable_credentials_schemas = [
        {
            "metadata": {
                "description": "Demonstrates nested schemas with conditional visibility based on type selection",
                "schema_type": "Verifiable Credentials",
            },
            "schema_name": "Test Root Schema",
            "schema_fields": [
                {
                    "key": "id",
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
                    "key": "name",
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
                                "left": {"field_key_ref": "type"},
                                "right": {"value": "Type-A"},
                                "operator": "EQUAL",
                            },
                            "right": {
                                "left": {"field_key_ref": "type"},
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
                    "key": "type_b_data",
                    "answer": "",
                    "default": "",
                    "suggest": "",
                    "question": "Type-B Specific Data",
                    "parameter": "",
                    "field_type": {"unique_schema_name_ref": "Type-B Sub-Schema"},
                    "visibility": {
                        "condition": {
                            "left": {"field_key_ref": "type"},
                            "right": {"value": "Type-B"},
                            "operator": "EQUAL",
                        }
                    },
                    "required_field": "No",
                    "allow_multiple_answers": "No",
                },
            ],
        },
        *type_a_sub_schemas,
        *type_b_sub_schemas,
        *type_c_sub_schemas,
    ]

    root_2_verifiable_credentials_schemas = [
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
                },
                {
                    "key": "another_enum_field",
                    "answer": "Option1",
                    "default": "",
                    "suggest": "",
                    "question": "Another Enum Field",
                    "parameter": {"unique_name": "AnotherEnum", "options": ["Option1", "Option2"]},
                    "field_type": "Enum",
                    "visibility": "",
                    "required_field": "Yes",
                    "allow_multiple_answers": "No",
                },
            ],
        }
    ]

    worksheet_file_name = "Test_Root_Schema_SCHEMA_MANAGER.xlsx"
    schema_manager_service = JSONSchemaManagerService(
        worksheet_file_name,
        output_dir="./data/output",
    )

    schema_manager_service.clear()

    schema_manager_service.create_new(
        TypeAdapter(GuardianPolicySchemas).validate_python(root_verifiable_credentials_schemas)
    )

    schema_manager_service.extend_with_schema(
        TypeAdapter(GuardianPolicySchemas).validate_python(root_2_verifiable_credentials_schemas)
    )

    ### REMOVE OPERATIONS TESTS ###

    # schenario 2: remove enum ref field which exist (should be successfully)
    # print('-------------------\n\n')
    # res = schema_manager_service.remove_fields('Another Root Schema', ['another_enum_field'])
    # print(res.errors)
    # print('-------------------\n\n')

    # schenario 3: remove whole schema with ref to enum (should remove successfully)
    # print('-------------------\n\n')
    # res = schema_manager_service.remove_schemas(['Another Root Schema'])
    # print(res.errors)
    # print('-------------------\n\n')

    # scenario 4: remove whole schema that referenced by another schemas (should be error)
    # print('-------------------\n\n')
    # res = schema_manager_service.remove_schemas(['Type-C Sub-Schema'])
    # print(res)
    # print('-------------------\n\n')

    # schenario 4.1: remove ref first, then remove schema
    # print('-------------------\n\n')
    # res = schema_manager_service.remove_fields('Type-B Sub-Schema', ['nested_type_c_data'])
    # print(res.warnings)
    # res = schema_manager_service.remove_schemas(['Type-C Sub-Schema'])
    # print(res)
    # print('-------------------\n\n')

    # schenario 5: remove whole schema but is referenced by other schemas (should be error)
    # print('-------------------\n\n')
    # res = schema_manager_service.remove_schemas(['Type-B Sub-Schema'])
    # print(res.errors)
    # print('-------------------\n\n')

    # print('-------------------\n\n')
    # res = schema_manager_service.remove_fields('Type-B Sub-Schema', ['sub_type_a_enum'])
    # print(res.warnings)

    # schenario 5.1: remove all refs to 'Type-B Sub-Schema'
    # print('-------------------\n\n')
    # res = schema_manager_service.remove_fields('Test Root Schema', ['type_b_data'])
    # print(res.warnings)
    # res = schema_manager_service.remove_fields('Type-A Sub-Schema', ['nested_type_b_data'])
    # print(res.warnings)
    # res = schema_manager_service.remove_schemas(['Type-B Sub-Schema'])
    # print(res.warnings)
    # print('-------------------\n\n')

    ### REMOVE OPERATIONS TESTS ###

    ### PATCH OPERATIONS TESTS ###

    # print('-------------------\n\n')
    # print("Testing insert_fields with Enum type (should succeed):")
    # res = schema_manager_service.patch_fields(
    #     "Another Root Schema",
    #     [
    #         {
    #             "key": "another_enum_field1",
    #             "parameter": {"options": ["Option1", "Option2", 'Option3'], "unique_name": "AnotherEnum"},
    #             "question": "Updated Another Enum Field Question",
    #         },
    #         {
    #             "key": "another_enum_field",
    #             "parameter": {"options": ["Option1", "Option2", 'Option3'], "unique_name": "AnotherEnum"},
    #             "question": "Updated Another Enum Field Question",
    #         },
    #     ],
    # )
    # print(f"{res}")
    # print('-------------------\n\n')

    # print('-------------------\n\n')
    # res = schema_manager_service.patch_fields("Type-B Sub-Schema", [
    #     {
    #         "key": "nested_type_c_data",
    #         "question": "New Sub-Schema Field Question",
    #         "field_type": {"unique_schema_name_ref": "werwer"},
    #         "required_field": "No",
    #         "parameter": "",
    #         "allow_multiple_answers": "No"
    #     },
    #   ])
    # print(res.warnings)
    # print('-------------------\n\n')

    # print("-------------------\n\n")
    # res = schema_manager_service.list_fields_short("Type-B Sub-Schema")
    # print(res)
    # print("-------------------\n\n")

    schema_manager_service.create_excel()
