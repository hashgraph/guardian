# Mapping Pipeline Architecture

## What This Module Does

This module maps policy decoder schemas and fields in two steps:

1. Map schemas to a stable label-to-id lookup.
2. Map fields to fully qualified schema paths.

The pipeline is intentionally small and implementation-agnostic. The orchestration service only knows the strategy contracts, not the concrete classes behind them.

## Core Pieces

- `MappingPipelineService` orchestrates the two-step flow.
- `IMapSchemasStrategy` returns a `SchemaLabelMap` from `SchemaInfo[]`.
- `IMapFieldsStrategy` returns a `FieldMap` from `schemaMap`, `schemas`, and `fields`.
- `mapSchemasStrategyProvider` selects the schema strategy at runtime.
- `mapFieldsStrategyProvider` selects the field strategy at runtime.
- `MappingModule` wires the providers and exports the pipeline service.

## Runtime Strategy Selection

The current runtime options are:

- `MAP_SCHEMAS_METHOD=GEOJSON` for schema mapping.
- `MAP_FIELDS_METHOD=HEURISTIC-FIELD-MAPPER` or `MAP_FIELDS_METHOD=LLM-FIELD-MAPPER` for field mapping.

Defaults are:

- `DEFAULT_MAP_SCHEMAS_METHOD = GEOJSON`
- `DEFAULT_MAP_FIELDS_METHOD = HEURISTIC-FIELD-MAPPER`

Schema mapping currently has one concrete implementation: `GeoJsonMapSchemasService`.
Field mapping currently has two dummy implementations: `HeuristicFieldMapperService` and `LlmFieldMapperService`.

## Data Flow

1. The policy decoder imports schemas into `policy_schema`.
2. `MappingPipelineService.executePipeline()` runs.
3. Step 1 builds a `SchemaLabelMap` from the imported `SchemaInfo[]`.
4. Step 2 builds a `FieldMap` using the schema map and the field descriptors.
5. Results are stored in `business_view.businessData`.

The resulting `FieldMap` values are stored as fully qualified paths in the form `${policySchema.schemaId}.${path}`.

## Important Types

- `SchemaInfo` represents a schema record and its parsed document.
- `FieldDescriptor` describes a field to locate.
- `SchemaLabelMap` maps a known schema label to its id.
- `FieldMap` maps a field name to a schema id plus path string.

## Extension Model

The extension points are the strategy interfaces. To add a new implementation, you:

1. Implement the relevant strategy interface.
2. Register the implementation in the matching factory provider.
3. Add or update the runtime method constant and environment variable handling if needed.

The pipeline service itself should not need to change.

## File Map

- [mapping-pipeline.service.ts](../mapping-pipeline.service.ts)
- [mapping.module.ts](../mapping.module.ts)
- [interfaces/strategies.interface.ts](../interfaces/strategies.interface.ts)
- [providers/map-schemas.provider.ts](../providers/map-schemas.provider.ts)
- [providers/map-fields.provider.ts](../providers/map-fields.provider.ts)
- [tokens/mapping.tokens.ts](../tokens/mapping.tokens.ts)
- [types.ts](../types.ts)
