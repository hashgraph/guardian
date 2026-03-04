#!/usr/bin/env python
"""Create DOCX test fixtures for the document_ingestion_worker test suite."""

from pathlib import Path

from docx import Document


def create_simple_docx(output_path: Path) -> None:
    """Create a simple DOCX with basic paragraphs."""
    doc = Document()

    doc.add_heading("Simple Document", 0)

    doc.add_paragraph(
        "This is a simple test document for validating basic DOCX parsing. "
        "It contains only paragraphs without any complex formatting."
    )

    doc.add_paragraph(
        "The second paragraph contains information about carbon credits. "
        "Carbon credits represent verified reductions in greenhouse gas emissions."
    )

    doc.add_paragraph(
        "Methodologies define the rules for quantifying emission reductions. "
        "They specify baseline scenarios, project boundaries, and monitoring requirements."
    )

    doc.save(output_path)
    print(f"Created: {output_path}")


def create_docx_with_tables(output_path: Path) -> None:
    """Create a DOCX with data tables."""
    doc = Document()

    doc.add_heading("Methodology Parameters", 0)

    doc.add_paragraph(
        "This document contains parameter tables for carbon credit methodology testing."
    )

    doc.add_heading("Baseline Parameters", level=1)

    # Create a parameter table
    table = doc.add_table(rows=4, cols=3)
    table.style = "Table Grid"

    # Header row
    header_cells = table.rows[0].cells
    header_cells[0].text = "Parameter"
    header_cells[1].text = "Unit"
    header_cells[2].text = "Default Value"

    # Data rows
    data = [
        ("Baseline Emission Factor", "tCO2e/MWh", "0.85"),
        ("Project Lifetime", "years", "10"),
        ("Discount Rate", "%", "5.0"),
    ]

    for i, (param, unit, value) in enumerate(data, start=1):
        row = table.rows[i].cells
        row[0].text = param
        row[1].text = unit
        row[2].text = value

    doc.add_paragraph()  # Spacing

    doc.add_heading("Monitoring Parameters", level=1)

    # Create a second table
    table2 = doc.add_table(rows=3, cols=2)
    table2.style = "Table Grid"

    table2.rows[0].cells[0].text = "Monitoring Frequency"
    table2.rows[0].cells[1].text = "Quarterly"
    table2.rows[1].cells[0].text = "Verification Period"
    table2.rows[1].cells[1].text = "Annual"
    table2.rows[2].cells[0].text = "Data Retention"
    table2.rows[2].cells[1].text = "7 years"

    doc.save(output_path)
    print(f"Created: {output_path}")


def create_docx_with_headings(output_path: Path) -> None:
    """Create a DOCX with heading hierarchy for structure extraction testing."""
    doc = Document()

    doc.add_heading("Methodology Document Structure Test", 0)

    doc.add_paragraph("This document tests heading hierarchy extraction from DOCX files.")

    # Level 1 sections
    doc.add_heading("1. Introduction", level=1)
    doc.add_paragraph("The introduction section provides an overview of the methodology.")

    doc.add_heading("1.1 Purpose", level=2)
    doc.add_paragraph(
        "This methodology is designed to quantify GHG emission reductions "
        "from improved forest management practices."
    )

    doc.add_heading("1.2 Scope", level=2)
    doc.add_paragraph("The scope includes all carbon pools within the project boundary.")

    doc.add_heading("2. Applicability Conditions", level=1)
    doc.add_paragraph("Projects must meet specific applicability conditions.")

    doc.add_heading("2.1 Geographic Requirements", level=2)
    doc.add_paragraph("Projects must be located in eligible regions as defined by the registry.")

    doc.add_heading("2.1.1 Forest Types", level=3)
    doc.add_paragraph("Eligible forest types include temperate, tropical, and boreal forests.")

    doc.add_heading("2.1.2 Land Tenure", level=3)
    doc.add_paragraph("Project proponents must demonstrate legal control over the project area.")

    doc.add_heading("3. Baseline Determination", level=1)
    doc.add_paragraph("The baseline represents the scenario without project intervention.")

    doc.add_heading("3.1 Baseline Scenario", level=2)
    doc.add_paragraph("The baseline scenario is determined using standardized approaches.")

    doc.add_heading("4. Monitoring Requirements", level=1)
    doc.add_paragraph("Ongoing monitoring is essential for verifying emission reductions.")

    doc.save(output_path)
    print(f"Created: {output_path}")


def create_docx_with_subscripts(output_path: Path) -> None:
    """Create a DOCX with subscript and superscript text for serialization testing.

    This fixture tests the custom subscript serializer that handles inline
    text fragments containing subscript/superscript characters.
    """
    doc = Document()

    doc.add_heading("Document with Chemical Formulas", 0)

    doc.add_paragraph(
        "This document tests subscript and superscript text handling during chunking."
    )

    # Paragraph with CO2e subscript (common in carbon credit documents)
    doc.add_heading("1. Emissions Measurement", level=1)
    p1 = doc.add_paragraph("Baseline emissions are measured in tCO")
    run_sub = p1.add_run("2")
    run_sub.font.subscript = True
    p1.add_run("e per year.")

    # Another CO2 example
    p2 = doc.add_paragraph("The project reduces CO")
    run_sub2 = p2.add_run("2")
    run_sub2.font.subscript = True
    p2.add_run(" emissions by 50,000 tonnes annually.")

    # Paragraph with superscript (exponential notation)
    doc.add_heading("2. Scale Factors", level=1)
    p3 = doc.add_paragraph("The conversion factor is 10")
    run_super = p3.add_run("3")
    run_super.font.superscript = True
    p3.add_run(" units per hectare.")

    # Another superscript example
    p4 = doc.add_paragraph("Area coverage: 2.5 x 10")
    run_super2 = p4.add_run("6")
    run_super2.font.superscript = True
    p4.add_run(" m")
    run_super3 = p4.add_run("2")
    run_super3.font.superscript = True
    p4.add_run(".")

    # Chemical formula: H2O
    doc.add_heading("3. Water Usage", level=1)
    p5 = doc.add_paragraph("Water (H")
    run_h2 = p5.add_run("2")
    run_h2.font.subscript = True
    p5.add_run("O) consumption is monitored quarterly.")

    # Mixed in table cell
    doc.add_heading("4. Summary Table", level=1)
    table = doc.add_table(rows=3, cols=2)
    table.style = "Table Grid"

    table.rows[0].cells[0].text = "Metric"
    table.rows[0].cells[1].text = "Unit"

    table.rows[1].cells[0].text = "Emission Reduction"
    # Add tCO2e with subscript in table cell
    cell = table.rows[1].cells[1]
    cell.text = ""
    p_cell = cell.paragraphs[0]
    p_cell.add_run("tCO")
    run_cell_sub = p_cell.add_run("2")
    run_cell_sub.font.subscript = True
    p_cell.add_run("e")

    table.rows[2].cells[0].text = "Project Area"
    table.rows[2].cells[1].text = "hectares"

    doc.save(output_path)
    print(f"Created: {output_path}")


def main():
    """Create all DOCX test fixtures."""
    fixture_dir = Path(__file__).parent

    create_simple_docx(fixture_dir / "simple.docx")
    create_docx_with_tables(fixture_dir / "with_tables.docx")
    create_docx_with_headings(fixture_dir / "with_headings.docx")
    create_docx_with_subscripts(fixture_dir / "with_subscripts.docx")

    print("\nAll DOCX fixtures created successfully!")


if __name__ == "__main__":
    main()
