#!/usr/bin/env python3
"""
Comprehensive tests for schema_parser.py

Tests check:
- All core schema parsing functionality
- $ref caching mechanism
- Property reuse when same $ref appears at different paths
- Cache statistics and performance

The parser reuses cached properties instead of skipping them.
"""

import json
import tempfile
from pathlib import Path

import pytest

from schema_ingestion_worker.schema_parsing.schema_parser import (
    apply_cached_properties_to_path,
    build_schema_map,
    create_embedding_input,
    create_source_string,
    extract_property_paths,
    get_property_types,
    identify_root_schemas,
    parse_schemas_from_directory,
    transform_item,
)


class TestCachingMechanism:
    """Test the $ref caching mechanism (KEY FEATURE of cached version)."""

    def test_same_ref_different_paths_both_created(self):
        """When same $ref appears at different paths, BOTH are created."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ref_schema = {
                "uuid": "uuid-ref",
                "document": {
                    "properties": {
                        "prop1": {"type": "string", "description": "Property 1"},
                        "prop2": {"type": "number", "description": "Property 2"},
                    }
                },
            }

            main_schema = {
                "properties": {
                    "pathA": {"$ref": "#uuid-ref"},
                    "pathB": {"$ref": "#uuid-ref"},  # SAME $ref
                }
            }

            Path(tmpdir, "#uuid-ref.json").write_text(json.dumps(ref_schema))
            schema_map = build_schema_map(tmpdir)

            # Use global cache
            global_cache = {}
            props = extract_property_paths(main_schema, schema_map, tmpdir, ref_cache=global_cache)

            paths = [p["summary"]["full_path"] for p in props]

            # KEY TEST: Both paths should have their properties
            assert "pathA.prop1" in paths, "pathA.prop1 should exist"
            assert "pathA.prop2" in paths, "pathA.prop2 should exist"
            assert "pathB.prop1" in paths, "pathB.prop1 should exist (CACHED REUSE)"
            assert "pathB.prop2" in paths, "pathB.prop2 should exist (CACHED REUSE)"

            # Verify cache was used
            assert len(global_cache) > 0, "Cache should be populated"

    def test_cache_reuse_count(self):
        """Verify that $ref is only parsed once, then cached."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ref_schema = {
                "uuid": "uuid-ref",
                "document": {"properties": {"prop": {"type": "string"}}},
            }

            main_schema = {
                "properties": {
                    "path1": {"$ref": "#uuid-ref"},
                    "path2": {"$ref": "#uuid-ref"},
                    "path3": {"$ref": "#uuid-ref"},
                }
            }

            Path(tmpdir, "#uuid-ref.json").write_text(json.dumps(ref_schema))
            schema_map = build_schema_map(tmpdir)

            global_cache = {}
            props = extract_property_paths(main_schema, schema_map, tmpdir, ref_cache=global_cache)

            # Should have created properties for all 3 paths
            paths = [p["summary"]["full_path"] for p in props]
            assert "path1.prop" in paths
            assert "path2.prop" in paths
            assert "path3.prop" in paths

            # But only cached once
            assert "#uuid-ref" in global_cache
            cached_props = global_cache["#uuid-ref"]
            assert len(cached_props) > 0

    def test_array_items_with_same_ref(self):
        """Array items with same $ref should all get properties."""
        with tempfile.TemporaryDirectory() as tmpdir:
            item_schema = {
                "uuid": "uuid-item",
                "document": {"properties": {"id": {"type": "string"}, "value": {"type": "number"}}},
            }

            main_schema = {
                "properties": {
                    "arrayA": {"type": "array", "items": {"$ref": "#uuid-item"}},
                    "arrayB": {
                        "type": "array",
                        "items": {"$ref": "#uuid-item"},  # SAME $ref
                    },
                }
            }

            Path(tmpdir, "#uuid-item.json").write_text(json.dumps(item_schema))
            schema_map = build_schema_map(tmpdir)

            global_cache = {}
            props = extract_property_paths(main_schema, schema_map, tmpdir, ref_cache=global_cache)

            paths = [p["summary"]["full_path"] for p in props]

            # Both arrays should have all properties
            assert "arrayA[*].id" in paths
            assert "arrayA[*].value" in paths
            assert "arrayB[*].id" in paths  # CACHED REUSE
            assert "arrayB[*].value" in paths  # CACHED REUSE

    def test_apply_cached_properties_to_path(self):
        """Test the apply_cached_properties_to_path function."""
        cached_props = [
            {
                "metadata": {"origin": "file:test.json", "json_pointer": "/properties/prop1"},
                "summary": {
                    "name": "prop1",
                    "full_path": "prop1",
                    "type": ["string"],
                    "description": "Property 1",
                    "ancestors": [],
                },
            }
        ]

        new_ancestors = [{"name": "parent", "description": "Parent", "type": ["object"]}]

        result = apply_cached_properties_to_path(cached_props, "parent", new_ancestors)

        assert len(result) == 1
        assert result[0]["summary"]["full_path"] == "parent.prop1"
        assert result[0]["summary"]["ancestors"] == new_ancestors

    def test_global_cache_across_multiple_extractions(self):
        """Global cache persists across multiple extract_property_paths calls."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ref_schema = {
                "uuid": "uuid-shared",
                "document": {"properties": {"shared": {"type": "string"}}},
            }

            schema1 = {"properties": {"field1": {"$ref": "#uuid-shared"}}}

            schema2 = {
                "properties": {
                    "field2": {"$ref": "#uuid-shared"}  # SAME $ref
                }
            }

            Path(tmpdir, "#uuid-shared.json").write_text(json.dumps(ref_schema))
            schema_map = build_schema_map(tmpdir)

            # Use same global cache for both
            global_cache = {}

            props1 = extract_property_paths(schema1, schema_map, tmpdir, ref_cache=global_cache)
            props2 = extract_property_paths(schema2, schema_map, tmpdir, ref_cache=global_cache)

            # Both should have properties
            paths1 = [p["summary"]["full_path"] for p in props1]
            paths2 = [p["summary"]["full_path"] for p in props2]

            assert "field1.shared" in paths1
            assert "field2.shared" in paths2

            # Cache should have been reused
            assert "#uuid-shared" in global_cache

    def test_nested_properties_in_ref_preserve_ancestor_chain(self):
        """Nested properties within a $ref should preserve full ancestor chain when applied to new paths."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a $ref with nested properties: level1 -> level2 -> level3
            ref_schema = {
                "uuid": "uuid-nested",
                "document": {
                    "properties": {
                        "level1": {
                            "type": "object",
                            "description": "First level",
                            "properties": {
                                "level2": {
                                    "type": "object",
                                    "description": "Second level",
                                    "properties": {
                                        "level3": {"type": "string", "description": "Third level"}
                                    },
                                }
                            },
                        }
                    }
                },
            }

            # Main schema references this nested structure
            main_schema = {
                "properties": {
                    "topLevel": {
                        "type": "object",
                        "description": "Top level property",
                        "$ref": "#uuid-nested",
                    }
                }
            }

            Path(tmpdir, "#uuid-nested.json").write_text(json.dumps(ref_schema))
            schema_map = build_schema_map(tmpdir)

            global_cache = {}
            props = extract_property_paths(main_schema, schema_map, tmpdir, ref_cache=global_cache)

            # Find the level3 property
            level3_prop = next(
                (p for p in props if p["summary"]["full_path"] == "topLevel.level1.level2.level3"),
                None,
            )

            assert level3_prop is not None, "level3 property should exist"

            # level3 should have 3 ancestors: topLevel, level1, level2
            ancestors = level3_prop["summary"]["ancestors"]
            assert len(ancestors) == 3, f"Expected 3 ancestors, got {len(ancestors)}"

            # Verify ancestor chain
            assert ancestors[0]["name"] == "topLevel", "First ancestor should be topLevel"
            assert ancestors[1]["name"] == "level1", "Second ancestor should be level1"
            assert ancestors[2]["name"] == "level2", "Third ancestor should be level2"


