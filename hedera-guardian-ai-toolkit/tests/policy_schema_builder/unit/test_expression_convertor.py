"""Unit tests for ExpressionConverter"""

import pytest

from policy_schema_builder.expression_convertor import (
    CellReference,
    Expression,
    ExpressionConverter,
    convert_to_excel,
)


class TestCellReference:
    """Tests for CellReference model"""

    def test_create_cell_reference(self):
        """Test creating a cell reference"""
        cell_ref = CellReference(cell_ref="A1")
        assert cell_ref.cell_ref == "A1"

    def test_cell_reference_validation(self):
        """Test cell reference model validation"""
        cell_ref = CellReference(cell_ref="Sheet1!B5")
        assert cell_ref.cell_ref == "Sheet1!B5"


class TestExpression:
    """Tests for Expression model"""

    def test_create_expression_equal(self):
        """Test creating an EQUAL expression"""
        expr = Expression(operator="EQUAL", left="A1", right="B1")
        assert expr.operator == "EQUAL"
        assert expr.left == "A1"
        assert expr.right == "B1"

    def test_create_expression_and(self):
        """Test creating an AND expression"""
        expr = Expression(operator="AND", left=True, right=False)
        assert expr.operator == "AND"

    def test_create_expression_arithmetic(self):
        """Test creating arithmetic expressions"""
        expr_add = Expression(operator="ADD", left=10, right=20)
        assert expr_add.operator == "ADD"

        expr_subtract = Expression(operator="SUBTRACT", left=100, right=50)
        assert expr_subtract.operator == "SUBTRACT"

        expr_multiply = Expression(operator="MULTIPLY", left=5, right=3)
        assert expr_multiply.operator == "MULTIPLY"

        expr_divide = Expression(operator="DIVIDE", left=10, right=2)
        assert expr_divide.operator == "DIVIDE"

    def test_create_nested_expression(self):
        """Test creating nested expressions"""
        inner_expr = Expression(operator="EQUAL", left="A1", right="B1")
        outer_expr = Expression(operator="AND", left=inner_expr, right=True)
        assert isinstance(outer_expr.left, Expression)

    def test_expression_with_cell_reference(self):
        """Test expression with CellReference"""
        cell_ref = CellReference(cell_ref="A1")
        expr = Expression(operator="EQUAL", left=cell_ref, right="value")
        assert isinstance(expr.left, CellReference)


class TestExpressionConverterFormatValue:
    """Tests for _format_value method"""

    def test_format_boolean_true(self):
        """Test formatting boolean True"""
        converter = ExpressionConverter()
        result = converter._format_value(True)
        assert result == "TRUE"

    def test_format_boolean_false(self):
        """Test formatting boolean False"""
        converter = ExpressionConverter()
        result = converter._format_value(False)
        assert result == "FALSE"

    def test_format_string(self):
        """Test formatting string values"""
        converter = ExpressionConverter()
        result = converter._format_value("Active")
        assert result == '"Active"'

    def test_format_string_with_quotes(self):
        """Test formatting string with special characters"""
        converter = ExpressionConverter()
        result = converter._format_value('Test "value"')
        assert result == '"Test "value""'

    def test_format_integer(self):
        """Test formatting integer values"""
        converter = ExpressionConverter()
        result = converter._format_value(42)
        assert result == "42"

    def test_format_float(self):
        """Test formatting float values"""
        converter = ExpressionConverter()
        result = converter._format_value(3.14)
        assert result == "3.14"

    def test_format_negative_number(self):
        """Test formatting negative numbers"""
        converter = ExpressionConverter()
        result = converter._format_value(-100)
        assert result == "-100"

    def test_format_cell_reference(self):
        """Test formatting CellReference"""
        converter = ExpressionConverter()
        cell_ref = CellReference(cell_ref="B5")
        result = converter._format_value(cell_ref)
        assert result == "B5"


