"""
Interactive visualization of Guardian Policy Schema structure as a tree graph.
Shows schemas (tables) and their sub-schema references using plotly for interactivity.

Features:
- Click nodes to expand/collapse their children
- Drag nodes to reposition
- Zoom and pan
- Hover to see detailed information
- Interactive legend to filter node types

Usage:
    python visualize_schema_tree_graph_interactive.py <input.json> [output.html]

Example:
    python visualize_schema_tree_graph_interactive.py Test_Root_Schema_MultiStep_UsingBuilder.json schema_tree.html
"""

import json
import logging
import sys
from collections import deque
from pathlib import Path

import networkx as nx

from ..models.guardian_policy_schema import (
    GuardianPolicySchema,
    SchemaReference,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class InteractiveSchemaGraphVisualizer:
    """Visualizes Guardian Policy Schema structure as an interactive graph"""

    def __init__(self, schemas: list[GuardianPolicySchema]):
        self.schemas = schemas
        self.schema_map = {schema.schema_name: schema for schema in schemas}
        self.graph = nx.DiGraph()
        self._build_graph()

    def _build_graph(self):
        """Build the directed graph from schema relationships"""
        # Add all schemas as nodes
        for schema in self.schemas:
            node_type = (
                "root" if schema.metadata.schema_type.value == "Verifiable Credentials" else "sub"
            )
            self.graph.add_node(
                schema.schema_name,
                type=node_type,
                schema_type=schema.metadata.schema_type.value,
                description=schema.metadata.description,
                field_count=len(schema.schema_fields),
                collapsed=True,  # Start collapsed by default
            )

        # Add edges for sub-schema references
        for schema in self.schemas:
            for field in schema.schema_fields:
                if isinstance(field.field_type, SchemaReference):
                    ref_schema_name = field.field_type.unique_schema_name_ref
                    # Resolve truncated reference to full schema name
                    if ref_schema_name in self.schema_map:
                        # Add edge with field information
                        self.graph.add_edge(
                            schema.schema_name,
                            ref_schema_name,
                            edge_type="schema_ref",
                            field_key=field.key,
                            field_question=field.question,
                            required=field.required_field.value,
                            visibility=str(field.visibility)
                            if field.visibility not in ["", "Hidden"]
                            else field.visibility,
                        )

    def _get_visible_nodes(self) -> set:
        """Get set of nodes that should be visible based on collapse state"""
        visible = set()

        # Always show root nodes
        root_nodes = [node for node in self.graph.nodes() if self.graph.in_degree(node) == 0]

        # BFS to find all visible nodes
        queue = deque(root_nodes)
        visited = set()

        while queue:
            node = queue.popleft()
            if node in visited:
                continue
            visited.add(node)
            visible.add(node)

            # If not collapsed, add children
            if not self.graph.nodes[node].get("collapsed", True):
                for child in self.graph.successors(node):
                    if child not in visited:
                        queue.append(child)

        return visible

    def _hierarchical_layout(self, visible_nodes: set = None) -> dict:
        """Create a hierarchical layout for the tree."""
        if visible_nodes is None:
            visible_nodes = set(self.graph.nodes())

        root_nodes = [
            node
            for node in self.graph.nodes()
            if self.graph.in_degree(node) == 0 and node in visible_nodes
        ]
        pos = {}
        levels = {}

        # BFS to assign levels
        visited = set()
        queue = deque([(node, 0) for node in root_nodes])

        while queue:
            node, level = queue.popleft()
            if node in visited or node not in visible_nodes:
                continue
            visited.add(node)

            if level not in levels:
                levels[level] = []
            levels[level].append(node)

            for child in self.graph.successors(node):
                if child not in visited and child in visible_nodes:
                    queue.append((child, level + 1))

        # Assign positions
        y_spacing = 350  # Vertical spacing

        # --- MODIFIED SECTION ---
        fixed_x_spacing = 800  # Constant horizontal spacing

        for level, nodes in levels.items():
            y = -level * y_spacing

            # Calculate total width based on fixed spacing
            width = len(nodes) * fixed_x_spacing
            start_x = -width / 2

            for i, node in enumerate(nodes):
                x = start_x + i * fixed_x_spacing + fixed_x_spacing / 2
                pos[node] = (x, y)
        # ------------------------

        return pos

    def _create_node_hover_text(self, node: str, node_data: dict) -> str:
        """Create detailed hover text for a node"""
        # Check if node has children
        children_count = len(list(self.graph.successors(node)))
        is_collapsed = node_data.get("collapsed", True)

        # Add collapse indicator
        collapse_indicator = ""
        if children_count > 0:
            if is_collapsed:
                collapse_indicator = "▶️ Click to expand children"
            else:
                collapse_indicator = "▼ Click to collapse children"

        # Schema node
        schema = self.schema_map[node]

        # Collect field information
        field_lines = []
        for field in schema.schema_fields[:15]:  # Show first 15 fields
            if isinstance(field.field_type, SchemaReference):
                field_type_str = f"→ {field.field_type.unique_schema_name_ref}"
            elif field.field_type == "Enum":
                field_type_str = "Enum"
            else:
                field_type_str = str(field.field_type)

            req_marker = " *" if field.required_field.value == "Yes" else ""
            field_lines.append(f"  • {field.key}{req_marker}: {field_type_str}")

        if len(schema.schema_fields) > 15:
            field_lines.append(f"  ... +{len(schema.schema_fields) - 15} more fields")

        fields_text = "<br>".join(field_lines)

        # Count children
        parents_count = len(list(self.graph.predecessors(node)))

        hover_text = (
            f"<b>{node}</b><br>{collapse_indicator}<br><br>"
            if collapse_indicator
            else ""
            f"Type: {node_data['schema_type']}<br>"
            f"Fields: {node_data['field_count']}<br>"
            f"References: {children_count}<br>"
            f"Referenced by: {parents_count}<br>"
            f"<br>Description:<br>{node_data['description']}<br>"
            f"<br>Fields:<br>{fields_text}"
        )

        return hover_text

    def _create_edge_hover_text(self, source: str, target: str, edge_data: dict) -> str:
        """Create hover text for an edge"""
        field_key = edge_data.get("field_key", "")
        field_question = edge_data.get("field_question", "")
        required = edge_data.get("required", "No")

        visibility = edge_data.get("visibility", "")
        visibility_text = ""
        if visibility and visibility not in ["", "Hidden"]:
            visibility_text = f"<br>Conditional: {visibility}"
        elif visibility == "Hidden":
            visibility_text = "<br>Hidden"

        hover_text = (
            f"<b>Schema Reference</b><br>"
            f"From: {source}<br>"
            f"To: {target}<br>"
            f"Field: {field_key}<br>"
            f"Required: {required}{visibility_text}<br>"
            f"Question: {field_question}"
        )

        return hover_text

    def visualize(self, output_file: str = "schema_tree_interactive.html"):
        """
        Create and save an interactive visualization of the schema tree with collapsible nodes.

        Args:
            output_file: Output filename for the saved HTML file
        """
        # Start with only visible nodes (collapsed state)
        visible_nodes = self._get_visible_nodes()

        # Define colors
        colors = {
            "root": "#4CAF50",  # Green for root schemas
            "sub": "#2196F3",  # Blue for sub-schemas
        }

        # Prepare graph data as JSON for JavaScript
        graph_data = {"nodes": {}, "edges": []}

        # Export all nodes
        for node in self.graph.nodes():
            node_data = self.graph.nodes[node]
            children = list(self.graph.successors(node))

            graph_data["nodes"][node] = {
                "type": node_data["type"],
                "collapsed": node_data.get("collapsed", True),
                "children": children,
                "has_children": len(children) > 0,
                "color": colors[node_data["type"]],
                "hover_text": self._create_node_hover_text(node, node_data),
            }

            # Add extra data for sizing (smaller nodes to fit better)
            graph_data["nodes"][node]["size"] = min(20 + node_data["field_count"] * 0.8, 45)

        # Export all edges
        for edge in self.graph.edges():
            source, target = edge
            edge_data = self.graph.edges[edge]
            graph_data["edges"].append(
                {
                    "source": source,
                    "target": target,
                    "edge_type": edge_data.get("edge_type", "schema_ref"),
                    "hover_text": self._create_edge_hover_text(source, target, edge_data),
                }
            )

        # Calculate statistics
        total_schemas = len(self.schemas)
        root_schemas = sum(
            1 for node in self.graph.nodes() if self.graph.nodes[node].get("type") == "root"
        )
        sub_schemas = total_schemas - root_schemas
        total_refs = self.graph.number_of_edges()

        # Generate HTML with embedded JavaScript
        html_content = self._generate_interactive_html(
            graph_data, total_schemas, root_schemas, sub_schemas, total_refs
        )

        # Write to file
        Path(output_file).write_text(html_content, encoding="utf-8")

        print(f"✅ Interactive schema tree visualization saved to: {output_file}")
        print("   Open in browser to interact with the graph")
        print("   Click on nodes to expand/collapse their children")

        # Also open in browser automatically
        try:
            import webbrowser

            webbrowser.open(f"file://{Path(output_file).absolute()}")
        except Exception as e:
            logger.warning(f"Could not auto-open browser: {e}")

    def _generate_interactive_html(
        self,
        graph_data: dict,
        total_schemas: int,
        root_schemas: int,
        sub_schemas: int,
        total_refs: int,
    ) -> str:
        """Generate HTML with embedded JavaScript for interactive graph"""

        import json as json_lib

        graph_json = json_lib.dumps(graph_data, indent=2)

        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Guardian Policy Schema Tree - Interactive</title>
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            overflow: hidden;
        }}
        #graph {{
            width: 100vw;
            height: 100vh;
        }}
        .controls {{
            position: absolute;
            top: 80px;
            right: 20px;
            background: rgba(255, 255, 255, 0.95);
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
        }}
        .controls button {{
            display: block;
            width: 100%;
            margin: 5px 0;
            padding: 10px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }}
        .controls button:hover {{
            background: #1976D2;
        }}
        .info {{
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: rgba(255, 243, 205, 0.95);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid black;
            z-index: 1000;
            font-size: 13px;
        }}
    </style>
