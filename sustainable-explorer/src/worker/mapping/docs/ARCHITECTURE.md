# Schema and Field Mapping Pipeline Architecture

## Overview

This document describes the **extensible, modular mapping pipeline** for schema and field processing in the policy decoder. The architecture follows NestJS best practices and the Strategy pattern to ensure low coupling, high extensibility, and ease of adding new mapping methods.

## Core Design Principles

### 1. **Strict Input/Output Contracts**
Each step in the pipeline has well-defined interfaces:
- **`IMapSchemasStrategy`**: Takes schemas, returns `SchemaLabelMap`
- **`IMapFieldsStrategy`**: Takes schema map + schemas + fields, returns `FieldMap`

### 2. **Implementation-Agnostic Pipeline**
The `MappingPipelineService` doesn't know HOW schemas or fields are mapped—it only knows the contract (interface). Any implementation can be swapped without pipeline changes.

### 3. **Dependency Injection + Factory Pattern**
- Injection tokens define the contract points
- Factory providers resolve implementations at runtime based on environment variables
- The DI container manages all instances—no manual instantiation

### 4. **Runtime Strategy Selection**
Environment variables control which implementation runs:
```bash
MAP_SCHEMAS_METHOD=RULE        # or AI
MAP_FIELDS_METHOD=RULE         # or AI
```

---

## Architecture

### Folder Structure

```
src/worker/mapping/
├── interfaces/
│   └── strategies.interface.ts          # Contract definitions
│
├── strategies/
│   ├── map-schemas/
│   │   ├── rule-map-schemas.service.ts     # Rule-based implementation
│   │   └── ai-map-schemas.service.ts       # AI-based implementation
│   │
│   └── map-fields/
│       ├── rule-map-fields.service.ts      # Rule-based implementation
│       └── ai-map-fields.service.ts        # AI-based implementation
│
├── providers/
│   ├── map-schemas.provider.ts          # Factory provider
│   └── map-fields.provider.ts           # Factory provider
│
├── tokens/
│   └── mapping.tokens.ts                # Injection tokens
│
├── types.ts                             # Type definitions
├── mapping-pipeline.service.ts          # Orchestration service
└── mapping.module.ts                    # Module definition
```

---

## Step 1: Map Schemas

### Purpose
Convert raw schema documents into a labeled map that identifies each schema.

### Input
```typescript
SchemaInfo[]
// Example:
[
  {
    id: 'uuid-1',
    name: 'ProjectSchema',
    document: { properties: {...}, ... },
    rawSchema: {...}
  },
  {
    id: 'uuid-2',
    name: 'PDD',
    document: { properties: {...}, ... },
    rawSchema: {...}
  }
]
```

### Output
```typescript
SchemaLabelMap
// Example:
{
  'ProjectSchema': 'uuid-1',
  'PDD': 'uuid-2',
  'MonitoringReport': 'uuid-3'
}
```

### Contract
```typescript
interface IMapSchemasStrategy {
    execute(schemas: SchemaInfo[]): Promise<SchemaLabelMap>;
}
```

### Implementations

#### **GeoJsonMapSchemasService** (Current Implementation)
- Uses GeoJSON-based analysis to map schemas
- Maps schemas based on geographic/location data
- Returns schemas in GeoJSON format structure

---

## Step 2: Map Fields

### Purpose
Locate individual fields within schema documents and map them to their paths.

### Input
```typescript
schemaMap: SchemaLabelMap,              // Output from Step 1
schemas: SchemaInfo[],                  // Original schemas
fields: FieldDescriptor[]               // Fields to locate

// Example FieldDescriptor:
{
  fieldName: 'Project Title',
  description: 'Name of the project',
  keywords: ['title', 'name', 'projectName']
}
```

### Output
```typescript
FieldMap
// Example:
{
  'Project Title': 'schemaId.projectDescription.name',
  'Emissions': 'schemaId.projectDescription.emissions'
}
```

Each value is a single string built from the `policy_schema.schemaId` column and the mapped path.

### Contract
```typescript
interface IMapFieldsStrategy {
    execute(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[]
    ): Promise<FieldMap>;
}
```

### Implementations

#### **RuleMapFieldsService** (Default)
- Keyword and fuzzy matching against schema properties
- Builds searchable index of schema properties
- Fast, deterministic
- Supports exact match, keyword match, fuzzy match

#### **AIMapFieldsService**
- Uses LLM to semantically match field descriptions to schema properties
- Placeholder for future LLM integration
- Falls back to rule-based when LLM unavailable
- Better for ambiguous field names