class TestExpressionConverterConvertSimple:
    """Tests for convert method with simple expressions"""

    def test_convert_equal_strings(self):
        """Test converting EQUAL operator with strings"""
        converter = ExpressionConverter()
        expr = {"operator": "EQUAL", "left": "Status", "right": "Active"}
        result = converter.convert(expr)
        assert result == 'EXACT("Status","Active")'

    def test_convert_equal_numbers(self):
        """Test converting EQUAL operator with numbers"""
        converter = ExpressionConverter()
        expr = {"operator": "EQUAL", "left": 100, "right": 50}
        result = converter.convert(expr)
        assert result == "EXACT(100,50)"

    def test_convert_equal_booleans(self):
        """Test converting EQUAL operator with booleans"""
        converter = ExpressionConverter()
        expr = {"operator": "EQUAL", "left": True, "right": False}
        result = converter.convert(expr)
        assert result == "EXACT(TRUE,FALSE)"

    def test_convert_equal_with_cell_reference(self):
        """Test converting EQUAL with cell reference"""
        converter = ExpressionConverter()
        expr = {"operator": "EQUAL", "left": {"cell_ref": "A1"}, "right": "Active"}
        result = converter.convert(expr)
        assert result == 'EXACT(A1,"Active")'

    def test_convert_and_operator(self):
        """Test converting AND operator"""
        converter = ExpressionConverter()
        expr = {"operator": "AND", "left": True, "right": False}
        result = converter.convert(expr)
        assert result == "AND(TRUE,FALSE)"

    def test_convert_or_operator(self):
        """Test converting OR operator"""
        converter = ExpressionConverter()
        expr = {"operator": "OR", "left": True, "right": False}
        result = converter.convert(expr)
        assert result == "OR(TRUE,FALSE)"


class TestExpressionConverterConvertArithmetic:
    """Tests for convert method with arithmetic expressions"""

    def test_convert_add(self):
        """Test converting ADD operator"""
        converter = ExpressionConverter()
        expr = {"operator": "ADD", "left": 10, "right": 20}
        result = converter.convert(expr)
        assert result == "(10+20)"

    def test_convert_subtract(self):
        """Test converting SUBTRACT operator"""
        converter = ExpressionConverter()
        expr = {"operator": "SUBTRACT", "left": 100, "right": 50}
        result = converter.convert(expr)
        assert result == "(100-50)"

    def test_convert_multiply(self):
        """Test converting MULTIPLY operator"""
        converter = ExpressionConverter()
        expr = {"operator": "MULTIPLY", "left": 5, "right": 3}
        result = converter.convert(expr)
        assert result == "(5*3)"

    def test_convert_divide(self):
        """Test converting DIVIDE operator"""
        converter = ExpressionConverter()
        expr = {"operator": "DIVIDE", "left": 10, "right": 2}
        result = converter.convert(expr)
        assert result == "(10/2)"

    def test_convert_arithmetic_with_cell_refs(self):
        """Test converting arithmetic with cell references"""
        converter = ExpressionConverter()
        expr = {"operator": "ADD", "left": {"cell_ref": "A1"}, "right": {"cell_ref": "B1"}}
        result = converter.convert(expr)
        assert result == "(A1+B1)"

    def test_convert_complex_arithmetic(self):
        """Test converting nested arithmetic expressions"""
        converter = ExpressionConverter()
        # (A1 + B1) * C1
        expr = {
            "operator": "MULTIPLY",
            "left": {"operator": "ADD", "left": {"cell_ref": "A1"}, "right": {"cell_ref": "B1"}},
            "right": {"cell_ref": "C1"},
        }
        result = converter.convert(expr)
        assert result == "((A1+B1)*C1)"