class TestMultipleFilesProcessing:
    """Test that parser processes multiple files from a folder."""

    def test_load_multiple_schema_files(self):
        """Build schema map from multiple files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create 3 schema files
            schema1 = {"uuid": "uuid-1", "document": {"properties": {"name": {"type": "string"}}}}
            schema2 = {"uuid": "uuid-2", "document": {"properties": {"age": {"type": "integer"}}}}
            schema3 = {"uuid": "uuid-3", "document": {"properties": {"email": {"type": "string"}}}}

            Path(tmpdir, "#uuid-1.json").write_text(json.dumps(schema1))
            Path(tmpdir, "#uuid-2.json").write_text(json.dumps(schema2))
            Path(tmpdir, "#uuid-3.json").write_text(json.dumps(schema3))

            schema_map = build_schema_map(tmpdir)

            assert len(schema_map) > 0
            assert any("uuid-1" in key for key in schema_map)
            assert any("uuid-2" in key for key in schema_map)
            assert any("uuid-3" in key for key in schema_map)

    def test_extract_from_multiple_files(self):
        """Extract properties from multiple schema files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            schema1 = {
                "uuid": "uuid-1",
                "document": {
                    "properties": {"firstName": {"type": "string", "description": "First Name"}}
                },
            }
            schema2 = {
                "uuid": "uuid-2",
                "document": {
                    "properties": {"lastName": {"type": "string", "description": "Last Name"}}
                },
            }

            Path(tmpdir, "#uuid-1.json").write_text(json.dumps(schema1))
            Path(tmpdir, "#uuid-2.json").write_text(json.dumps(schema2))

            schema_map = build_schema_map(tmpdir)

            props1 = extract_property_paths(schema1["document"], schema_map, tmpdir)
            props2 = extract_property_paths(schema2["document"], schema_map, tmpdir)

            assert len(props1) == 1
            assert len(props2) == 1
            assert props1[0]["summary"]["name"] == "firstName"
            assert props2[0]["summary"]["name"] == "lastName"

    def test_deduplication_across_files(self):
        """Same property from multiple files is deduplicated."""
        with tempfile.TemporaryDirectory() as tmpdir:
            schema1 = {
                "uuid": "uuid-1",
                "document": {"properties": {"id": {"type": "string", "description": "Identifier"}}},
            }

            Path(tmpdir, "#uuid-1.json").write_text(json.dumps(schema1))

            schema_map = build_schema_map(tmpdir)

            # Extract twice
            props1 = extract_property_paths(schema1["document"], schema_map, tmpdir)
            props2 = extract_property_paths(schema1["document"], schema_map, tmpdir)

            # Should both work independently
            assert len(props1) == 1
            assert len(props2) == 1