---

## Pipeline Orchestration

### MappingPipelineService

Combines Step 1 and Step 2, with error handling and logging.

```typescript
// Execute both steps
const { schemaMap, fieldMap } = await pipeline.executePipeline(schemas, fields);

// Or execute individually
const schemaMap = await pipeline.mapSchemas(schemas);
const fieldMap = await pipeline.mapFields(schemaMap, schemas, fields);
```

### Runtime Strategy Injection

The pipeline injects the configured strategies:

```typescript
constructor(
    @Inject(MAP_SCHEMAS_STRATEGY_TOKEN)
    private readonly mapSchemasStrategy: IMapSchemasStrategy,
    
    @Inject(MAP_FIELDS_STRATEGY_TOKEN)
    private readonly mapFieldsStrategy: IMapFieldsStrategy,
)
```

The factory providers resolve the correct implementations based on environment variables.

---

## Factory Providers

### mapSchemasStrategyProvider
```typescript
@Inject(MAP_SCHEMAS_STRATEGY_TOKEN)
useFactory: (configService: ConfigService) => {
    const method = configService.get('MAP_SCHEMAS_METHOD', 'GEOJSON');
    switch (method.toUpperCase()) {
        case 'GEOJSON':
        default:
            return new GeoJsonMapSchemasService();
    }
};
```

### mapFieldsStrategyProvider
```typescript
@Inject(MAP_FIELDS_STRATEGY_TOKEN)
useFactory: (configService: ConfigService) => {
    const method = configService.get('MAP_FIELDS_METHOD', 'RULE');
    switch (method.toUpperCase()) {
        case 'AI':
            return new AIMapFieldsService();
        default:
            return new RuleMapFieldsService();
    }
};
```

---

## Integration with Policy Decode

The mapping pipeline is invoked after schema extraction in the policy decoder:

```typescript
// 1. Extract and store schemas from ZIP
await this.policySchemaImportService.importSchemasFromZip(zip, context);

// 2. Execute mapping pipeline
await this.executeMapping(policyTopicId);

// 3. Results stored in business_view.businessData
{
    schemaLabelMap: {...},
    fieldMap: {
        'Project Title': 'schemaId.projectDescription.name',
        'Emissions': 'schemaId.projectDescription.emissions'
    }
}
```

---

## Extensibility Guide

### Adding a New Schema Mapping Strategy

#### Step 1: Create the Implementation
```typescript
// src/worker/mapping/strategies/map-schemas/custom-map-schemas.service.ts

import { Injectable } from '@nestjs/common';
import { IMapSchemasStrategy } from '../../interfaces/strategies.interface';

@Injectable()
export class CustomMapSchemasService implements IMapSchemasStrategy {
    async execute(schemas: SchemaInfo[]): Promise<SchemaLabelMap> {
        // Your custom logic here
        return { /* SchemaLabelMap */ };
    }
}
```

#### Step 2: Register in Factory Provider
```typescript
// src/worker/mapping/providers/map-schemas.provider.ts

switch (method.toUpperCase()) {
    case 'CUSTOM':
        return new CustomMapSchemasService();
    case 'AI':
        return new AIMapSchemasService();
    default:
        return new GeoJsonMapSchemasService();
}
```

#### Step 3: Add Configuration
```bash
MAP_SCHEMAS_METHOD=CUSTOM
```

**That's it!** No changes needed to:
- `MappingPipelineService`
- Policy decoder
- Existing implementations

---

### Adding a New Field Mapping Strategy

Same process as above, but for `IMapFieldsStrategy`:

#### Step 1: Implement Interface
```typescript
// src/worker/mapping/strategies/map-fields/ml-map-fields.service.ts

@Injectable()
export class MLMapFieldsService implements IMapFieldsStrategy {
    async execute(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[]
    ): Promise<FieldMap> {
        // Machine learning-based field matching
        return { /* FieldMap */ };
    }
}
```

#### Step 2: Register in Factory Provider
```typescript
switch (method.toUpperCase()) {
    case 'ML':
        return new MLMapFieldsService();
    case 'AI':
        return new AIMapFieldsService();
    default:
        return new RuleMapFieldsService();
}
```

#### Step 3: Set Environment Variable
```bash
MAP_FIELDS_METHOD=ML
```

---

## Testing the Pipeline

### Test Rule-Based Mapping
```typescript
// Default configuration
process.env.MAP_SCHEMAS_METHOD = 'RULE';
process.env.MAP_FIELDS_METHOD = 'RULE';

const { schemaMap, fieldMap } = await pipeline.executePipeline(schemas, fields);
```