class TestExpressionConverterConvertNested:
    """Tests for convert method with nested expressions"""

    def test_convert_nested_and(self):
        """Test converting nested AND expressions"""
        converter = ExpressionConverter()
        expr = {
            "operator": "AND",
            "left": {"operator": "EQUAL", "left": "Status", "right": "Active"},
            "right": {"operator": "EQUAL", "left": "Type", "right": "Premium"},
        }
        result = converter.convert(expr)
        assert result == 'AND(EXACT("Status","Active"),EXACT("Type","Premium"))'

    def test_convert_nested_or(self):
        """Test converting nested OR expressions"""
        converter = ExpressionConverter()
        expr = {
            "operator": "OR",
            "left": {"operator": "EQUAL", "left": {"cell_ref": "A1"}, "right": "Active"},
            "right": {"operator": "EQUAL", "left": {"cell_ref": "B1"}, "right": 100},
        }
        result = converter.convert(expr)
        assert result == 'OR(EXACT(A1,"Active"),EXACT(B1,100))'

    def test_convert_deeply_nested(self):
        """Test converting deeply nested expressions"""
        converter = ExpressionConverter()
        # AND(OR(A=B, C=D), E=F)
        expr = {
            "operator": "AND",
            "left": {
                "operator": "OR",
                "left": {"operator": "EQUAL", "left": "A", "right": "B"},
                "right": {"operator": "EQUAL", "left": "C", "right": "D"},
            },
            "right": {"operator": "EQUAL", "left": "E", "right": "F"},
        }
        result = converter.convert(expr)
        assert result == 'AND(OR(EXACT("A","B"),EXACT("C","D")),EXACT("E","F"))'

    def test_convert_mixed_operators(self):
        """Test converting mixed logical and arithmetic operators"""
        converter = ExpressionConverter()
        # EQUAL((A1+B1), 100)
        expr = {
            "operator": "EQUAL",
            "left": {"operator": "ADD", "left": {"cell_ref": "A1"}, "right": {"cell_ref": "B1"}},
            "right": 100,
        }
        result = converter.convert(expr)
        assert result == "EXACT((A1+B1),100)"


class TestExpressionConverterConvertPrimitive:
    """Tests for convert method with primitive values"""

    def test_convert_string_primitive(self):
        """Test converting primitive string"""
        converter = ExpressionConverter()
        result = converter.convert("test")
        assert result == '"test"'

    def test_convert_integer_primitive(self):
        """Test converting primitive integer"""
        converter = ExpressionConverter()
        result = converter.convert(42)
        assert result == "42"

    def test_convert_float_primitive(self):
        """Test converting primitive float"""
        converter = ExpressionConverter()
        result = converter.convert(3.14)
        assert result == "3.14"

    def test_convert_boolean_primitive(self):
        """Test converting primitive boolean"""
        converter = ExpressionConverter()
        result = converter.convert(True)
        assert result == "TRUE"
        result = converter.convert(False)
        assert result == "FALSE"


class TestExpressionConverterErrors:
    """Tests for error handling"""

    def test_unsupported_operator(self):
        """Test error on unsupported operator"""
        converter = ExpressionConverter()
        expr = {"operator": "INVALID", "left": "A", "right": "B"}
        with pytest.raises(ValueError, match="Unsupported operator: INVALID"):
            converter.convert(expr)

    def test_missing_left_operand(self):
        """Test error on missing left operand"""
        converter = ExpressionConverter()
        expr = {"operator": "EQUAL", "right": "B"}
        with pytest.raises(ValueError, match="requires both 'left' and 'right' operands"):
            converter.convert(expr)

    def test_missing_right_operand(self):
        """Test error on missing right operand"""
        converter = ExpressionConverter()
        expr = {"operator": "EQUAL", "left": "A"}
        with pytest.raises(ValueError, match="requires both 'left' and 'right' operands"):
            converter.convert(expr)

    def test_missing_both_operands(self):
        """Test error on missing both operands"""
        converter = ExpressionConverter()
        expr = {"operator": "AND"}
        with pytest.raises(ValueError, match="requires both 'left' and 'right' operands"):
            converter.convert(expr)

    def test_case_insensitive_operator(self):
        """Test that operators are case-insensitive"""
        converter = ExpressionConverter()
        expr_lower = {"operator": "equal", "left": "A", "right": "B"}
        result = converter.convert(expr_lower)
        assert result == 'EXACT("A","B")'


