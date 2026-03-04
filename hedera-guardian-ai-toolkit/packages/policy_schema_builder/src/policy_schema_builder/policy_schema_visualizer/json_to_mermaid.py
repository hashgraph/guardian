"""
Script to convert Guardian Policy Schema JSON to Mermaid diagram format.
Shows schemas (tables) and their sub-schema references as a graph.

Usage:
    python json_to_mermaid.py <input.json> [output.md]

Example:
    python json_to_mermaid.py Test_Root_Schema_MultiStep_UsingBuilder.json schema_diagram.md
"""

import json
import logging
import re
import sys
from pathlib import Path

from ..models.guardian_policy_schema import (
    GuardianPolicySchema,
    SchemaReference,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SchemaMermaidConverter:
    """Converts Guardian Policy Schema structure to Mermaid diagram format"""

    def __init__(self, schemas: list[GuardianPolicySchema]):
        self.schemas = schemas
        self.schema_map = {schema.schema_name: schema for schema in schemas}
        self.mermaid_lines = []

    def _sanitize_id(self, name: str) -> str:
        """Sanitize node ID for Mermaid (alphanumeric and underscores only)"""
        # Replace any non-alphanumeric character (except underscores) with underscore
        return re.sub(r"[^a-zA-Z0-9_]", "_", name)

    def _escape_label(self, text: str) -> str:
        """Escape special characters in labels"""
        return text.replace('"', "&quot;").replace("\n", "<br/>")

    def _escape_edge_label(self, text: str) -> str:
        """Escape edge label for Mermaid - use only alphanumeric, spaces, and basic punctuation"""
        # Replace brackets with parentheses for edge labels
        text = text.replace("[", "(").replace("]", ")")
        return text

    def _generate_node_style(self, node_id: str, node_type: str):
        """Generate Mermaid style for a node"""
        if node_type == "root":
            return f"    style {node_id} fill:#4CAF50,stroke:#2E7D32,color:#fff,stroke-width:3px"
        if node_type == "enum":
            return f"    style {node_id} fill:#FF9800,stroke:#E65100,color:#fff,stroke-width:2px"
        # sub-schema
        return f"    style {node_id} fill:#2196F3,stroke:#1565C0,color:#fff,stroke-width:2px"

    def convert(self) -> str:
        """
        Convert schema to Mermaid diagram format.

        Returns:
            Mermaid diagram as string
        """
        self.mermaid_lines = []
        self.mermaid_lines.append("graph TD")
        self.mermaid_lines.append("")

        # Add schema nodes
        for schema in self.schemas:
            node_id = self._sanitize_id(schema.schema_name)
            node_type = (
                "root" if schema.metadata.schema_type.value == "Verifiable Credentials" else "sub"
            )
            field_count = len(schema.schema_fields)

            # Create label with schema name and field count
            label = f"{self._escape_label(schema.schema_name)}<br/>{field_count} fields"

            # Different node shapes for different types
            if node_type == "root":
                self.mermaid_lines.append(f'    {node_id}["{label}"]')
            else:
                self.mermaid_lines.append(f'    {node_id}[["{label}"]]')

        self.mermaid_lines.append("")

        # Add edges for sub-schema references
        schema_edges = []

        for schema in self.schemas:
            source_id = self._sanitize_id(schema.schema_name)

            for field in schema.schema_fields:
                if isinstance(field.field_type, SchemaReference):
                    ref_schema_name = field.field_type.unique_schema_name_ref
                    if ref_schema_name in self.schema_map:
                        target_id = self._sanitize_id(ref_schema_name)

                        # Create edge label with field key
                        label_parts = [field.key]

                        # Add visibility indicators as suffix
                        if field.visibility and field.visibility not in ["", "Hidden"]:
                            label_parts.append("conditional")
                        elif field.visibility == "Hidden":
                            label_parts.append("hidden")

                        # Required marker
                        if field.required_field.value == "Yes":
                            label_parts.append("req")

                        # Join with space
                        label = " ".join(label_parts)

                        schema_edges.append(f"    {source_id} -->|{label}| {target_id}")

        # Add all schema reference edges
        if schema_edges:
            self.mermaid_lines.append("    %% Schema References")
            self.mermaid_lines.extend(schema_edges)
            self.mermaid_lines.append("")

        # Add styles
        self.mermaid_lines.append("    %% Styles")
        for schema in self.schemas:
            node_id = self._sanitize_id(schema.schema_name)
            node_type = (
                "root" if schema.metadata.schema_type.value == "Verifiable Credentials" else "sub"
            )
            self.mermaid_lines.append(self._generate_node_style(node_id, node_type))

        return "\n".join(self.mermaid_lines)

    def save(self, output_file: str):
        """
        Save Mermaid diagram to a markdown file.

        Args:
            output_file: Output filename
        """
        mermaid_content = self.convert()

        with open(output_file, "w", encoding="utf-8") as f:
            f.write(mermaid_content)

        logger.info(f"Mermaid diagram saved to: {output_file}")

    def print_summary(self):
        """Print a text summary of the conversion"""
        print("=" * 80)
        print("MERMAID CONVERSION SUMMARY")
        print("=" * 80)

        total_schemas = len(self.schemas)
        root_schemas = sum(
            1
            for schema in self.schemas
            if schema.metadata.schema_type.value == "Verifiable Credentials"
        )
        sub_schemas = total_schemas - root_schemas

        # Count edges
        schema_edges = 0
        for schema in self.schemas:
            for field in schema.schema_fields:
                if isinstance(field.field_type, SchemaReference):
                    schema_edges += 1

        print("\nNodes:")
        print(f"  Root Schemas: {root_schemas}")
        print(f"  Sub-Schemas: {sub_schemas}")
        print(f"  Total: {total_schemas}")

        print("\nEdges:")
        print(f"  Schema References: {schema_edges}")

        print("\n" + "=" * 80)


def main():
    """Main entry point for CLI usage."""
    if len(sys.argv) < 2:
        print("Usage: python json_to_mermaid.py <input.json> [output.md]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    # Auto-generate output path if not provided
    if not output_path:
        input_file = Path(input_path)
        output_path = input_file.with_stem(f"{input_file.stem}_mermaid").with_suffix(".md")

    # Check if input file exists
    input_file = Path(input_path)
    if not input_file.exists():
        logger.error(f"Schema file not found: {input_path}")
        sys.exit(1)

    # Load and parse schema
    logger.info(f"Loading schema from: {input_file.name}")
    with open(input_file, encoding="utf-8") as f:
        schema_list = json.load(f)

    # Parse as list of GuardianPolicySchema
    schemas = [GuardianPolicySchema.model_validate(s) for s in schema_list]

    # Create converter
    converter = SchemaMermaidConverter(schemas)

    # Print text summary
    converter.print_summary()

    # Convert and save
    logger.info("Converting to Mermaid format...")
    converter.save(str(output_path))
    logger.info(f"Successfully converted {input_path} to {output_path}")
    print(f"\nOutput written to: {output_path}")


if __name__ == "__main__":
    main()
