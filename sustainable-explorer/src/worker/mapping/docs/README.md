# Mapping Pipeline

A **structured, extensible mapping pipeline** for schema and field processing in policy decoding.

## Overview

This pipeline transforms raw policy schemas into labeled, queryable field mappings through a two-step process:

1. **Map Schemas** - Identify and label schemas
2. **Map Fields** - Locate specific fields within schemas

The design ensures **low coupling**, **high extensibility**, and **runtime configurability** using NestJS dependency injection and the Strategy pattern.

## Quick Start

### Basic Usage

```typescript
// Inject the pipeline service
constructor(private pipeline: MappingPipelineService) {}

// Execute mapping
const { schemaMap, fieldMap } = await this.pipeline.executePipeline(
    schemas,
    fields,
);
```

### Configuration

Control which strategy implementations run via environment variables:

```bash
MAP_SCHEMAS_METHOD=RULE        # 'RULE' (default) or 'AI'
MAP_FIELDS_METHOD=RULE         # 'RULE' (default) or 'AI'
```

### Adding a New Strategy

1. Create class implementing `IMapSchemasStrategy` or `IMapFieldsStrategy`
2. Register in factory provider
3. Set environment variable

**That's it!** No changes to the pipeline or other strategies.

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Comprehensive design documentation
  - Core concepts and design principles
  - Detailed step descriptions
  - Factory pattern explanation
  - Extensibility guide with examples
  - Best practices and troubleshooting

- **[QUICK_START.md](./QUICK_START.md)** - Practical reference
  - Usage examples
  - Strategy creation walkthrough
  - Testing approaches
  - Common patterns (fallback, hybrid, caching)
  - Debugging tips

- **[DIAGRAMS.md](./DIAGRAMS.md)** - Visual architecture
  - Component diagram
  - Strategy pattern flow
  - Data flow diagram
  - Dependency injection graph
  - File structure tree

## Project Structure

```
mapping/
├── interfaces/
│   └── strategies.interface.ts              # Strategy contracts
├── strategies/
│   ├── map-schemas/
│   │   ├── rule-map-schemas.service.ts     # Fast, heuristic-based
│   │   └── ai-map-schemas.service.ts       # LLM placeholder
│   └── map-fields/
│       ├── rule-map-fields.service.ts      # Keyword/fuzzy matching
│       └── ai-map-fields.service.ts        # LLM placeholder
├── providers/
│   ├── map-schemas.provider.ts              # Factory + env selection
│   └── map-fields.provider.ts               # Factory + env selection
├── tokens/
│   └── mapping.tokens.ts                    # Injection tokens
├── types.ts                                 # Type definitions
├── mapping-pipeline.service.ts              # Orchestration
├── mapping.module.ts                        # NestJS module
├── ARCHITECTURE.md                          # Full documentation
├── QUICK_START.md                           # Quick reference
└── DIAGRAMS.md                              # Visual diagrams
```

## Core Interfaces

### IMapSchemasStrategy
Maps raw schemas to a labeled identifier map.

```typescript
interface IMapSchemasStrategy {
    execute(schemas: SchemaInfo[]): Promise<SchemaLabelMap>;
}
```

### IMapFieldsStrategy
Locates fields within schemas and returns their paths.

```typescript
interface IMapFieldsStrategy {
    execute(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[]
    ): Promise<FieldMap>;
}
```

## Implementations

### Map Schemas

- **GeoJsonMapSchemasService** (Current Implementation)
  - GeoJSON-based schema analysis
  - Maps schemas based on geographic/location data
  - Returns schemas in GeoJSON format structure

### Map Fields

- **RuleMapFieldsService** (Default)
  - Keyword and fuzzy matching
  - Builds searchable property index
  - Handles nested properties

- **AIMapFieldsService**
  - LLM-based semantic matching
  - Placeholder for future integration
  - Falls back to rule-based

## Integration

The pipeline is integrated into the **PolicyDecodeProcessor**:

```
Extract schemas from ZIP
        ↓
Import to policy_schema table
        ↓
Execute MappingPipeline
        ├─→ Map schemas
        └─→ Map fields
        ↓
Store results in business_view.businessData
```

## Type Definitions