class TestConvertToExcelFunction:
    """Tests for convert_to_excel helper function"""

    def test_convert_to_excel_simple(self):
        """Test convert_to_excel with simple expression"""
        expr = Expression(operator="EQUAL", left="Status", right="Active")
        result = convert_to_excel(expr)
        assert result == 'EXACT("Status","Active")'

    def test_convert_to_excel_with_invert(self):
        """Test convert_to_excel with invert flag"""
        expr = Expression(operator="EQUAL", left="Status", right="Active")
        result = convert_to_excel(expr, invert=True)
        assert result == 'NOT(EXACT("Status","Active"))'

    def test_convert_to_excel_and(self):
        """Test convert_to_excel with AND operator"""
        inner_left = Expression(operator="EQUAL", left="A", right="B")
        inner_right = Expression(operator="EQUAL", left="C", right="D")
        expr = Expression(operator="AND", left=inner_left, right=inner_right)
        result = convert_to_excel(expr)
        assert result == 'AND(EXACT("A","B"),EXACT("C","D"))'

    def test_convert_to_excel_and_inverted(self):
        """Test convert_to_excel with AND operator inverted"""
        inner_left = Expression(operator="EQUAL", left="A", right="B")
        inner_right = Expression(operator="EQUAL", left="C", right="D")
        expr = Expression(operator="AND", left=inner_left, right=inner_right)
        result = convert_to_excel(expr, invert=True)
        assert result == 'NOT(AND(EXACT("A","B"),EXACT("C","D")))'

    def test_convert_to_excel_arithmetic(self):
        """Test convert_to_excel with arithmetic operators"""
        expr = Expression(
            operator="ADD", left=CellReference(cell_ref="A1"), right=CellReference(cell_ref="B1")
        )
        result = convert_to_excel(expr)
        assert result == "(A1+B1)"

    def test_convert_to_excel_arithmetic_inverted(self):
        """Test convert_to_excel with arithmetic operators inverted"""
        expr = Expression(operator="ADD", left=10, right=20)
        result = convert_to_excel(expr, invert=True)
        assert result == "NOT((10+20))"