### Test AI-Based Mapping
```typescript
// Switch implementations
process.env.MAP_SCHEMAS_METHOD = 'AI';
process.env.MAP_FIELDS_METHOD = 'AI';

const { schemaMap, fieldMap } = await pipeline.executePipeline(schemas, fields);
```

---

## Environment Configuration

### Variables
```bash
# Schema mapping strategy (default: RULE)
MAP_SCHEMAS_METHOD=RULE|AI|CUSTOM

# Field mapping strategy (default: RULE)
MAP_FIELDS_METHOD=RULE|AI|ML

# Example configuration
MAP_SCHEMAS_METHOD=RULE
MAP_FIELDS_METHOD=AI
```

### Override in Code
```typescript
// For testing or specific use cases
configService.set('MAP_SCHEMAS_METHOD', 'AI');
configService.set('MAP_FIELDS_METHOD', 'RULE');
```

---

## Best Practices

1. **Keep implementations small and focused**
   - Each strategy should do ONE thing well
   - Avoid unnecessary abstraction layers

2. **Ensure strategies are stateless**
   - No shared state between calls
   - Strategies should be thread-safe

3. **Follow the contract strictly**
   - Honor input/output types
   - Return consistent results

4. **Log appropriately**
   - Use NestJS Logger
   - Log at DEBUG level for detailed info
   - Log at WARN level for skipped fields
   - Log at ERROR level for failures

5. **Handle errors gracefully**
   - Strategies should not crash the pipeline
   - Return partial results when possible
   - Allow fallback mechanisms

6. **Document your strategy**
   - Explain the algorithm
   - List dependencies
   - Document limitations

---

## Common Patterns

### Fallback to Rule-Based
Implement a strategy that falls back to rule-based matching when a primary method fails:

```typescript
async intelligentlyMapField(field: FieldDescriptor): Promise<...> {
    try {
        return await this.aiBasedMapping(field);
    } catch (error) {
        this.logger.warn(`AI mapping failed, falling back to rule-based`);
        return this.ruleBasedMapping(field);
    }
}
```

### Caching Results
For expensive operations, cache the schema index:

```typescript
private schemaIndexCache: Map<string, ...> = new Map();

private buildSchemaIndex(schemas: SchemaInfo[]): ... {
    const cacheKey = this.generateCacheKey(schemas);
    if (this.schemaIndexCache.has(cacheKey)) {
        return this.schemaIndexCache.get(cacheKey);
    }
    // Build and cache...
}
```

### Partial Processing
Handle cases where not all fields can be mapped:

```typescript
async execute(fields: FieldDescriptor[]): Promise<FieldMap> {
    const result: FieldMap = {};
    for (const field of fields) {
        const mapping = await this.tryMapping(field);
        if (mapping) {
            result[field.fieldName] = mapping;
        } else {
            this.logger.warn(`Could not map field: ${field.fieldName}`);
        }
    }
    return result;
}
```

---

## Future Enhancements

1. **LLM Integration**
   - Integrate OpenAI, Gemini, or other LLM services
   - Implement semantic understanding for better field matching
   - Cache LLM results for performance

2. **ML-Based Mapping**
   - Train models on historical field mappings
   - Improve accuracy over time
   - Support for custom training data

3. **Hybrid Strategies**
   - Combine multiple approaches (rule + AI)
   - Weighted voting for better results
   - Confidence scoring for results

4. **Performance Optimization**
   - Batch process multiple policies
   - Parallel strategy execution
   - Result caching and reuse

5. **Observability**
   - Detailed metrics for each strategy
   - Tracing for debugging
   - Performance monitoring

---

## Troubleshooting

### Mappings Not Generated
1. Check `MAP_SCHEMAS_METHOD` and `MAP_FIELDS_METHOD` environment variables
2. Verify schemas are imported successfully
3. Check logs for errors in `executeMapping`
4. Ensure `policy_schema` table is populated

### Incorrect Field Mappings
1. Review field descriptor keywords in `getDefaultFieldDescriptors()`
2. Check schema structure with `RuleMapFieldsService` first
3. Switch to `AI` method if rule-based fails
4. Add more keywords to field descriptors

### Performance Issues
1. Profile with large schema sets
2. Consider caching schema indices
3. Implement streaming for very large schemas
4. Use `AI` method selectively for critical fields

---

## Related Documentation

- [Policy Decode Processor](../processors/policy-decode.processor.ts)
- [NestJS Dependency Injection](https://docs.nestjs.com/providers)
- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy)