```typescript
// Map of schema names to their IDs
type SchemaLabelMap = {
    [schemaName: string]: string;
};

// Map of field names to their locations
type FieldMap = {
    [fieldName: string]: {
        schemaId: string;
        path: string;
    };
};

// Field descriptor for mapping
interface FieldDescriptor {
    fieldName: string;
    description: string;
    keywords?: string[];
}

// Schema information
interface SchemaInfo {
    id: string;
    name?: string;
    description?: string;
    document?: Record<string, unknown>;
    rawSchema: Record<string, unknown>;
}
```

## Configuration

### Environment Variables

```bash
# Schema mapping strategy
MAP_SCHEMAS_METHOD=RULE|AI    (default: RULE)

# Field mapping strategy
MAP_FIELDS_METHOD=RULE|AI|ML  (default: RULE)
```

### Runtime Override

```typescript
configService.set('MAP_SCHEMAS_METHOD', 'AI');
configService.set('MAP_FIELDS_METHOD', 'RULE');
```

## Examples

### Basic Mapping
```typescript
const schemas: SchemaInfo[] = [...];
const fields: FieldDescriptor[] = [...];

const { schemaMap, fieldMap } = await pipeline.executePipeline(
    schemas,
    fields,
);
```

### Individual Steps
```typescript
// Just map schemas
const schemaMap = await pipeline.mapSchemas(schemas);

// Just map fields
const fieldMap = await pipeline.mapFields(schemaMap, schemas, fields);
```

### Strategy Switching
```typescript
// Use different strategies
process.env.MAP_SCHEMAS_METHOD = 'AI';
process.env.MAP_FIELDS_METHOD = 'RULE';

// Pipeline automatically uses configured strategies
const result = await pipeline.executePipeline(schemas, fields);
```

## Extending the Pipeline

### Add a New Strategy

1. **Create implementation**
   ```typescript
   // mapping/strategies/map-schemas/custom-map-schemas.service.ts
   @Injectable()
   export class CustomMapSchemasService implements IMapSchemasStrategy {
       async execute(schemas: SchemaInfo[]): Promise<SchemaLabelMap> {
           // Your logic
       }
   }
   ```

2. **Register in provider**
   ```typescript
   // mapping/providers/map-schemas.provider.ts
   switch (method.toUpperCase()) {
       case 'CUSTOM':
           return new CustomMapSchemasService();
       // ... other cases
   }
   ```

3. **Set environment variable**
   ```bash
   MAP_SCHEMAS_METHOD=CUSTOM
   ```

### Common Patterns

**Fallback Strategy**
```typescript
try {
    return await this.primaryMethod();
} catch {
    return await this.fallbackStrategy.execute();
}
```

**Hybrid Strategy**
```typescript
const result1 = await this.strategy1.execute();
const result2 = await this.strategy2.execute();
return { ...result1, ...result2 };  // Merge results
```

**Caching**
```typescript
const key = this.generateKey(input);
if (this.cache.has(key)) return this.cache.get(key);
const result = await this.compute(input);
this.cache.set(key, result);
return result;
```

## Best Practices

✅ **DO:**
- Implement strategies as lean services
- Use logging at DEBUG/WARN/ERROR levels
- Return partial results when possible
- Keep strategies stateless
- Honor the interface contract
- Use environment variables for strategy selection

❌ **DON'T:**
- Hardcode strategy names in code
- Share state between strategy calls
- Ignore the interface contract
- Modify MappingPipelineService for new logic
- Tightly couple strategies to external services
- Forget to register new strategies

## Troubleshooting

**Mappings not generated?**
- Check environment variables
- Verify schemas imported successfully
- Review logs for errors
- Ensure `policy_schema` table populated

**Incorrect field mappings?**
- Add more keywords to FieldDescriptor
- Check schema structure
- Test with RULE method first
- Adjust fuzzy matching logic

**Performance issues?**
- Profile with large schema sets
- Consider caching indices
- Use RULE method for speed-critical paths
- Batch process when possible

## Next Steps

1. **Read** [ARCHITECTURE.md](./ARCHITECTURE.md) for complete design
2. **Reference** [QUICK_START.md](./QUICK_START.md) for examples
3. **View** [DIAGRAMS.md](./DIAGRAMS.md) for visual understanding
4. **Extend** by adding your own strategy implementations
5. **Configure** via environment variables as needed

## Support

For detailed information:
- Architecture decisions → [ARCHITECTURE.md](./ARCHITECTURE.md)
- Implementation examples → [QUICK_START.md](./QUICK_START.md)
- Visual explanation → [DIAGRAMS.md](./DIAGRAMS.md)

For issues or questions, consult the troubleshooting section in ARCHITECTURE.md.