</head>
<body>
    <div class="controls">
        <button onclick="expandAll()">Expand All</button>
        <button onclick="collapseAll()">Collapse All</button>
        <button onclick="resetZoom()">Reset Zoom</button>
    </div>

    <div class="info">
        <b>Statistics:</b><br>
        Total Schemas: {total_schemas} (Root: {root_schemas}, Sub: {sub_schemas})<br>
        References: {total_refs}<br>
        <br>
        <b>Tips:</b><br>
        - Click nodes to expand/collapse children<br>
        - Scroll to zoom<br>
        - Drag to pan<br>
        - Hover for details
    </div>

    <div id="graph"></div>

    <script>
        // Graph data
        const graphData = {graph_json};



        // Layout algorithm (hierarchical BFS)
        function computeLayout(visibleNodes) {{
            const pos = {{}};
            const levels = {{}};

            // Find root nodes
            const allNodes = new Set(Object.keys(graphData.nodes));
            const hasIncoming = new Set();
            graphData.edges.forEach(e => hasIncoming.add(e.target));
            const rootNodes = [...allNodes].filter(n => !hasIncoming.has(n) && visibleNodes.has(n));

            // BFS to assign levels
            const visited = new Set();
            const queue = rootNodes.map(n => [n, 0]);

            while (queue.length > 0) {{
                const [node, level] = queue.shift();
                if (visited.has(node) || !visibleNodes.has(node)) continue;
                visited.add(node);

                if (!levels[level]) levels[level] = [];
                levels[level].push(node);

                // Add visible children
                const children = graphData.nodes[node].children.filter(c => visibleNodes.has(c));
                children.forEach(child => {{
                    if (!visited.has(child)) queue.push([child, level + 1]);
                }});
            }}

            // Assign positions
            const ySpacing = 2050;  // Large vertical spacing
            for (const [level, nodes] of Object.entries(levels)) {{
                const y = -parseInt(level) * ySpacing;

                // Extremely generous horizontal spacing to prevent overlap
                const xSpacing = 500;

                const width = nodes.length * xSpacing;
                const startX = -width / 2;

                nodes.forEach((node, i) => {{
                    pos[node] = {{
                        x: startX + i * xSpacing + xSpacing / 2,
                        y: y
                    }};
                }});
            }}

            return pos;
        }}

        // Get visible nodes based on collapse state
        function getVisibleNodes() {{
            const visible = new Set();

            // Find root nodes
            const allNodes = new Set(Object.keys(graphData.nodes));
            const hasIncoming = new Set();
            graphData.edges.forEach(e => hasIncoming.add(e.target));
            const rootNodes = [...allNodes].filter(n => !hasIncoming.has(n));

            // BFS
            const queue = [...rootNodes];
            const visited = new Set();

            while (queue.length > 0) {{
                const node = queue.shift();
                if (visited.has(node)) continue;
                visited.add(node);
                visible.add(node);

                // If not collapsed, add children
                if (!graphData.nodes[node].collapsed) {{
                    graphData.nodes[node].children.forEach(child => {{
                        if (!visited.has(child)) queue.push(child);
                    }});
                }}
            }}

            return visible;
        }}

        // Render graph
        function renderGraph() {{
            const visibleNodes = getVisibleNodes();
            const pos = computeLayout(visibleNodes);

            // Build traces
            const traces = [];

            // Schema edges
            const schemaEdgeX = [];
            const schemaEdgeY = [];
            const schemaEdgeHover = [];

            graphData.edges.forEach(edge => {{
                if (!visibleNodes.has(edge.source) || !visibleNodes.has(edge.target)) return;

                const x0 = pos[edge.source].x;
                const y0 = pos[edge.source].y;
                const x1 = pos[edge.target].x;
                const y1 = pos[edge.target].y;

                schemaEdgeX.push(x0, x1, null);
                schemaEdgeY.push(y0, y1, null);
                schemaEdgeHover.push(edge.hover_text, edge.hover_text, edge.hover_text);
            }});

            if (schemaEdgeX.length > 0) {{
                traces.push({{
                    x: schemaEdgeX,
                    y: schemaEdgeY,
                    mode: 'lines',
                    line: {{ width: 2, color: '#666666' }},
                    hovertext: schemaEdgeHover,
                    hoverinfo: 'text',
                    name: 'Schema Reference',
                    showlegend: true
                }});
            }}

            // Node traces by type
            const nodesByType = {{ root: [], sub: [] }};
            const typeLabels = {{
                root: 'Root Schema (VC)',
                sub: 'Sub-Schema'
            }};

            visibleNodes.forEach(node => {{
                const nodeData = graphData.nodes[node];
                const p = pos[node];

                // Update hover text with current collapse state
                let hoverText = nodeData.hover_text;
                if (nodeData.has_children) {{
                    const indicator = nodeData.collapsed ? '▶️ Click to expand children' : '▼ Click to collapse children';
                    hoverText = hoverText.replace(/[▶️▼].*?children(<br>)?(<br>)?/g, indicator + '<br><br>');
                }}

                nodesByType[nodeData.type].push({{
                    node: node,
                    x: p.x,
                    y: p.y,
                    size: nodeData.size,
                    color: nodeData.color,
                    hover: hoverText
                }});
            }});

            // Create node traces
            for (const [type, nodes] of Object.entries(nodesByType)) {{
                if (nodes.length === 0) continue;

                traces.push({{
                    x: nodes.map(n => n.x),
                    y: nodes.map(n => n.y),
                    mode: 'markers+text',
                    marker: {{
                        size: nodes.map(n => n.size),
                        color: nodes.map(n => n.color),
                        line: {{ width: 2, color: 'black' }}
                    }},
                    text: nodes.map(n => n.node),
                    textposition: 'top center',
                    textfont: {{ size: 8, color: 'black' }},  // Smaller font for better fit
                    hovertext: nodes.map(n => n.hover),
                    hoverinfo: 'text',
                    name: typeLabels[type],
                    showlegend: true,
                    customdata: nodes.map(n => n.node)
                }});
            }}

            // Layout
            const layout = {{
                title: {{
                    text: 'Guardian Policy Schema Tree Structure<br><sub>Click nodes to expand/collapse</sub>',
                    x: 0.5,
                    xanchor: 'center',
                    font: {{ size: 20 }}
                }},
                showlegend: true,
                hovermode: 'closest',
                margin: {{ b: 100, l: 100, r: 100, t: 150 }},
                xaxis: {{ showgrid: false, zeroline: false, showticklabels: false, autorange: false,
                    range: [-2500, 2500] }},
                yaxis: {{ showgrid: false, zeroline: false, showticklabels: false, autorange: false,
                    range: [-2000, 500] }},
                plot_bgcolor: 'white',
                dragmode: 'pan'
            }};

            const config = {{
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                toImageButtonOptions: {{
                    format: 'png',
                    filename: 'schema_tree_graph',
                    height: 1200,
                    width: 1800,
                    scale: 2
                }}
            }};

            Plotly.newPlot('graph', traces, layout, config);

            // Add click handler
            document.getElementById('graph').on('plotly_click', function(data) {{
                if (data.points && data.points.length > 0) {{
                    const point = data.points[0];
                    if (point.customdata) {{
                        const nodeName = point.customdata;
                        const node = graphData.nodes[nodeName];

                        // Toggle collapse state
                        if (node.has_children) {{
                            node.collapsed = !node.collapsed;
                            renderGraph();
                        }}
                    }}
                }}
            }});
        }}

        // Control functions
        function expandAll() {{
            Object.values(graphData.nodes).forEach(node => node.collapsed = false);
            renderGraph();
        }}

        function collapseAll() {{
            Object.values(graphData.nodes).forEach(node => node.collapsed = true);
            renderGraph();
        }}

        function resetZoom() {{
            renderGraph();
        }}

        // Initial render
        renderGraph();
    </script>
