import json
import logging
from pathlib import Path

from pydantic import TypeAdapter

from .models.guardian_policy_schema import GuardianPolicySchemas

logger = logging.getLogger(__name__)

# TypeAdapter for validating GuardianPolicySchemas
_guardian_policy_schemas_adapter = TypeAdapter(GuardianPolicySchemas)


class GuardianPolicySchemaJsonLoader:
    """
    Handles serialization and deserialization of GuardianPolicySchemas to/from JSON files.

    This class provides a clean separation of concerns for persisting and restoring
    Guardian policy schema definitions independently of the Excel builder logic.
    """

    def __init__(self, json_path: str | Path):
        """
        Initialize the loader with a path to the JSON file.

        Args:
            json_path: Path to the JSON file for storing/loading Guardian policy schemas
        """
        path = Path(json_path)
        self.json_path = path if str(path).endswith(".json") else path.with_suffix(".json")

    def save(self, guardian_policy_schemas: GuardianPolicySchemas) -> Path:
        """
        Save the Guardian policy schemas to the JSON file.

        Args:
            guardian_policy_schemas: List of GuardianPolicySchema to save

        Returns:
            Path: The absolute path to the saved JSON file

        Example:
            ```python
            loader = GuardianPolicySchemaJsonLoader("policy_schema.json")
            schemas = [schema1, schema2]
            saved_path = loader.save(schemas)
            ```
        """
        self.json_path.parent.mkdir(parents=True, exist_ok=True)

        # Serialize to JSON using TypeAdapter
        state_list = _guardian_policy_schemas_adapter.dump_python(
            guardian_policy_schemas, mode="json"
        )

        # Write to file with pretty formatting
        with open(self.json_path, "w", encoding="utf-8") as f:
            json.dump(state_list, f, indent=2, ensure_ascii=False)

        logger.info(f"Saved Guardian policy schema to: {self.json_path}")
        logger.info(f"Saved {len(guardian_policy_schemas)} schema(s)")

        return self.json_path.absolute()

    def load(self) -> list:
        """
        Load Guardian policy schemas from the JSON file as raw data.
        If the file doesn't exist, raises FileNotFoundError.

        Returns:
            list: The raw list of schema dictionaries

        Example:
            ```python
            loader = GuardianPolicySchemaJsonLoader("policy_schema.json")
            raw_schemas = loader.load()
            ```
        """
        # If file doesn't exist, raise FileNotFoundError
        if not self.json_path.exists():
            logger.info(f"Schema file not found: {self.json_path}")

            raise FileNotFoundError(f"Schema file not found: {self.json_path}")

        try:
            # Read JSON file
            with open(self.json_path, encoding="utf-8") as f:
                state_list = json.load(f)

            # Validate using TypeAdapter
            try:
                validated_schemas = _guardian_policy_schemas_adapter.validate_python(state_list)
                logger.info(f"Loaded {len(validated_schemas)} schema(s)")
            except Exception as e:
                logger.error(
                    f"Schema validation error during loading from file {self.json_path}: {e}"
                )

            logger.info(f"Loaded Guardian policy schema from: {self.json_path}")

            return state_list

        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in schema file: {e}") from e
        except Exception as e:
            raise ValueError(f"Failed to load Guardian policy schema: {e}") from e

    def delete_json_file(self) -> None:
        """
        Deletes the JSON file if it exists.
        """
        try:
            if self.json_path.exists():
                self.json_path.unlink()
                logger.info(f"Deleted JSON file: {self.json_path}")
            else:
                logger.info(f"JSON file does not exist, nothing to delete: {self.json_path}")
        except Exception as e:
            logger.error(f"Failed to delete JSON file: {e}")
