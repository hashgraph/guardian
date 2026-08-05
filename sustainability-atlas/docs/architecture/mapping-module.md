# Mapping Module

How the worker maps Guardian policy schemas onto the project fields the Atlas displays, and how to add
a new mapping strategy without touching pipeline orchestration.

## Overview

The mapping module lives in `src/worker/mapping/`. It answers one question: given the schemas declared
by a Guardian policy, **which field in which schema holds each of the values we want to show?**

The module deliberately keeps orchestration and algorithm separate. `MappingPipelineService` owns the
sequencing; the actual matching is delegated to an injected strategy chosen at runtime from an
environment variable. Adding a new matching approach therefore means adding a class and a switch case,
never editing the pipeline.

> **NOTE:** An earlier design also had a *schema-labelling* pass (`IMapSchemasStrategy`,
> `MAP_SCHEMAS_METHOD`, a GeoJSON strategy). It was **removed** because its output was unused
> downstream. Only field mapping remains. If you find references to schema strategies in older
> branches or notes, they describe code that no longer exists.

## Module layout

| Path | Role |
|---|---|
| `mapping-pipeline.service.ts` | Orchestrates the field-mapping step; injects one strategy |
| `policy-pipeline.service.ts` | Higher-level pass producing `policyMapping` + `schemaFields` for a policy |
| `interfaces/strategies.interface.ts` | The `IMapFieldsStrategy` contract |
| `providers/map-fields.provider.ts` | Factory selecting the strategy from `MAP_FIELDS_METHOD` |
| `tokens/mapping.tokens.ts` | Injection token, `MapFieldsMethodType` enum, default method |
| `strategies/map-fields/` | The strategy implementations |
| `flatten-schema-fields.ts`, `classify-schema-type.ts`, `derive-project-meta.ts` | Supporting passes |

## Available strategies

Selected with the `MAP_FIELDS_METHOD` environment variable.

| Value | Implementation | Notes |
|---|---|---|
| `CROSS-SCHEMA-FUZZY` | `CrossSchemaFuzzyMapperService` | **Default.** Used when the variable is unset or unrecognised |
| `HEURISTIC-FIELD-MAPPER` | `HeuristicFieldMapperService` | Rule-based matching |
| `LLM-FIELD-MAPPER` | `LlmFieldMapperService` | Model-assisted matching |

## Where the output goes

`PolicyMappingPipelineService.run()` returns `{ policyMapping, schemaFields }`. Both are persisted on
the **`policy`** table — `policyMapping` and `schemaFields` are JSONB columns on
`src/shared/entities/policy.entity.ts`. Project extraction later reads `policyMapping` to pull values
out of individual documents.

## Adding a new field-mapping strategy

### 1. Implement the interface

Create a service under `src/worker/mapping/strategies/map-fields/`:

```ts
import { Injectable } from '@nestjs/common';
import { IMapFieldsStrategy } from '../../interfaces/strategies.interface';
import { FieldMap, FieldDescriptor, SchemaInfo } from '../../types';

@Injectable()
export class MyFieldMapperService implements IMapFieldsStrategy {
    async execute(
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        const result: FieldMap = {};

        return result;
    }
}
```

### 2. Add the enum value

Add your method name to `MapFieldsMethodType` in [tokens/mapping.tokens.ts](../../src/worker/mapping/tokens/mapping.tokens.ts).

### 3. Register it in the provider

Add a matching case in [providers/map-fields.provider.ts](../../src/worker/mapping/providers/map-fields.provider.ts):

```ts
switch (method.toUpperCase()) {
    case MapFieldsMethodType.MY_FIELD_MAPPER:
        return new MyFieldMapperService();
    case MapFieldsMethodType.LLM_FIELD_MAPPER:
        return new LlmFieldMapperService();
    case MapFieldsMethodType.HEURISTIC_FIELD_MAPPER:
        return new HeuristicFieldMapperService();
    case MapFieldsMethodType.CROSS_SCHEMA_FUZZY:
    default:
        return new CrossSchemaFuzzyMapperService();
}
```

> **NOTE:** Keep `CROSS_SCHEMA_FUZZY` on the `default` branch. An unrecognised `MAP_FIELDS_METHOD`
> must fall back to a working strategy rather than failing the pipeline.

### 4. Set the environment variable

```dotenv
MAP_FIELDS_METHOD=MY-FIELD-MAPPER
```

Update `env.example` so the new option is discoverable.

### 5. Verify

Re-run policy decoding for a representative policy and confirm `policyMapping` and `schemaFields` are
still populated on the `policy` row.

## Guardrails

- Keep strategies stateless where possible.
- Return partial results rather than failing the whole pipeline, where partial output is acceptable.
- Use the NestJS logger for debug and warning output.
- Do not modify `MappingPipelineService` just to add a strategy — if you need to, the abstraction is
  wrong and should be discussed first.

## Checklist

- [ ] The class implements `IMapFieldsStrategy`
- [ ] The enum value exists in `mapping.tokens.ts`
- [ ] The provider returns the new class for the new method value
- [ ] `default` still falls back to `CrossSchemaFuzzyMapperService`
- [ ] `env.example` documents the new option
- [ ] A decode run still produces a valid `FieldMap`

## Additional documentation

- [Architecture overview](README.md) — where this module sits in the wider pipeline
- [Decode method design](decode-method.md) — the two-pass design this module's output feeds
- [Policy decode](policy-decode.md) — the decode stage that invokes this module
