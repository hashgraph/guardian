# Adding a New Mapping Strategy

This guide is for developers who want to add or swap a schema or field mapping strategy without touching the pipeline orchestration.

## What You Can Extend

There are two strategy interfaces:

- `IMapSchemasStrategy` for schema-to-label mapping.
- `IMapFieldsStrategy` for field-to-path mapping.

Today the code supports these method values:

- Schema mapping: `GEOJSON`
- Field mapping: `HEURISTIC-FIELD-MAPPER`, `LLM-FIELD-MAPPER`

## Standard Pattern

Every new strategy follows the same flow:

1. Create a class that implements the relevant interface.
2. Add the class to the matching provider switch.
3. Add a new enum value in `tokens/mapping.tokens.ts` if you are introducing a new method name.
4. Set the environment variable to that method value.
5. Update `env.example` so the new option is visible to other developers.
6. Verify the pipeline still works end to end.

## Example: Add a New Field Strategy

### 1. Implement the interface

Create a service such as `src/worker/mapping/strategies/map-fields/llm-field-mapper.service.ts`.

```ts
import { Injectable } from '@nestjs/common';
import { IMapFieldsStrategy } from '../../interfaces/strategies.interface';
import { FieldMap, FieldDescriptor, SchemaInfo, SchemaLabelMap } from '../../types';

@Injectable()
export class LlmFieldMapperService implements IMapFieldsStrategy {
  async execute(
    schemaMap: SchemaLabelMap,
    schemas: SchemaInfo[],
    fields: FieldDescriptor[],
  ): Promise<FieldMap> {
    const result: FieldMap = {};

    return result;
  }
}
```

### 2. Register it in the provider

Update [providers/map-fields.provider.ts](../providers/map-fields.provider.ts) to return the new class for a new method value.

```ts
switch (method.toUpperCase()) {
  case MapFieldsMethodType.LLM_FIELD_MAPPER:
    return new LlmFieldMapperService();
  case MapFieldsMethodType.HEURISTIC_FIELD_MAPPER:
  default:
    return new HeuristicFieldMapperService();
}
```

Add your new enum value first, then add a matching case.

### 3. Add the env var

Set the method in your environment:

```bash
MAP_FIELDS_METHOD=LLM-FIELD-MAPPER
```

### 4. Test it

Run the pipeline with representative schemas and fields, then confirm the output still lands in `business_view.businessData`.

## Example: Add a New Schema Strategy

The same pattern applies to schema mapping:

1. Implement `IMapSchemasStrategy`.
2. Register it in [providers/map-schemas.provider.ts](../providers/map-schemas.provider.ts).
3. Add the method value to [tokens/mapping.tokens.ts](../tokens/mapping.tokens.ts).
4. Set `MAP_SCHEMAS_METHOD` to the new value.

Current schema mapping only exposes `GEOJSON`, so adding a second schema strategy would be a real code change, not just a doc update.

## Guardrails

- Keep strategies stateless where possible.
- Return partial results instead of failing the whole pipeline when that is acceptable.
- Use the NestJS logger for debug and warning output.
- Do not change `MappingPipelineService` just to add a new strategy.

## Quick Verification Checklist

- The new class implements the correct interface.
- The provider returns the new class for the new method value.
- The env var is documented and set.
- The pipeline still produces a valid `SchemaLabelMap` and `FieldMap`.
