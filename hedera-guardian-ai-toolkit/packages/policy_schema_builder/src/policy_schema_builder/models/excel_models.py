from collections.abc import Callable
from typing import Annotated, Any

from openpyxl.cell.cell import Cell
from openpyxl.worksheet.worksheet import Worksheet
from pydantic import BaseModel, Field, field_validator, model_validator


class FieldColumnParams(BaseModel):
    """
    Parameters for individual Excel cells.
    """

    value: str = Field(description="The content to be placed in the cell.")
    width: float | None = Field(default=None, description="The width of the column for this cell.")
    value_restrictions: list[str] | None = Field(
        default=None, description="List of allowed values for data validation."
    )


class MetadataParams(BaseModel):
    """
    Parameters for metadata key-value pairs.
    """

    key: str = Field(description="The metadata key name.")
    value: str | None = Field("", description="The metadata value.")
    value_restrictions: list[str] | None = Field(
        default=None, description="List of allowed values for data validation on the value field."
    )

    @model_validator(mode="after")
    def validate_value_against_restrictions(self):
        """Ensure value is in value_restrictions if defined"""
        if (
            self.value_restrictions is not None
            and self.value
            and self.value not in self.value_restrictions
        ):
            raise ValueError(
                f"Value '{self.value}' is not allowed. Must be one of: {self.value_restrictions}"
            )
        return self


class WorksheetNameParams(BaseModel):
    """
    Parameters for worksheet name configuration.
    """

    value: str = Field(description="The name of the worksheet.")


TableCell = Annotated[
    str | Callable[[Cell, Worksheet], str],
    Field(
        description="A row in the table, consisting of cell values or callables that modifies the cell."
    ),
]


class ExcelPolicySchemaParams(BaseModel):
    """
    Parameters for generating Excel policy schema.
    Supports nested rows for expandable/collapsible grouping.

    table_rows supports nested structures:
    - Regular row: [cell1, cell2, cell3, ...]
    - Nested rows (for grouping): [[row1], [row2], [[nested_row1], [nested_row2]]]
    """

    schema_name: str = Field(description="The unique name of the schema.")
    worksheet_name: WorksheetNameParams = Field(
        description="Configuration for the worksheet name. No longer limited to 30 chars."
    )
    metadata: list[MetadataParams] = Field(
        description="List of metadata key-value pairs for the schema."
    )
    table_columns: list[FieldColumnParams] = Field(
        description="List of column definitions for the table."
    )
    table_rows: list[Any] = Field(
        description="List of rows. Each row can be a list of cells (regular row) or a list of rows (nested/grouped rows)."
    )

    @field_validator("table_rows")
    @classmethod
    def validate_row_lengths(cls, v, info):
        """Validate that each data row has the same number of cells as there are columns."""
        if "table_columns" in info.data:
            expected_length = len(info.data["table_columns"])

            def validate_row_recursive(row, path=""):
                """Recursively validate row structure."""
                # Check by class name to handle both __main__ and module imports
                row_class_name = type(row).__name__

                # Handle Row instances (check by class name)
                if row_class_name == "Row" and hasattr(row, "values"):
                    if len(row.values) != expected_length:
                        raise ValueError(
                            f"Row at {path} has {len(row.values)} cells but {expected_length} columns are defined. "
                            f"Each data row must have exactly {expected_length} cells."
                        )
                    return

                # Handle SubRows instances (check by class name)
                if (
                    row_class_name == "SubRows"
                    and hasattr(row, "heading_row")
                    and hasattr(row, "subrows")
                ):
                    # Validate heading row
                    validate_row_recursive(row.heading_row, f"{path}.heading_row")
                    # Validate subrows
                    for i, subrow in enumerate(row.subrows):
                        validate_row_recursive(subrow, f"{path}.subrows[{i}]")
                    return

                # Handle list structures (backward compatibility)
                if not isinstance(row, list):
                    raise ValueError(f"Row at {path} must be a list, Row, or SubRows instance")

                # Check if this is empty list
                if len(row) == 0:
                    raise ValueError(f"Row at {path} is empty")

                # Check if this is a nested structure (all elements are lists)
                # But exclude cases where items are callables or non-list objects
                is_nested = all(isinstance(item, list) for item in row) and len(row) > 0

                if is_nested:
                    # This is a nested row structure - validate each sub-row
                    for i, sub_row in enumerate(row):
                        validate_row_recursive(sub_row, f"{path}[{i}]")
                # This is a data row - validate length
                elif len(row) != expected_length:
                    raise ValueError(
                        f"Row at {path} has {len(row)} cells but {expected_length} columns are defined. "
                        f"Each data row must have exactly {expected_length} cells."
                    )

            for i, row in enumerate(v):
                validate_row_recursive(row, f"row_{i}")
        return v
