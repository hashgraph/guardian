#!/usr/bin/env python3
"""
JSON Schema Parser - Core Library

This parser implements a global property caching mechanism for $ref GUIDs.
When the same $ref is encountered at different paths (across all schema files),
the cached properties are reused with updated paths instead of being skipped.

Key features:
1. ROOT SCHEMA DETECTION: Only processes root schemas, expands references inline
2. Standard properties (properties.propName.$ref) with caching
3. Array items (properties.propName.items.$ref) with caching
4. Conditional properties (allOf[].if/then/else blocks)
5. Global $ref cache prevents re-parsing and enables property reuse
6. Complete property coverage when same $ref appears at multiple paths

Root Schema Detection:
- Uses metadata 'defs' array analysis to identify entry-point schemas
- A schema is ROOT if its UUID is NOT listed in any other schema's 'defs' array
- Only root schemas are processed; referenced schemas are expanded inline

Output format:
{
  "embedding_input": "Parent (Description) -> Child (Description)",
  "content": {
    "name": "propertyName",
    "full_path": "parent.child",
    "type": ["string"],
    "description": "Property description",
    "ancestors": [...]
  },
  "source": "file:path/to/schema.json | JSON Pointer: /properties/name"
}

For CLI usage, see schema_parser_cli.py
"""

import json
import logging
import os
from pathlib import Path
from typing import Any

# Configure logger
logger = logging.getLogger(__name__)


def load_schema_file(filepath: str) -> Any:
    """Load a JSON schema file with fallback encodings."""
    try:
        with open(filepath, encoding="utf-8") as f:
            return json.load(f)
    except UnicodeDecodeError as e:
        logger.warning(f"UTF-8 decode failed for {filepath}, trying latin-1: {e}")
        try:
            with open(filepath, encoding="latin-1") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load {filepath} with latin-1 encoding: {e}")
            return None
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in {filepath}: {e}")
        return None
    except FileNotFoundError:
        logger.error(f"File not found: {filepath}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error loading {filepath}: {e}")
        return None


def build_schema_map(
    schema_dir: str,
    preloaded_schemas: dict[str, Any] | None = None,
) -> dict[str, dict[str, Any]]:
    """
    Build a map of all schemas by UUID for cross-file reference resolution.

    Recursively searches subdirectories for JSON schema files.
    Optimized to avoid duplicate storage when UUID matches filename.

    Args:
        schema_dir: Directory containing schema files
        preloaded_schemas: Optional pre-loaded schema data keyed by file path.
            When provided, avoids reloading files from disk.
    """
    schema_map: dict[str, dict[str, Any]] = {}
    schema_path = Path(schema_dir)

    # Recursively find all .json files in schema_dir and subdirectories
    for json_file in schema_path.rglob("*.json"):
        path = str(json_file.resolve())

        # Use preloaded data if available, otherwise load from disk
        if preloaded_schemas and path in preloaded_schemas:
            data = preloaded_schemas[path]
        else:
            data = load_schema_file(path)
        if not data:
            continue

        # Create the schema entry once
        schema_entry = {"data": data, "origin": f"file:{path}"}

        # Determine all keys that should point to this schema
        keys = set()

        # Add UUID-based key if present
        if "uuid" in data:
            uuid_key = f"#{data['uuid']}"
            keys.add(uuid_key)

        # Add filename-based key if it's a hash reference
        base = json_file.stem
        if base.startswith("#"):
            keys.add(base)

        # Store schema under all relevant keys (avoiding duplicate storage)
        for key in keys:
            schema_map[key] = schema_entry

    return schema_map


def get_property_types(prop_schema: Any) -> list[str]:
    """Extract type information from a property schema."""
    if not isinstance(prop_schema, dict):
        return ["unknown"]

    t = prop_schema.get("type")
    if isinstance(t, list):
        return t
    if isinstance(t, str):
        return [t]

    # Infer type from structural keywords
    types = []
    if "properties" in prop_schema:
        types.append("object")
    if "items" in prop_schema:
        types.append("array")

    return types or ["unknown"]