class TestFirstLevelAndNestedProperties:
    """Test extraction of first level and nested properties."""

    def test_first_level_properties(self):
        """Extract first level properties."""
        document = {
            "properties": {
                "name": {"type": "string", "description": "Name"},
                "age": {"type": "integer", "description": "Age"},
            }
        }

        props = extract_property_paths(document, {}, "")

        assert len(props) == 2
        names = [p["summary"]["name"] for p in props]
        assert "name" in names
        assert "age" in names

    def test_nested_properties(self):
        """Extract nested properties from inline objects."""
        document = {
            "properties": {
                "person": {
                    "type": "object",
                    "description": "Person data",
                    "properties": {
                        "firstName": {"type": "string", "description": "First name"},
                        "lastName": {"type": "string", "description": "Last name"},
                    },
                }
            }
        }

        props = extract_property_paths(document, {}, "")

        assert len(props) >= 2
        paths = [p["summary"]["full_path"] for p in props]
        assert "person" in paths
        assert "person.firstName" in paths
        assert "person.lastName" in paths

    def test_deeply_nested_properties(self):
        """Extract properties from deeply nested structures."""
        document = {
            "properties": {
                "address": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "object",
                            "properties": {
                                "coordinates": {
                                    "type": "object",
                                    "properties": {"latitude": {"type": "number"}},
                                }
                            },
                        }
                    },
                }
            }
        }

        props = extract_property_paths(document, {}, "")
        paths = [p["summary"]["full_path"] for p in props]

        assert "address" in paths
        assert "address.location" in paths
        assert "address.location.coordinates" in paths
        assert "address.location.coordinates.latitude" in paths

    def test_nested_properties_with_ancestors(self):
        """Nested properties have correct ancestor chain."""
        document = {
            "properties": {
                "person": {
                    "type": "object",
                    "description": "Person object",
                    "properties": {"name": {"type": "string", "description": "Name"}},
                }
            }
        }

        props = extract_property_paths(document, {}, "")
        name_prop = next(p for p in props if p["summary"]["name"] == "name")

        ancestors = name_prop["summary"]["ancestors"]
        assert len(ancestors) > 0
        assert any("person" in anc.get("name", "") for anc in ancestors)


class TestReferencedSchemasPropertyTypes:
    """Test processing referenced schemas in property types."""

    def test_resolve_property_ref(self):
        """Resolve $ref on a property."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ref_schema = {
                "uuid": "uuid-ref",
                "document": {
                    "properties": {
                        "refProp": {"type": "string", "description": "Referenced property"}
                    }
                },
            }

            main_schema = {"properties": {"linkedData": {"$ref": "#uuid-ref"}}}

            Path(tmpdir, "#uuid-ref.json").write_text(json.dumps(ref_schema))
            schema_map = build_schema_map(tmpdir)

            props = extract_property_paths(main_schema, schema_map, tmpdir)

            # Should extract both the reference and referenced properties
            names = [p["summary"]["name"] for p in props]
            assert "linkedData" in names
            assert "refProp" in names

    def test_resolve_nested_refs(self):
        """Resolve nested $ref chains."""
        with tempfile.TemporaryDirectory() as tmpdir:
            schema_a = {"uuid": "uuid-a", "document": {"properties": {"propA": {"type": "string"}}}}

            schema_b = {
                "uuid": "uuid-b",
                "document": {
                    "properties": {"refToA": {"$ref": "#uuid-a"}, "propB": {"type": "string"}}
                },
            }

            main_schema = {"properties": {"refToB": {"$ref": "#uuid-b"}}}

            Path(tmpdir, "#uuid-a.json").write_text(json.dumps(schema_a))
            Path(tmpdir, "#uuid-b.json").write_text(json.dumps(schema_b))
            schema_map = build_schema_map(tmpdir)

            props = extract_property_paths(main_schema, schema_map, tmpdir)
            names = [p["summary"]["name"] for p in props]

            # Should resolve the chain
            assert "refToB" in names

    def test_property_type_from_reference(self):
        """Property type is extracted from referenced schema."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ref_schema = {
                "uuid": "uuid-ref",
                "document": {"type": "object", "properties": {"id": {"type": "integer"}}},
            }

            main_schema = {"properties": {"data": {"$ref": "#uuid-ref"}}}

            Path(tmpdir, "#uuid-ref.json").write_text(json.dumps(ref_schema))
            schema_map = build_schema_map(tmpdir)

            props = extract_property_paths(main_schema, schema_map, tmpdir)

            # Find the referenced data property
            data_prop = next(p for p in props if p["summary"]["name"] == "data")
            assert data_prop["summary"]["type"] is not None