class TestExpressionConverterComplexScenarios:
    """Tests for complex real-world scenarios"""

    def test_scenario_mixed_references_and_values(self):
        """Test scenario from example 3 in source file"""
        converter = ExpressionConverter()
        expr = {
            "operator": "AND",
            "left": {"operator": "EQUAL", "left": "LeftValue", "right": "RightValue"},
            "right": {"operator": "EQUAL", "left": "LeftValue2", "right": "RightValue2"},
        }
        result = converter.convert(expr)
        assert result == 'AND(EXACT("LeftValue","RightValue"),EXACT("LeftValue2","RightValue2"))'

    def test_scenario_cell_references(self):
        """Test scenario from example 4 in source file"""
        converter = ExpressionConverter()
        expr = {
            "operator": "OR",
            "left": {"operator": "EQUAL", "left": {"cell_ref": "A1"}, "right": "Active"},
            "right": {"operator": "EQUAL", "left": "Score", "right": 100},
        }
        result = converter.convert(expr)
        assert result == 'OR(EXACT(A1,"Active"),EXACT("Score",100))'

    def test_scenario_conditional_logic(self):
        """Test complex conditional logic scenario"""
        converter = ExpressionConverter()
        # If Status="Active" AND Score>100 OR Type="Premium"
        expr = {
            "operator": "OR",
            "left": {
                "operator": "AND",
                "left": {"operator": "EQUAL", "left": {"cell_ref": "A1"}, "right": "Active"},
                "right": {"operator": "EQUAL", "left": {"cell_ref": "B1"}, "right": 100},
            },
            "right": {"operator": "EQUAL", "left": {"cell_ref": "C1"}, "right": "Premium"},
        }
        result = converter.convert(expr)
        assert result == 'OR(AND(EXACT(A1,"Active"),EXACT(B1,100)),EXACT(C1,"Premium"))'

    def test_scenario_calculation_with_condition(self):
        """Test calculation with conditional logic"""
        converter = ExpressionConverter()
        # (A1 * B1) + C1
        expr = {
            "operator": "ADD",
            "left": {
                "operator": "MULTIPLY",
                "left": {"cell_ref": "A1"},
                "right": {"cell_ref": "B1"},
            },
            "right": {"cell_ref": "C1"},
        }
        result = converter.convert(expr)
        assert result == "((A1*B1)+C1)"

    def test_scenario_empty_strings(self):
        """Test handling of empty strings"""
        converter = ExpressionConverter()
        expr = {"operator": "EQUAL", "left": {"cell_ref": "A1"}, "right": ""}
        result = converter.convert(expr)
        assert result == 'EXACT(A1,"")'

    def test_scenario_complex_sheet_references(self):
        """Test complex sheet references"""
        converter = ExpressionConverter()
        expr = {
            "operator": "EQUAL",
            "left": {"cell_ref": "Sheet1!A1"},
            "right": {"cell_ref": "Sheet2!B1"},
        }
        result = converter.convert(expr)
        assert result == "EXACT(Sheet1!A1,Sheet2!B1)"


class TestExpressionConverterOperatorMapping:
    """Tests for operator mapping"""

    def test_operator_mapping_completeness(self):
        """Test that all operators are mapped"""
        converter = ExpressionConverter()
        expected_operators = {"AND", "OR", "EQUAL", "ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"}
        assert set(converter.operator_mapping.keys()) == expected_operators

    def test_operator_mapping_values(self):
        """Test operator mapping values"""
        converter = ExpressionConverter()
        assert converter.operator_mapping["AND"] == "AND"
        assert converter.operator_mapping["OR"] == "OR"
        assert converter.operator_mapping["EQUAL"] == "EXACT"
        assert converter.operator_mapping["ADD"] == "+"
        assert converter.operator_mapping["SUBTRACT"] == "-"
        assert converter.operator_mapping["MULTIPLY"] == "*"
        assert converter.operator_mapping["DIVIDE"] == "/"


class TestExpressionConverterEdgeCases:
    """Tests for edge cases"""

    def test_zero_values(self):
        """Test handling of zero values"""
        converter = ExpressionConverter()
        expr = {"operator": "EQUAL", "left": 0, "right": 0}
        result = converter.convert(expr)
        assert result == "EXACT(0,0)"

    def test_negative_numbers_in_arithmetic(self):
        """Test negative numbers in arithmetic"""
        converter = ExpressionConverter()
        expr = {"operator": "ADD", "left": -10, "right": 5}
        result = converter.convert(expr)
        assert result == "(-10+5)"

    def test_float_precision(self):
        """Test float precision handling"""
        converter = ExpressionConverter()
        expr = {"operator": "MULTIPLY", "left": 0.1, "right": 0.2}
        result = converter.convert(expr)
        assert result == "(0.1*0.2)"

    def test_very_long_string(self):
        """Test handling of very long strings"""
        converter = ExpressionConverter()
        long_string = "A" * 1000
        result = converter._format_value(long_string)
        assert result == f'"{long_string}"'
        assert len(result) == 1002  # 1000 chars + 2 quotes

    def test_special_characters_in_strings(self):
        """Test special characters in strings"""
        converter = ExpressionConverter()
        special_string = "Test\nWith\tSpecial\rChars"
        result = converter._format_value(special_string)
        assert result == f'"{special_string}"'
