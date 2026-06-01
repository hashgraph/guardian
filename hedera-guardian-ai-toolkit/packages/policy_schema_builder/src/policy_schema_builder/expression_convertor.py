"""
Convert AST-like expression structures to Excel formulas.

Supports operators: EXACT, AND, OR
Supports value references via ref_to_value
"""

from typing import Literal, Union

from pydantic import BaseModel

from .models.guardian_policy_schema import ComparisonExpression


class CellReference(BaseModel):
    cell_ref: str


ExpressionLeaf = Union["Expression", str, CellReference, int, float, bool]


class Expression(BaseModel):
    operator: Literal["AND", "OR", "EQUAL", "ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"]
    left: ExpressionLeaf
    right: ExpressionLeaf


class ExpressionConverter:
    """Converts expression trees to Excel formulas."""

    def __init__(self):
        self.operator_mapping = {
            "AND": "AND",
            "OR": "OR",
            "EQUAL": "EXACT",
            "ADD": "+",
            "SUBTRACT": "-",
            "MULTIPLY": "*",
            "DIVIDE": "/",
        }

    def convert(self, expr: ComparisonExpression) -> str:
        # Base case: primitive value
        if not isinstance(expr, dict):
            return self._format_value(expr)

        # Handle cell reference dictionaries
        if "cell_ref" in expr:
            return expr["cell_ref"]

        operator = expr.get("operator", "").upper()

        if operator not in self.operator_mapping:
            raise ValueError(
                f"Unsupported operator: {operator}. Supported: {set(self.operator_mapping.keys())}"
            )

        # Binary operators
        left = expr.get("left")
        right = expr.get("right")

        if left is None or right is None:
            raise ValueError(f"{operator} operator requires both 'left' and 'right' operands")

        left_formula = self.convert(left)
        right_formula = self.convert(right)

        operator_symbol = self.operator_mapping[operator]

        # Arithmetic operators use infix notation (symbols)
        if operator_symbol in {"+", "-", "*", "/"}:
            return f"({left_formula}{operator_symbol}{right_formula})"

        # Function-style operators (AND, OR, EXACT)
        return f"{operator_symbol}({left_formula},{right_formula})"

    def _format_value(self, value: str | int | float | bool) -> str:
        """Format a primitive value for Excel formula."""
        if isinstance(value, bool):
            return "TRUE" if value else "FALSE"
        if isinstance(value, str):
            # Otherwise, wrap in quotes
            return f'"{value}"'
        if isinstance(value, CellReference):
            return value.cell_ref
        return str(value)


def convert_to_excel(expr: Expression, invert: bool = False) -> str:
    converter = ExpressionConverter()
    converted = converter.convert(expr.model_dump())

    if invert:
        return f"NOT({converted})"
    return converted


# Example usage and tests
if __name__ == "__main__":
    expr3 = {
        "operator": "AND",
        "left": {"operator": "EQUAL", "left": "LeftValue", "right": "RightValue"},
        "right": {
            "operator": "EQUAL",
            "left": "LeftValue2",
            "right": "RightValue2",  # Direct value, not a reference
        },
    }
    print("\nExample 3 - Mixed reference and direct value:")
    print(f"Expression: {expr3}")

    print(f"Result: {convert_to_excel(expr3)}")
    # Output: AND(EXACT(A1,100),EXACT(B1,"Active"))

    expr4 = {
        "operator": "OR",
        "left": {"operator": "EQUAL", "left": {"cell_ref": "A1"}, "right": "Active"},
        "right": {"operator": "EQUAL", "left": "Score", "right": 100},
    }

    print("\nExample 4 - Cell references:")
    print(f"Expression: {expr4}")
    print(f"Result: {convert_to_excel(expr4)}")
    # Output: OR(EXACT(A1,"Active"),EXACT(Score,100))