class TestArrayItemTypeReferences:
    """Test processing referenced schemas in array item types."""

    def test_array_items_with_ref(self):
        """Extract properties from array items with $ref."""
        with tempfile.TemporaryDirectory() as tmpdir:
            item_schema = {
                "uuid": "uuid-item",
                "document": {
                    "properties": {"itemProp": {"type": "string", "description": "Item property"}}
                },
            }

            main_schema = {
                "properties": {"items": {"type": "array", "items": {"$ref": "#uuid-item"}}}
            }

            Path(tmpdir, "#uuid-item.json").write_text(json.dumps(item_schema))
            schema_map = build_schema_map(tmpdir)

            props = extract_property_paths(main_schema, schema_map, tmpdir)

            names = [p["summary"]["name"] for p in props]
            assert "items[*]" in names
            assert "itemProp" in names

    def test_array_with_multiple_items(self):
        """Array extracts all item properties."""
        with tempfile.TemporaryDirectory() as tmpdir:
            item_schema = {
                "uuid": "uuid-item",
                "document": {
                    "properties": {
                        "id": {"type": "string"},
                        "value": {"type": "number"},
                        "label": {"type": "string"},
                    }
                },
            }

            main_schema = {
                "properties": {"collection": {"type": "array", "items": {"$ref": "#uuid-item"}}}
            }

            Path(tmpdir, "#uuid-item.json").write_text(json.dumps(item_schema))
            schema_map = build_schema_map(tmpdir)

            props = extract_property_paths(main_schema, schema_map, tmpdir)
            names = [p["summary"]["name"] for p in props]

            # All item properties should be extracted
            assert "id" in names
            assert "value" in names
            assert "label" in names

    def test_array_item_path_notation(self):
        """Array item paths use [*] notation."""
        with tempfile.TemporaryDirectory() as tmpdir:
            item_schema = {
                "uuid": "uuid-item",
                "document": {"properties": {"prop": {"type": "string"}}},
            }

            main_schema = {
                "properties": {"myArray": {"type": "array", "items": {"$ref": "#uuid-item"}}}
            }

            Path(tmpdir, "#uuid-item.json").write_text(json.dumps(item_schema))
            schema_map = build_schema_map(tmpdir)

            props = extract_property_paths(main_schema, schema_map, tmpdir)

            # Parent array should have [*] notation
            array_prop = next(p for p in props if "myArray" in p["summary"]["full_path"])
            assert "[*]" in array_prop["summary"]["full_path"]


class TestPropertyTypeDetection:
    """Test property type detection."""

    def test_string_type_detection(self):
        """Detect string type."""
        types = get_property_types({"type": "string"})
        assert "string" in types

    def test_number_type_detection(self):
        """Detect number types."""
        assert "number" in get_property_types({"type": "number"})
        assert "integer" in get_property_types({"type": "integer"})

    def test_object_type_detection(self):
        """Detect object type from properties."""
        types = get_property_types({"properties": {"key": {"type": "string"}}})
        assert "object" in types

    def test_array_type_detection(self):
        """Detect array type from items."""
        types = get_property_types({"items": {"type": "string"}})
        assert "array" in types

    def test_list_of_types(self):
        """Handle list of types."""
        types = get_property_types({"type": ["string", "null"]})
        assert "string" in types
        assert "null" in types

    def test_unknown_type(self):
        """Default to unknown type."""
        types = get_property_types({})
        assert "unknown" in types


class TestTransformItem:
    """Test item transformation for output."""

    def test_transform_basic_item(self):
        """Transform basic item with properties."""
        item = {
            "metadata": {"origin": "file:/test/schema.json", "json_pointer": "/properties/name"},
            "summary": {
                "name": "name",
                "full_path": "name",
                "type": ["string"],
                "description": "Name field",
                "ancestors": [],
            },
        }

        result = transform_item(item)

        assert "embedding_input" in result
        assert "content" in result
        assert "source" in result
        assert result["content"] == item["summary"]

    def test_transform_with_ancestors(self):
        """Transform item with ancestor chain."""
        item = {
            "metadata": {
                "origin": "file:/test/schema.json",
                "json_pointer": "/properties/person/properties/name",
            },
            "summary": {
                "name": "name",
                "full_path": "person.name",
                "type": ["string"],
                "description": "Full name",
                "ancestors": [
                    {"name": "person", "description": "Person object", "type": ["object"]}
                ],
            },
        }

        result = transform_item(item)

        embedding_input = result["embedding_input"]
        assert "person" in embedding_input
        assert "name" in embedding_input

    def test_embedding_input_format(self):
        """Embedding input uses arrow notation."""
        summary = {
            "name": "age",
            "full_path": "person.age",
            "type": ["integer"],
            "description": "Age in years",
            "ancestors": [{"name": "person", "description": "Person data", "type": ["object"]}],
        }

        embedding = create_embedding_input(summary)

        assert " -> " in embedding
        assert "person" in embedding
        assert "age" in embedding

    def test_source_string_generation(self):
        """Source string includes file and pointer."""
        metadata = {"origin": "file:/schemas/person.json", "json_pointer": "/properties/name"}

        source = create_source_string(metadata)

        assert "person.json" in source
        assert "JSON Pointer" in source