def resolve_reference(
    ref: str, schema_map: dict[str, dict[str, Any]], schema_dir: str
) -> tuple[Any, str]:
    """Resolve a $ref to its schema document and origin."""
    # Try direct map lookup
    if ref in schema_map:
        entry = schema_map[ref]
        return entry.get("data", {}).get("document"), entry.get("origin")

    # Try deriving filename from ref
    ref_id = ref.lstrip("#")
    candidate = f"#{ref_id.split('&')[0]}.json"
    path = os.path.join(schema_dir, candidate)

    if os.path.exists(path):
        s = load_schema_file(path)
        if s and "document" in s:
            origin = f"file:{path}"
            schema_map[ref] = {"data": s, "origin": origin}
            return s["document"], origin
        if s:
            logger.warning(f"Schema file {path} loaded but has no 'document' field")

    # Try base ref without version suffix
    if "&" in ref:
        base = ref.split("&", 1)[0]
        if base in schema_map:
            entry = schema_map[base]
            return entry.get("data", {}).get("document"), entry.get("origin")

    logger.debug(f"Could not resolve reference: {ref}")
    return None, None


def apply_cached_properties_to_path(
    cached_properties: list[dict[str, Any]], new_base_path: str, new_ancestors: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """
    Take cached properties from a $ref and apply them to a new path.

    When a $ref GUID is encountered multiple times at different paths,
    this function reuses the cached properties from the first encounter
    by updating their paths and ancestors.

    Args:
        cached_properties: List of properties extracted from first $ref encounter
        new_base_path: The new path prefix to apply (e.g., "B" or "A.nested")
        new_ancestors: The new ancestor chain for this path

    Returns:
        List of properties with updated paths and ancestors

    Example:
        Cached: property1, property2 (from path "")
        New path: "B"
        Result: B.property1, B.property2
    """
    new_properties = []

    for cached_prop in cached_properties:
        # Optimized: Only copy mutable parts that need modification
        # Metadata is immutable, so we can share the reference
        cached_summary = cached_prop.get("summary", {})
        full_path = cached_summary.get("full_path", "")

        # Build new path
        # The cached property has a relative path like "property1" or "property1.nested"
        # we want to append it to new_base_path
        if new_base_path:
            new_full_path = f"{new_base_path}.{full_path}" if full_path else new_base_path
        else:
            new_full_path = full_path

        # Create new summary with only the parts that change
        # Extend new_ancestors with the cached property's existing ancestors
        # This preserves the full ancestor chain for deeply nested properties
        cached_ancestors = cached_summary.get("ancestors", [])
        new_summary = {
            "name": cached_summary.get("name"),
            "full_path": new_full_path,
            "type": cached_summary.get("type"),  # Types are immutable lists, safe to share
            "description": cached_summary.get("description"),
            "ancestors": new_ancestors.copy() + cached_ancestors,
        }

        # Build new property with shared metadata reference
        prop_copy = {
            "metadata": cached_prop.get("metadata"),  # Immutable, share reference
            "summary": new_summary,
        }

        new_properties.append(prop_copy)

    return new_properties


def _handle_ref_resolution_and_caching(
    ref: str,
    current_path: str,
    updated_ancestors: list[dict[str, Any]],
    ref_cache: dict[str, list[dict[str, Any]]],
    schema_map: dict[str, dict[str, Any]],
    schema_dir: str,
    ref_origin: str,
) -> list[dict[str, Any]]:
    """
    Handle $ref resolution with caching logic.

    This function encapsulates the common pattern of checking if a $ref is cached,
    and either reusing cached properties or resolving and caching new ones.

    Args:
        ref: The $ref string to resolve
        current_path: Current property path
        updated_ancestors: Ancestor chain for this path
        ref_cache: Global reference cache
        schema_map: Schema lookup map
        schema_dir: Directory containing schemas
        ref_origin: Origin string for new properties

    Returns:
        List of properties with paths applied
    """
    if ref in ref_cache:
        # Reuse cached properties with new path
        return apply_cached_properties_to_path(ref_cache[ref], current_path, updated_ancestors)
    # First time encountering this $ref - parse and cache
    ref_doc, ref_origin_resolved = resolve_reference(ref, schema_map, schema_dir)
    if ref_doc:
        # Extract properties with empty base path to get relative structure
        ref_info = extract_property_paths(
            ref_doc,
            schema_map,
            schema_dir,
            "",  # Empty base path for caching
            ref_cache,
            ref_origin_resolved or ref_origin,
            [],  # Empty ancestors for caching
        )

        # Cache the extracted properties (with relative paths)
        # Store a copy to prevent mutations from affecting cache
        ref_cache[ref] = [
            {
                "metadata": prop.get("metadata"),
                "summary": prop.get("summary", {}).copy(),
            }
            for prop in ref_info
        ]

        # Apply to current path
        return apply_cached_properties_to_path(ref_info, current_path, updated_ancestors)

    return []


def extract_properties_from_schema(
    schema_obj: dict[str, Any],
    schema_map: dict[str, dict[str, Any]],
    schema_dir: str,
    base_path: str,
    ref_cache: dict[str, list[dict[str, Any]]],
    current_origin: str,
    ancestors: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Extract properties from a schema object (can be from properties, then, or else blocks)."""
    properties_info: list[dict[str, Any]] = []

    if not isinstance(schema_obj, dict) or "properties" not in schema_obj:
        return properties_info

    # Iterate properties
    for prop_name, prop_schema in schema_obj["properties"].items():
        # Skip special properties
        if prop_name in ["@context", "type"]:
            continue

        display_name = prop_name
        prop_types = get_property_types(prop_schema)
        path_suffix = ""

        # Handle array types
        if (
            isinstance(prop_schema, dict)
            and prop_schema.get("type") == "array"
            and "items" in prop_schema
        ):
            display_name = f"{prop_name}[*]"
            path_suffix = "[*]"
            items = prop_schema["items"]

            # Resolve array item type
            if isinstance(items, dict) and "$ref" in items:
                ref = items["$ref"]
                ref_doc, _ = resolve_reference(ref, schema_map, schema_dir)
                prop_types = get_property_types(ref_doc) if ref_doc else ["unknown"]
            else:
                prop_types = get_property_types(items)

        # Build current path
        current_path = (
            f"{base_path}.{prop_name}{path_suffix}" if base_path else f"{prop_name}{path_suffix}"
        )
        # Create JSON pointer for this property (following JSON Schema structure)
        json_pointer = f"/{prop_name}" if prop_name else ""

        # Extract description
        description = ""
        if isinstance(prop_schema, dict):
            description = prop_schema.get("description", "") or ""
            if isinstance(description, str):
                description = description.strip()

        # Create property info
        prop_info = {
            "metadata": {"origin": current_origin, "json_pointer": f"/properties{json_pointer}"},
            "summary": {
                "name": display_name,
                "full_path": current_path,
                "type": prop_types,
                "description": description,
                "ancestors": ancestors.copy(),
            },
        }
        properties_info.append(prop_info)

        # Prepare ancestor for nested properties
        current_ancestor = {"name": display_name, "description": description, "type": prop_types}
        updated_ancestors = ancestors.copy()
        updated_ancestors.append(current_ancestor)

        # Process nested inline properties
        if isinstance(prop_schema, dict) and "properties" in prop_schema:
            nested_info = extract_properties_from_schema(
                prop_schema,
                schema_map,
                schema_dir,
                current_path,
                ref_cache,
                current_origin,
                updated_ancestors,
            )
            properties_info.extend(nested_info)

        # Process property references with caching
        if isinstance(prop_schema, dict) and "$ref" in prop_schema:
            ref = prop_schema["$ref"]
            ref_props = _handle_ref_resolution_and_caching(
                ref,
                current_path,
                updated_ancestors,
                ref_cache,
                schema_map,
                schema_dir,
                current_origin,
            )
            properties_info.extend(ref_props)

        # Process array items references with caching
        if (
            isinstance(prop_schema, dict)
            and prop_schema.get("type") == "array"
            and "items" in prop_schema
        ):
            items = prop_schema["items"]
            if isinstance(items, dict) and "$ref" in items:
                ref = items["$ref"]
                ref_props = _handle_ref_resolution_and_caching(
                    ref,
                    current_path,
                    updated_ancestors,
                    ref_cache,
                    schema_map,
                    schema_dir,
                    current_origin,
                )
                properties_info.extend(ref_props)

    return properties_info


def extract_properties_from_allof(
    allof_array: list[Any],
    schema_map: dict[str, dict[str, Any]],
    schema_dir: str,
    base_path: str,
    ref_cache: dict[str, list[dict[str, Any]]],
    current_origin: str,
    ancestors: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Extract properties from allOf blocks, including if/then/else patterns."""
    properties_info: list[dict[str, Any]] = []

    if not isinstance(allof_array, list):
        return properties_info

    for allof_item in allof_array:
        if not isinstance(allof_item, dict):
            continue

        # Extract from direct properties in allOf item
        if "properties" in allof_item:
            props = extract_properties_from_schema(
                allof_item, schema_map, schema_dir, base_path, ref_cache, current_origin, ancestors
            )
            properties_info.extend(props)

        # Extract from 'then' block (if present)
        if "then" in allof_item and isinstance(allof_item["then"], dict):
            then_props = extract_properties_from_schema(
                allof_item["then"],
                schema_map,
                schema_dir,
                base_path,
                ref_cache,
                current_origin,
                ancestors,
            )
            properties_info.extend(then_props)

        # Extract from 'else' block (if present)
        if "else" in allof_item and isinstance(allof_item["else"], dict):
            else_props = extract_properties_from_schema(
                allof_item["else"],
                schema_map,
                schema_dir,
                base_path,
                ref_cache,
                current_origin,
                ancestors,
            )
            properties_info.extend(else_props)

    return properties_info


def extract_property_paths(
    document: Any,
    schema_map: dict[str, dict[str, Any]],
    schema_dir: str,
    base_path: str = "",
    ref_cache: dict[str, list[dict[str, Any]]] = None,
    current_origin: str = None,
    ancestors: list[dict[str, Any]] = None,
) -> list[dict[str, Any]]:
    """Extract property paths and metadata from a schema document."""
    if ref_cache is None:
        ref_cache = {}
    if ancestors is None:
        ancestors = []

    properties_info: list[dict[str, Any]] = []

    if not isinstance(document, dict):
        return properties_info

    # Extract from standard properties
    if "properties" in document:
        props = extract_properties_from_schema(
            document, schema_map, schema_dir, base_path, ref_cache, current_origin, ancestors
        )
        properties_info.extend(props)

    # Extract from allOf blocks (including if/then/else patterns)
    if "allOf" in document:
        allof_props = extract_properties_from_allof(
            document["allOf"],
            schema_map,
            schema_dir,
            base_path,
            ref_cache,
            current_origin,
            ancestors,
        )
        properties_info.extend(allof_props)

    return properties_info


def create_embedding_input(summary: dict[str, Any], max_chars: int = 2000) -> str:
    """
    Create embedding input string from property summary with length limits.

    Args:
        summary: Property summary dictionary
        max_chars: Maximum character count (default 2000, ~500 tokens for typical embedding models)

    Returns:
        Embedding input string, truncated with ellipsis if needed
    """
    parts = []

    # Add ancestor hierarchy
    if "ancestors" in summary and summary["ancestors"]:
        for ancestor in summary["ancestors"]:
            name = ancestor.get("name", "").strip()
            desc = ancestor.get("description", "").strip()
            if desc:
                parts.append(f"{name} ({desc})")
            else:
                parts.append(name)

    # Add current property
    name = summary.get("name", "").strip()
    desc = summary.get("description", "").strip()
    if desc:
        parts.append(f"{name} ({desc})")
    else:
        parts.append(name)

    result = " -> ".join(parts)

    # Truncate if exceeds max length
    if len(result) > max_chars:
        # Try to truncate ancestor descriptions first, keeping structure
        if len(parts) > 1:
            # Keep current property intact, truncate ancestors
            current_prop = parts[-1]
            truncated_ancestors = []

            for part in parts[:-1]:
                if len(" -> ".join(truncated_ancestors + [part, current_prop])) <= max_chars - 10:
                    truncated_ancestors.append(part)
                else:
                    # Add ellipsis to indicate truncation
                    if truncated_ancestors:
                        truncated_ancestors[0] = f"...{truncated_ancestors[0]}"
                    break

            if truncated_ancestors:
                result = " -> ".join(truncated_ancestors + [current_prop])
            else:
                # If even one ancestor is too long, just truncate the whole string
                result = result[: max_chars - 3] + "..."
        else:
            # Single property is too long, truncate it
            result = result[: max_chars - 3] + "..."

    return result


def create_source_string(metadata: dict[str, Any]) -> str:
    """Create source string from metadata."""
    parts = []

    origin = metadata.get("origin", "").strip()
    if origin:
        parts.append(origin)

    jp = metadata.get("json_pointer", "").strip()
    if jp:
        parts.append(f"JSON Pointer: {jp}")

    return " | ".join(parts)


def identify_root_schemas(
    schema_dir: str,
    preloaded_schemas: dict[str, Any] | None = None,
) -> tuple[set[str], dict[str, str]]:
    """
    Identify root schemas by finding schemas that are NOT referenced by others.

    A root schema is one whose UUID is NOT listed in any other schema's 'defs' array.
    These are the entry points that should be processed.

    Recursively searches subdirectories for JSON schema files.

    This approach matches the JavaScript schema_analyzer.js logic:
    1. Collect all schema UUIDs and map UUID -> filename (relative to schema_dir)
    2. Collect all referenced UUIDs from 'defs' arrays
    3. Root schemas are those whose UUID is NOT in the referenced set

    Args:
        schema_dir: Directory containing schema files
        preloaded_schemas: Optional pre-loaded schema data keyed by absolute file path.
            When provided, avoids reloading files from disk.

    Returns:
        Tuple of (root_schema_relative_paths, uuid_to_filepath_map)
    """
    schema_path = Path(schema_dir)
    # Get all JSON files recursively, store as relative paths
    all_files = {str(p.relative_to(schema_path)) for p in schema_path.rglob("*.json")}
    uuid_to_filename: dict[str, str] = {}
    schema_references: set[str] = set()
    # Store loaded schema data to avoid double loading
    loaded_schemas: dict[str, Any] = {}

    # Single pass: Load files once, build UUID mapping and collect references
    for fname in all_files:
        path = str(Path(os.path.join(schema_dir, fname)).resolve())

        # Use preloaded data if available, otherwise load from disk
        if preloaded_schemas and path in preloaded_schemas:
            data = preloaded_schemas[path]
        else:
            data = load_schema_file(path)
        if not data:
            continue

        # Store loaded data for later use
        loaded_schemas[fname] = data

        # Map UUID to filename
        if "uuid" in data:
            uuid_to_filename[data["uuid"]] = fname

        # Collect all UUIDs referenced in the 'defs' array
        if "defs" in data and isinstance(data["defs"], list):
            for def_ref in data["defs"]:
                # Remove leading '#' from references like "#uuid-value"
                clean_id = def_ref.lstrip("#") if isinstance(def_ref, str) else def_ref
                schema_references.add(clean_id)

    # Identify root schemas using cached data
    # A schema is ROOT if its UUID is NOT in the schema_references set
    root_schemas: set[str] = set()
    for fname, data in loaded_schemas.items():
        # Check if this schema's UUID is referenced by others
        if "uuid" in data:
            is_root = data["uuid"] not in schema_references
            if is_root:
                root_schemas.add(fname)
        else:
            # If no UUID field, check by filename pattern
            # Extract potential UUID from filename (e.g., "#abc-def.json" -> "abc-def")
            base = Path(fname).stem.lstrip("#")
            if base not in schema_references:
                root_schemas.add(fname)

    return root_schemas, uuid_to_filename


def transform_item(item: dict[str, Any]) -> dict[str, Any]:
    """Transform extracted item to prepared documents format."""
    metadata = item.get("metadata", {})
    summary = item.get("summary", {})

    return {
        "embedding_input": create_embedding_input(summary),
        "content": summary,
        "source": create_source_string(metadata),
    }


def parse_schemas_from_directory(
    schema_dir: str,
    schema_map: dict[str, Any] | None = None,
    return_stats: bool = False,
    verbose: bool = False,
    preloaded_schemas: dict[str, Any] | None = None,
) -> list[dict[str, Any]] | tuple[list[dict[str, Any]], dict[str, Any]]:
    """
    Parse root schemas from a directory with proper deduplication.

    This is the core parsing logic extracted for reuse by both CLI and pipeline.
    Only processes root schemas (those not referenced by others), with referenced
    schemas expanded inline via $ref resolution.

    Args:
        schema_dir: Path to directory containing schema files
        schema_map: Optional pre-built schema map (builds one if None)
        return_stats: If True, returns (documents, stats) tuple
        verbose: If True, prints progress messages
        preloaded_schemas: Optional pre-loaded schema data keyed by absolute file path.
            When provided, avoids reloading files from disk (used by pipeline
            to pass data already loaded during validation).

    Returns:
        List of parsed documents in transformed format.
        If return_stats=True, returns (documents, stats) where stats contains:
        - total_schema_count: Total number of schema files found
        - root_schema_count: Number of root schemas processed
        - referenced_schema_count: Number of referenced schemas
        - cached_refs: Number of $ref GUIDs cached
        - unique_properties: Number of unique properties extracted
        - total_cached_properties: Total properties in cache
        - avg_properties_per_ref: Average properties per $ref

    Raises:
        ValueError: If schema_dir is not a valid directory
    """
    # Validate schema directory
    if not os.path.isdir(schema_dir):
        raise ValueError(f"{schema_dir} is not a valid directory")

    # Build schema map for cross-file references
    if schema_map is None:
        schema_map = build_schema_map(schema_dir, preloaded_schemas=preloaded_schemas)

    # Identify root schemas (those not referenced by others)
    root_schemas, uuid_to_filename = identify_root_schemas(
        schema_dir, preloaded_schemas=preloaded_schemas
    )
    schema_path = Path(schema_dir)
    all_schemas = {str(p.relative_to(schema_path)) for p in schema_path.rglob("*.json")}
    referenced_schemas = all_schemas - root_schemas

    all_props: list[dict[str, Any]] = []
    seen_keys = set()
    # GLOBAL ref_cache to store parsed properties for each $ref GUID across ALL schema files
    global_ref_cache: dict[str, list[dict[str, Any]]] = {}

    # Process ONLY root schema files (referenced schemas are expanded inline via $ref resolution)
    for fname in sorted(root_schemas):
        path = str(Path(os.path.join(schema_dir, fname)).resolve())

        # Use preloaded data if available, otherwise load from disk
        if preloaded_schemas and path in preloaded_schemas:
            data = preloaded_schemas[path]
        else:
            data = load_schema_file(path)
        if not data:
            continue

        if verbose:
            print(f"Processing root schema: {fname}")

        # Extract document (or use root if no document field)
        document = data.get("document", data)
        origin = data.get("$id", f"file:{path}")

        # Extract properties from this schema, using GLOBAL ref_cache
        # Referenced schemas will be expanded inline through $ref resolution
        props = extract_property_paths(
            document,
            schema_map,
            schema_dir,
            current_origin=origin,
            ref_cache=global_ref_cache,  # Pass global cache to reuse parsed $refs
            ancestors=[],
        )

        # Deduplicate and collect
        for p in props:
            # Use tuple for more efficient deduplication key
            key = (p.get("metadata", {}).get("origin"), p.get("summary", {}).get("full_path"))
            if key in seen_keys:
                continue
            seen_keys.add(key)
            all_props.append(p)

    # Sort and transform
    props_sorted = sorted(all_props, key=lambda x: x["summary"]["full_path"])
    prepared = [transform_item(p) for p in props_sorted]

    # Prepare statistics
    if return_stats:
        cache_sizes = [len(props) for props in global_ref_cache.values() if props]
        total_cached_props = sum(cache_sizes) if cache_sizes else 0
        avg_props_per_ref = total_cached_props / len(cache_sizes) if cache_sizes else 0.0

        stats = {
            "total_schema_count": len(all_schemas),
            "root_schema_count": len(root_schemas),
            "referenced_schema_count": len(referenced_schemas),
            "cached_refs": len(global_ref_cache),
            "unique_properties": len(prepared),
            "total_cached_properties": total_cached_props,
            "avg_properties_per_ref": avg_props_per_ref,
            "root_schemas": root_schemas,
            "uuid_to_filename": uuid_to_filename,
        }
        return prepared, stats

    return prepared
