from .models.guardian_policy_schema import GuardianPolicySchemas, SchemaReference, SchemaType


def sort_guardian_policy_schemas(schemas: GuardianPolicySchemas) -> GuardianPolicySchemas:
    """
    Sorts guardian policy schemas in the following order:
    1. Root schemas (Verifiable Credentials and Tool-integration) with their referenced sub-schemas
    2. Each root schema is followed by its sub-schemas in dependency order (topological sort)
    3. If a root schema references another root schema, that referenced root and its sub-schemas
       are placed immediately after the current root's sub-schemas

    Args:
        schemas: List of GuardianPolicySchema objects to sort

    Returns:
        Sorted list of GuardianPolicySchema objects
    """
    if not schemas:
        return []

    # Create a mapping from schema name to schema object
    schema_map = {schema.schema_name: schema for schema in schemas}

    # Separate root schemas from sub-schemas, preserving original order
    root_schemas = []
    sub_schemas = []
    root_schema_names = set()

    for schema in schemas:
        if schema.metadata.schema_type in (
            SchemaType.VERIFIABLE_CREDENTIAL,
            SchemaType.TOOL_INTEGRATION,
        ):
            root_schemas.append(schema)
            root_schema_names.add(schema.schema_name)
        elif schema.metadata.schema_type == SchemaType.SUB_SCHEMA:
            sub_schemas.append(schema)

    # Build dependency graph for sub-schemas
    # dependencies[schema_name] = set of schema names it depends on
    dependencies = {schema.schema_name: set() for schema in sub_schemas}

    for schema in sub_schemas:
        for field in schema.schema_fields:
            if isinstance(field.field_type, SchemaReference):
                ref_name = field.field_type.unique_schema_name_ref
                # Only track dependencies on sub-schemas
                if ref_name in dependencies:
                    dependencies[schema.schema_name].add(ref_name)

    def get_referenced_schemas(
        schema_name: str, already_processed: set[str]
    ) -> tuple[list[str], list[str]]:
        """
        Get all sub-schemas and root schemas referenced by a schema (directly or transitively),
        in breadth-first order (siblings before children).

        Uses BFS to ensure that all direct references of a schema are processed
        before their nested references. This preserves field order at each level.

        Args:
            schema_name: The schema to get references from
            already_processed: Set of sub-schema names that have already been processed
                               (will not be included in results)

        Returns:
            Tuple of (sub_schema_names, root_schema_names) referenced by this schema
        """
        if schema_name not in schema_map:
            return [], []

        referenced_subschemas = []
        referenced_roots = []
        # Queue holds schema names to process (BFS)
        queue = [schema_name]
        visited_in_this_call = set()

        while queue:
            current_name = queue.pop(0)

            if current_name not in schema_map:
                continue

            current_schema = schema_map[current_name]

            for field in current_schema.schema_fields:
                if isinstance(field.field_type, SchemaReference):
                    ref_name = field.field_type.unique_schema_name_ref

                    if ref_name in visited_in_this_call:
                        continue
                    visited_in_this_call.add(ref_name)

                    # Check if it's a sub-schema that hasn't been processed yet
                    if ref_name in dependencies and ref_name not in already_processed:
                        referenced_subschemas.append(ref_name)
                        # Add to queue for BFS processing (will be processed after siblings)
                        queue.append(ref_name)
                    # Check if it's a root schema
                    elif ref_name in root_schema_names:
                        referenced_roots.append(ref_name)

        return referenced_subschemas, referenced_roots

    # Build the final sorted list
    sorted_schemas = []
    processed_subschemas = set()
    processed_roots = set()

    def process_root_schema(root_schema):
        """Process a root schema and all its dependencies recursively."""
        if root_schema.schema_name in processed_roots:
            return

        processed_roots.add(root_schema.schema_name)
        sorted_schemas.append(root_schema)

        # Get all sub-schemas and root schemas referenced by this root
        referenced_subschema_names, referenced_root_names = get_referenced_schemas(
            root_schema.schema_name, processed_subschemas
        )

        # Add the sub-schemas in order and mark as processed
        for sub_schema_name in referenced_subschema_names:
            if sub_schema_name not in processed_subschemas:
                sorted_schemas.append(schema_map[sub_schema_name])
                processed_subschemas.add(sub_schema_name)

        # Process referenced root schemas recursively
        for ref_root_name in referenced_root_names:
            if ref_root_name in schema_map and ref_root_name not in processed_roots:
                process_root_schema(schema_map[ref_root_name])

    # Process all root schemas in their original order
    for root_schema in root_schemas:
        process_root_schema(root_schema)

    # Add any remaining sub-schemas that weren't referenced by any root
    for schema in sub_schemas:
        if schema.schema_name not in processed_subschemas:
            sorted_schemas.append(schema)

    return sorted_schemas