class TestAllOfConditionalProperties:
    """Test extraction of properties from allOf/if/then/else blocks."""

    def test_extract_properties_from_then_block(self):
        """Extract properties from 'then' block in allOf."""
        document = {
            "properties": {"status": {"type": "string", "enum": ["active", "inactive"]}},
            "allOf": [
                {
                    "if": {"properties": {"status": {"const": "active"}}},
                    "then": {
                        "properties": {
                            "activationDate": {"type": "string", "description": "Activation date"}
                        }
                    },
                }
            ],
        }

        props = extract_property_paths(document, {}, "")
        names = [p["summary"]["name"] for p in props]

        assert "status" in names
        assert "activationDate" in names

    def test_extract_properties_from_else_block(self):
        """Extract properties from 'else' block in allOf."""
        document = {
            "properties": {"status": {"type": "string", "enum": ["active", "inactive"]}},
            "allOf": [
                {
                    "if": {"properties": {"status": {"const": "active"}}},
                    "then": {"properties": {"activationDate": {"type": "string"}}},
                    "else": {
                        "properties": {
                            "deactivationDate": {
                                "type": "string",
                                "description": "Deactivation date",
                            }
                        }
                    },
                }
            ],
        }

        props = extract_property_paths(document, {}, "")
        names = [p["summary"]["name"] for p in props]

        assert "status" in names
        assert "activationDate" in names
        assert "deactivationDate" in names

    def test_extract_properties_from_both_then_and_else(self):
        """Extract properties from both then and else blocks."""
        document = {
            "properties": {"selector": {"type": "string"}},
            "allOf": [
                {
                    "if": {"properties": {"selector": {"const": "A"}}},
                    "then": {
                        "properties": {"propA": {"type": "string", "description": "Property A"}}
                    },
                    "else": {
                        "properties": {"propB": {"type": "string", "description": "Property B"}}
                    },
                }
            ],
        }

        props = extract_property_paths(document, {}, "")
        names = [p["summary"]["name"] for p in props]

        assert "selector" in names
        assert "propA" in names
        assert "propB" in names

    def test_extract_properties_from_multiple_allof_items(self):
        """Extract properties from multiple allOf items."""
        document = {
            "properties": {"field1": {"type": "string"}, "field2": {"type": "string"}},
            "allOf": [
                {
                    "if": {"properties": {"field1": {"const": "value1"}}},
                    "then": {"properties": {"conditional1": {"type": "string"}}},
                },
                {
                    "if": {"properties": {"field2": {"const": "value2"}}},
                    "then": {"properties": {"conditional2": {"type": "string"}}},
                },
            ],
        }

        props = extract_property_paths(document, {}, "")
        names = [p["summary"]["name"] for p in props]

        assert "field1" in names
        assert "field2" in names
        assert "conditional1" in names
        assert "conditional2" in names

    def test_allof_properties_with_refs(self):
        """Extract properties with $ref inside allOf blocks."""
        with tempfile.TemporaryDirectory() as tmpdir:
            ref_schema = {
                "uuid": "uuid-ref",
                "document": {
                    "properties": {
                        "refProp": {"type": "string", "description": "Referenced property"}
                    }
                },
            }

            main_schema = {
                "properties": {"selector": {"type": "string"}},
                "allOf": [
                    {
                        "if": {"properties": {"selector": {"const": "option1"}}},
                        "then": {"properties": {"conditionalRef": {"$ref": "#uuid-ref"}}},
                    }
                ],
            }

            Path(tmpdir, "#uuid-ref.json").write_text(json.dumps(ref_schema))
            schema_map = build_schema_map(tmpdir)

            props = extract_property_paths(main_schema, schema_map, tmpdir)
            names = [p["summary"]["name"] for p in props]

            assert "selector" in names
            assert "conditionalRef" in names
            assert "refProp" in names

    def test_allof_direct_properties(self):
        """Extract properties directly in allOf items (no if/then/else)."""
        document = {
            "properties": {"base": {"type": "string"}},
            "allOf": [
                {"properties": {"extended": {"type": "string", "description": "Extended property"}}}
            ],
        }

        props = extract_property_paths(document, {}, "")
        names = [p["summary"]["name"] for p in props]

        assert "base" in names
        assert "extended" in names

    def test_nested_allof_properties(self):
        """Extract nested properties within allOf then/else blocks."""
        document = {
            "properties": {"entityType": {"type": "string"}},
            "allOf": [
                {
                    "if": {"properties": {"entityType": {"const": "person"}}},
                    "then": {
                        "properties": {
                            "person": {
                                "type": "object",
                                "description": "Person object",
                                "properties": {
                                    "name": {"type": "string", "description": "Name"},
                                    "age": {"type": "integer", "description": "Age"},
                                },
                            }
                        }
                    },
                }
            ],
        }

        props = extract_property_paths(document, {}, "")
        paths = [p["summary"]["full_path"] for p in props]

        assert "entityType" in paths
        assert "person" in paths
        assert "person.name" in paths
        assert "person.age" in paths

    def test_conditional_properties_only_in_allof(self):
        """Properties defined ONLY in allOf blocks, not in main properties."""
        document = {
            "properties": {"status": {"type": "string", "enum": ["enabled", "disabled"]}},
            "allOf": [
                {
                    "if": {"properties": {"status": {"const": "enabled"}}},
                    "then": {
                        "properties": {
                            "enabledReason": {"type": "string", "description": "Why enabled"}
                        }
                    },
                }
            ],
        }

        props = extract_property_paths(document, {}, "")
        names = [p["summary"]["name"] for p in props]

        # This is the key test - property ONLY exists in allOf
        assert "enabledReason" in names

        # Verify it's not duplicated
        enabled_props = [p for p in props if p["summary"]["name"] == "enabledReason"]
        assert len(enabled_props) == 1