</body>
</html>"""

    def print_summary(self):
        """Print a text summary of the schema structure"""
        print("=" * 80)
        print("SCHEMA GRAPH SUMMARY")
        print("=" * 80)

        # Root schemas
        root_schemas = [
            node for node in self.graph.nodes() if self.graph.nodes[node].get("type") == "root"
        ]
        print(f"\nRoot Schemas ({len(root_schemas)}):")
        for schema in root_schemas:
            children = list(self.graph.successors(schema))
            print(f"  [ROOT] {schema}")
            print(f"     Fields: {self.graph.nodes[schema]['field_count']}")
            print(f"     Sub-schemas: {len(children)}")
            if children:
                print(f"     -> References: {', '.join(children)}")

        # Sub-schemas
        sub_schemas = [
            node for node in self.graph.nodes() if self.graph.nodes[node].get("type") == "sub"
        ]
        print(f"\nSub-Schemas ({len(sub_schemas)}):")
        for schema in sub_schemas:
            parents = list(self.graph.predecessors(schema))
            children = list(self.graph.successors(schema))
            print(f"  [SUB] {schema}")
            print(f"     Fields: {self.graph.nodes[schema]['field_count']}")
            print(f"     Referenced by: {len(parents)} schema(s)")
            if children:
                print(f"     -> References: {', '.join(children)}")

        print("\n" + "=" * 80)


def main():
    """Main entry point for CLI usage."""
    if len(sys.argv) < 2:
        print("Usage: python visualize_schema_tree_graph_interactive.py <input.json> [output.html]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    # Auto-generate output path if not provided
    if not output_path:
        input_file = Path(input_path)
        output_path = input_file.with_stem(
            f"{input_file.stem}_visualization_interactive"
        ).with_suffix(".html")

    # Check if input file exists
    input_file = Path(input_path)
    if not input_file.exists():
        logger.error(f"Schema file not found: {input_path}")
        sys.exit(1)

    # Load and parse schema
    logger.info(f"Loading schema from: {input_file.name}")
    with open(input_file) as f:
        schema_list = json.load(f)

    # Parse as list of GuardianPolicySchema
    schemas = [GuardianPolicySchema.model_validate(s) for s in schema_list]

    # Create visualizer
    visualizer = InteractiveSchemaGraphVisualizer(schemas)

    # Print text summary
    visualizer.print_summary()

    # Create and display graph
    logger.info("Generating interactive graph visualization...")
    visualizer.visualize(output_file=str(output_path))
    logger.info(f"Successfully visualized {input_path} to {output_path}")
    print(f"\nOutput written to: {output_path}")
    print("Open the HTML file in your browser to interact with the visualization!")


if __name__ == "__main__":
    main()