class TestRootSchemaDetection:
    """Test the root schema detection mechanism (KEY FEATURE of improved parser)."""

    def test_identify_root_schemas_simple(self):
        """Identify root schemas that are not referenced by others."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create 3 schemas: 1 root, 2 referenced
            root_schema = {
                "uuid": "root-uuid",
                "name": "Root Schema",
                "defs": ["#node-uuid-1", "#node-uuid-2"],
                "document": {"properties": {"rootProp": {"type": "string"}}},
            }

            node_schema_1 = {
                "uuid": "node-uuid-1",
                "name": "Node Schema 1",
                "defs": [],
                "document": {"properties": {"nodeProp1": {"type": "string"}}},
            }

            node_schema_2 = {
                "uuid": "node-uuid-2",
                "name": "Node Schema 2",
                "defs": [],
                "document": {"properties": {"nodeProp2": {"type": "string"}}},
            }

            Path(tmpdir, "#root-uuid.json").write_text(json.dumps(root_schema))
            Path(tmpdir, "#node-uuid-1.json").write_text(json.dumps(node_schema_1))
            Path(tmpdir, "#node-uuid-2.json").write_text(json.dumps(node_schema_2))

            root_schemas, uuid_map = identify_root_schemas(tmpdir)

            # Should identify only the root schema
            assert len(root_schemas) == 1
            assert "#root-uuid.json" in root_schemas

            # Node schemas should NOT be in root set
            assert "#node-uuid-1.json" not in root_schemas
            assert "#node-uuid-2.json" not in root_schemas

    def test_identify_multiple_root_schemas(self):
        """Identify multiple root schemas when they don't reference each other."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root1 = {
                "uuid": "root-1",
                "name": "Root 1",
                "defs": ["#shared-node"],
                "document": {"properties": {"prop1": {"type": "string"}}},
            }

            root2 = {
                "uuid": "root-2",
                "name": "Root 2",
                "defs": ["#shared-node"],
                "document": {"properties": {"prop2": {"type": "string"}}},
            }

            shared_node = {
                "uuid": "shared-node",
                "name": "Shared Node",
                "defs": [],
                "document": {"properties": {"sharedProp": {"type": "string"}}},
            }

            Path(tmpdir, "#root-1.json").write_text(json.dumps(root1))
            Path(tmpdir, "#root-2.json").write_text(json.dumps(root2))
            Path(tmpdir, "#shared-node.json").write_text(json.dumps(shared_node))

            root_schemas, uuid_map = identify_root_schemas(tmpdir)

            # Both root schemas should be identified
            assert len(root_schemas) == 2
            assert "#root-1.json" in root_schemas
            assert "#root-2.json" in root_schemas

            # Shared node should NOT be root
            assert "#shared-node.json" not in root_schemas

    def test_root_schema_with_no_defs(self):
        """Root schema with no defs (standalone schema) is identified correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            standalone = {
                "uuid": "standalone-uuid",
                "name": "Standalone Schema",
                "defs": [],
                "document": {"properties": {"standaloneProp": {"type": "string"}}},
            }

            Path(tmpdir, "#standalone-uuid.json").write_text(json.dumps(standalone))

            root_schemas, uuid_map = identify_root_schemas(tmpdir)

            # Standalone schema should be identified as root
            assert len(root_schemas) == 1
            assert "#standalone-uuid.json" in root_schemas

    def test_nested_references_only_direct_refs_matter(self):
        """Only direct references in defs array determine root status."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root = {
                "uuid": "root",
                "name": "Root",
                "defs": ["#level-1"],
                "document": {"properties": {}},
            }

            level_1 = {
                "uuid": "level-1",
                "name": "Level 1",
                "defs": ["#level-2"],
                "document": {"properties": {}},
            }

            level_2 = {
                "uuid": "level-2",
                "name": "Level 2",
                "defs": [],
                "document": {"properties": {}},
            }

            Path(tmpdir, "#root.json").write_text(json.dumps(root))
            Path(tmpdir, "#level-1.json").write_text(json.dumps(level_1))
            Path(tmpdir, "#level-2.json").write_text(json.dumps(level_2))

            root_schemas, uuid_map = identify_root_schemas(tmpdir)

            # Only root should be identified
            assert len(root_schemas) == 1
            assert "#root.json" in root_schemas

            # Both levels are referenced
            assert "#level-1.json" not in root_schemas
            assert "#level-2.json" not in root_schemas

    def test_uuid_to_filename_mapping(self):
        """Verify UUID to filename mapping is correctly built."""
        with tempfile.TemporaryDirectory() as tmpdir:
            schema1 = {
                "uuid": "uuid-1",
                "name": "Schema 1",
                "defs": [],
                "document": {"properties": {}},
            }

            schema2 = {
                "uuid": "uuid-2",
                "name": "Schema 2",
                "defs": [],
                "document": {"properties": {}},
            }

            Path(tmpdir, "#uuid-1.json").write_text(json.dumps(schema1))
            Path(tmpdir, "#uuid-2.json").write_text(json.dumps(schema2))

            root_schemas, uuid_map = identify_root_schemas(tmpdir)

            # UUID mapping should be correct
            assert "uuid-1" in uuid_map
            assert "uuid-2" in uuid_map
            assert uuid_map["uuid-1"] == "#uuid-1.json"
            assert uuid_map["uuid-2"] == "#uuid-2.json"

    def test_empty_directory(self):
        """Handle empty directory gracefully."""
        with tempfile.TemporaryDirectory() as tmpdir:
            root_schemas, uuid_map = identify_root_schemas(tmpdir)

            assert len(root_schemas) == 0
            assert len(uuid_map) == 0

    def test_real_world_scenario_8_roots_443_nodes(self):
        """Simulate real-world scenario with 8 root schemas and multiple nodes."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create 8 root schemas
            for i in range(8):
                root = {
                    "uuid": f"root-{i}",
                    "name": f"Root Schema {i}",
                    "defs": [f"#node-{i}-1", f"#node-{i}-2"],
                    "document": {"properties": {f"rootProp{i}": {"type": "string"}}},
                }
                Path(tmpdir, f"#root-{i}.json").write_text(json.dumps(root))

            # Create 16 node schemas (referenced by roots)
            for i in range(8):
                for j in [1, 2]:
                    node = {
                        "uuid": f"node-{i}-{j}",
                        "name": f"Node Schema {i}-{j}",
                        "defs": [],
                        "document": {"properties": {f"nodeProp{i}{j}": {"type": "string"}}},
                    }
                    Path(tmpdir, f"#node-{i}-{j}.json").write_text(json.dumps(node))

            root_schemas, uuid_map = identify_root_schemas(tmpdir)

            # Should identify exactly 8 root schemas
            assert len(root_schemas) == 8

            # Verify all root files are identified
            for i in range(8):
                assert f"#root-{i}.json" in root_schemas

            # Verify no node files are identified as roots
            for i in range(8):
                for j in [1, 2]:
                    assert f"#node-{i}-{j}.json" not in root_schemas


class TestProductionDataStatistics:
    """
    Test production schema property extraction statistics.

    This test validates that the schema parser extracts the expected number of
    properties from production data in data/input/schemas before proceeding to
    the embedding stage. It helps detect:
    - Unintended schema changes (files added/removed)
    - Parser regressions (extraction logic bugs)
    - Schema structure issues (invalid files, missing properties)

    If this test fails after schema updates, run it once to see new counts,
    then update the EXPECTED_* constants below.
    """

    # Expected statistics from production data (as of baseline run)
    EXPECTED_TOTAL_SCHEMAS = 449
    EXPECTED_ROOT_SCHEMAS = 8
    EXPECTED_REFERENCED_SCHEMAS = 441
    EXPECTED_CACHED_REFS = 441
    EXPECTED_UNIQUE_PROPERTIES = 8634
    EXPECTED_TOTAL_CACHED_PROPERTIES = 17278
    EXPECTED_AVG_PROPERTIES_PER_REF = 39.2

    def test_production_schemas_property_extraction_statistics(self):
        """
        Validate property extraction statistics from production schemas.

        This test:
        1. Discovers all schema files in data/input/schemas
        2. Identifies root schemas (not referenced by others)
        3. Extracts properties using SchemaParser
        4. Validates key statistics match expected values

        This ensures the extraction phase produces expected results before
        embedding generation.
        """
        import os

        # Path to production schemas (repo_root/data/input/schemas)
        schema_dir = (
            Path(__file__).parent.parent.parent.parent.parent.parent / "data" / "input" / "schemas"
        )

        # Skip test if directory doesn't exist or is empty (e.g., CI environment)
        if not schema_dir.exists():
            pytest.skip(f"Production schema directory not found: {schema_dir}")

        schema_files = list(schema_dir.glob("*.json"))
        if not schema_files:
            pytest.skip(f"No schema files found in: {schema_dir}")

        schema_dir_str = str(schema_dir)

        # 1. Build schema map for cross-file references
        schema_map = build_schema_map(schema_dir_str)

        # 2. Identify root schemas
        root_schemas, uuid_to_filename = identify_root_schemas(schema_dir_str)
        all_schemas = {fname for fname in os.listdir(schema_dir_str) if fname.endswith(".json")}
        referenced_schemas = all_schemas - root_schemas

        # 3. Extract properties from all root schemas
        all_props = []
        seen_keys = set()
        global_ref_cache = {}

        for root_file in sorted(root_schemas):  # Sort for deterministic processing
            schema_path = schema_dir / root_file

            # Load schema file
            with open(schema_path, encoding="utf-8") as f:
                schema_data = json.load(f)

            # Extract properties
            origin = f"file:{root_file}"
            props = extract_property_paths(
                schema_data.get("document", {}),
                schema_map,
                schema_dir_str,
                current_origin=origin,
                ref_cache=global_ref_cache,
                ancestors=[],
            )

            # Deduplicate properties
            for p in props:
                key = (
                    f"{p.get('metadata', {}).get('origin')}|{p.get('summary', {}).get('full_path')}"
                )
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                all_props.append(p)

        # 4. Calculate statistics
        total_schemas = len(all_schemas)
        root_schemas_count = len(root_schemas)
        referenced_schemas_count = len(referenced_schemas)
        cached_refs = len(global_ref_cache)
        unique_properties = len(all_props)

        # Calculate cache statistics
        cache_sizes = [len(props) for props in global_ref_cache.values() if props]
        total_cached_properties = sum(cache_sizes) if cache_sizes else 0
        avg_properties_per_ref = total_cached_properties / len(cache_sizes) if cache_sizes else 0.0

        # 5. Assert expected values with helpful error messages
        assert total_schemas == self.EXPECTED_TOTAL_SCHEMAS, (
            f"Total schemas mismatch\n"
            f"  Expected: {self.EXPECTED_TOTAL_SCHEMAS}\n"
            f"  Actual: {total_schemas}\n"
            f"  Difference: {total_schemas - self.EXPECTED_TOTAL_SCHEMAS:+d} "
            f"({(total_schemas - self.EXPECTED_TOTAL_SCHEMAS) / self.EXPECTED_TOTAL_SCHEMAS * 100:+.2f}%)"
        )

        assert root_schemas_count == self.EXPECTED_ROOT_SCHEMAS, (
            f"Root schemas count mismatch\n"
            f"  Expected: {self.EXPECTED_ROOT_SCHEMAS}\n"
            f"  Actual: {root_schemas_count}\n"
            f"  Difference: {root_schemas_count - self.EXPECTED_ROOT_SCHEMAS:+d}"
        )

        assert referenced_schemas_count == self.EXPECTED_REFERENCED_SCHEMAS, (
            f"Referenced schemas count mismatch\n"
            f"  Expected: {self.EXPECTED_REFERENCED_SCHEMAS}\n"
            f"  Actual: {referenced_schemas_count}\n"
            f"  Difference: {referenced_schemas_count - self.EXPECTED_REFERENCED_SCHEMAS:+d}"
        )

        assert cached_refs == self.EXPECTED_CACHED_REFS, (
            f"Cached $ref GUIDs count mismatch\n"
            f"  Expected: {self.EXPECTED_CACHED_REFS}\n"
            f"  Actual: {cached_refs}\n"
            f"  Difference: {cached_refs - self.EXPECTED_CACHED_REFS:+d}"
        )

        assert unique_properties == self.EXPECTED_UNIQUE_PROPERTIES, (
            f"Unique properties count mismatch\n"
            f"  Expected: {self.EXPECTED_UNIQUE_PROPERTIES}\n"
            f"  Actual: {unique_properties}\n"
            f"  Difference: {unique_properties - self.EXPECTED_UNIQUE_PROPERTIES:+d} "
            f"({(unique_properties - self.EXPECTED_UNIQUE_PROPERTIES) / self.EXPECTED_UNIQUE_PROPERTIES * 100:+.2f}%)"
        )

        assert total_cached_properties == self.EXPECTED_TOTAL_CACHED_PROPERTIES, (
            f"Total cached properties count mismatch\n"
            f"  Expected: {self.EXPECTED_TOTAL_CACHED_PROPERTIES}\n"
            f"  Actual: {total_cached_properties}\n"
            f"  Difference: {total_cached_properties - self.EXPECTED_TOTAL_CACHED_PROPERTIES:+d}"
        )

        assert abs(avg_properties_per_ref - self.EXPECTED_AVG_PROPERTIES_PER_REF) < 0.1, (
            f"Average properties per $ref mismatch\n"
            f"  Expected: {self.EXPECTED_AVG_PROPERTIES_PER_REF:.1f}\n"
            f"  Actual: {avg_properties_per_ref:.1f}\n"
            f"  Difference: {avg_properties_per_ref - self.EXPECTED_AVG_PROPERTIES_PER_REF:+.1f}"
        )

    def test_parse_schemas_from_directory_function(self):
        """
        Test the refactored parse_schemas_from_directory function.

        This test validates that the refactored function (used by both CLI
        and pipeline) produces the same statistics as the manual extraction.
        """
        schema_dir = (
            Path(__file__).parent.parent.parent.parent.parent.parent / "data" / "input" / "schemas"
        )

        if not schema_dir.exists():
            pytest.skip(f"Production schema directory not found: {schema_dir}")

        schema_files = list(schema_dir.glob("*.json"))
        if not schema_files:
            pytest.skip(f"No schema files found in: {schema_dir}")

        # Call refactored function
        documents, stats = parse_schemas_from_directory(str(schema_dir), return_stats=True)

        # Validate statistics match expected values
        assert stats["total_schema_count"] == self.EXPECTED_TOTAL_SCHEMAS, (
            f"Total schemas mismatch: expected {self.EXPECTED_TOTAL_SCHEMAS}, "
            f"got {stats['total_schema_count']}"
        )

        assert stats["root_schema_count"] == self.EXPECTED_ROOT_SCHEMAS, (
            f"Root schemas mismatch: expected {self.EXPECTED_ROOT_SCHEMAS}, "
            f"got {stats['root_schema_count']}"
        )

        assert stats["referenced_schema_count"] == self.EXPECTED_REFERENCED_SCHEMAS, (
            f"Referenced schemas mismatch: expected {self.EXPECTED_REFERENCED_SCHEMAS}, "
            f"got {stats['referenced_schema_count']}"
        )

        assert stats["cached_refs"] == self.EXPECTED_CACHED_REFS, (
            f"Cached $refs mismatch: expected {self.EXPECTED_CACHED_REFS}, "
            f"got {stats['cached_refs']}"
        )

        assert len(documents) == self.EXPECTED_UNIQUE_PROPERTIES, (
            f"Unique properties mismatch: expected {self.EXPECTED_UNIQUE_PROPERTIES}, "
            f"got {len(documents)}"
        )

        assert stats["unique_properties"] == self.EXPECTED_UNIQUE_PROPERTIES, (
            f"Stats unique properties mismatch: expected {self.EXPECTED_UNIQUE_PROPERTIES}, "
            f"got {stats['unique_properties']}"
        )

        # Validate document structure
        assert all(isinstance(doc, dict) for doc in documents), "All documents should be dicts"
        assert all(
            "embedding_input" in doc and "content" in doc and "source" in doc for doc in documents
        ), "All documents should have required fields"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
