#!/usr/bin/env node
/**
 * Quick Start Guide for the Mapping Pipeline
 *
 * This file serves as a reference for using and extending the mapping pipeline.
 */

// ============================================================================
// SECTION 1: Basic Usage
// ============================================================================

/**
 * Use the mapping pipeline in your service or processor
 */

// In your service/processor
import { MappingPipelineService } from './mapping-pipeline.service';
import { SchemaInfo, FieldDescriptor } from './types';

class YourService {
    constructor(private pipeline: MappingPipelineService) {}

    async processSchemas() {
        // Step 1: Prepare schemas (from database or API)
        const schemas: SchemaInfo[] = [
            {
                id: 'uuid-1',
                name: 'ProjectSchema',
                document: { /* schema doc */ },
                rawSchema: { /* raw schema */ },
            },
        ];

        // Step 2: Define fields to map
        const fields: FieldDescriptor[] = [
            {
                fieldName: 'Project Title',
                description: 'Name of the project',
                keywords: ['title', 'name'],
            },
        ];

        // Step 3: Execute pipeline
        const { schemaMap, fieldMap } = await this.pipeline.executePipeline(
            schemas,
            fields,
        );

        console.log('Schema Map:', schemaMap);
        console.log('Field Map:', fieldMap);
    }
}

// ============================================================================
// SECTION 2: Switching Implementations
// ============================================================================

/**
 * Control which implementation runs via environment variables
 */

process.env.MAP_SCHEMAS_METHOD = 'RULE'; // or 'AI'
process.env.MAP_FIELDS_METHOD = 'RULE';  // or 'AI'

// The correct implementations are automatically injected!
// No code changes needed.

// ============================================================================
// SECTION 3: Creating a New Strategy
// ============================================================================

/**
 * Example: Add a "ML-Based" field mapping strategy
 */

// Step 1: Create implementation
// File: mapping/strategies/map-fields/ml-map-fields.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { IMapFieldsStrategy } from '../../interfaces/strategies.interface';
import {
    SchemaLabelMap,
    FieldMap,
    FieldDescriptor,
    SchemaInfo,
} from '../../types';

@Injectable()
export class MLMapFieldsService implements IMapFieldsStrategy {
    private readonly logger = new Logger(MLMapFieldsService.name);

    async execute(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        this.logger.log(`ML-based field mapping for ${fields.length} fields`);

        // Your ML logic here
        const result: FieldMap = {};

        for (const field of fields) {
            // Example: Use your ML model to find the field
            const mapping = await this.mlModel.findField(field, schemas);
            if (mapping) {
                result[field.fieldName] = mapping;
            }
        }

        return result;
    }
}

// Step 2: Update factory provider
// File: mapping/providers/map-fields.provider.ts
// Add this case to the switch statement:

/*
switch (method.toUpperCase()) {
    case 'ML':
        return new MLMapFieldsService();
    case 'AI':
        return new AIMapFieldsService();
    default:
        return new RuleMapFieldsService();
}
*/

// Step 3: Set environment variable
// .env file or deployment config:
// MAP_FIELDS_METHOD=ML

// Step 4: That's it! No other changes needed.

// ============================================================================
// SECTION 4: Testing
// ============================================================================

/**
 * Testing the pipeline with different strategies
 */

import { ConfigService } from '@nestjs/config';

async function testPipeline() {
    const configService = new ConfigService();

    // Test with Rule-based mapping
    configService.set('MAP_SCHEMAS_METHOD', 'RULE');
    configService.set('MAP_FIELDS_METHOD', 'RULE');

    const { schemaMap: schemaMapRule, fieldMap: fieldMapRule } =
        await pipeline.executePipeline(schemas, fields);

    // Test with AI mapping
    configService.set('MAP_SCHEMAS_METHOD', 'AI');
    configService.set('MAP_FIELDS_METHOD', 'AI');

    const { schemaMap: schemaMapAI, fieldMap: fieldMapAI } =
        await pipeline.executePipeline(schemas, fields);

    // Compare results
    console.log('Rule-based results:', fieldMapRule);
    console.log('AI-based results:', fieldMapAI);
}

// ============================================================================
// SECTION 5: Common Patterns
// ============================================================================

/**
 * Pattern 1: Fallback to Rule-based
 * When your custom strategy fails, fall back to rule-based
 */

@Injectable()
export class FallbackMapFieldsService implements IMapFieldsStrategy {
    constructor(private ruleStrategy: RuleMapFieldsService) {}

    async execute(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        try {
            // Try primary method
            return await this.primaryMethod(schemaMap, schemas, fields);
        } catch (error) {
            this.logger.warn('Primary method failed, falling back to rule-based');
            return this.ruleStrategy.execute(schemaMap, schemas, fields);
        }
    }

    private async primaryMethod(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        // Your logic here
        return {};
    }
}

/**
 * Pattern 2: Hybrid Strategy
 * Combine multiple strategies for better results
 */

@Injectable()
export class HybridMapFieldsService implements IMapFieldsStrategy {
    constructor(
        private ruleStrategy: RuleMapFieldsService,
        private aiStrategy: AIMapFieldsService,
    ) {}

    async execute(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        // Get results from both strategies
        const ruleResults = await this.ruleStrategy.execute(
            schemaMap,
            schemas,
            fields,
        );
        const aiResults = await this.aiStrategy.execute(schemaMap, schemas, fields);

        // Merge results: AI first, fall back to rule-based
        const combined: FieldMap = { ...ruleResults, ...aiResults };

        return combined;
    }
}

/**
 * Pattern 3: Caching Results
 * Cache expensive computations
 */

@Injectable()
export class CachingMapFieldsService implements IMapFieldsStrategy {
    private cache = new Map<string, FieldMap>();

    async execute(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        const cacheKey = this.generateKey(schemaMap, fields);

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const result = await this.computeMapping(schemaMap, schemas, fields);
        this.cache.set(cacheKey, result);

        return result;
    }

    private generateKey(schemaMap: SchemaLabelMap, fields: FieldDescriptor[]): string {
        return JSON.stringify({ schemaMap, fields });
    }

    private async computeMapping(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        // Your expensive computation here
        return {};
    }
}

// ============================================================================
// SECTION 6: Debugging
// ============================================================================

/**
 * Enable detailed logging for debugging
 */

// Set log level
process.env.LOG_LEVEL = 'debug';

// Watch logs from the pipeline:
// [MappingPipelineService] Starting schema mapping with 5 schema(s)
// [RuleMapSchemasService] Rule-based schema mapping for 5 schema(s)
// [RuleMapFieldsService] Rule-based field mapping for 10 field(s)
// [MappingPipelineService] Field mapping completed successfully. Mapped 8 field(s)

// ============================================================================
// SECTION 7: File Structure Reminder
// ============================================================================

/*
src/worker/mapping/
├── interfaces/
│   └── strategies.interface.ts          # Implement these interfaces
│
├── strategies/
│   ├── map-schemas/                     # Schema mappers
│   │   ├── rule-map-schemas.service.ts
│   │   └── ai-map-schemas.service.ts
│   │
│   └── map-fields/                      # Field mappers
│       ├── rule-map-fields.service.ts
│       └── ai-map-fields.service.ts
│
├── providers/
│   ├── map-schemas.provider.ts          # Register new strategies here
│   └── map-fields.provider.ts           # Register new strategies here
│
├── tokens/
│   └── mapping.tokens.ts                # Add method types here if needed
│
├── types.ts                             # Type definitions
├── mapping-pipeline.service.ts          # Don't modify
├── mapping.module.ts                    # Don't modify
└── ARCHITECTURE.md                      # Full documentation
*/

// ============================================================================
// SECTION 8: Checklist for Adding a New Strategy
// ============================================================================

/*
[ ] Create implementation class in strategies/ folder
[ ] Implement IMapSchemasStrategy or IMapFieldsStrategy interface
[ ] Add method type to mapping.tokens.ts (if new type needed)
[ ] Update factory provider switch statement
[ ] Test with new environment variable
[ ] Update ARCHITECTURE.md with documentation
[ ] Test integration with policy decoder
*/

// ============================================================================
// SECTION 9: Common Mistakes to Avoid
// ============================================================================

/*
❌ DON'T: Hardcode implementations in the pipeline
✅ DO: Use dependency injection with factory providers

❌ DON'T: Return null or undefined for unmapped fields
✅ DO: Log warnings and skip those fields; return partial results

❌ DON'T: Modify MappingPipelineService to add new logic
✅ DO: Create a new strategy implementation

❌ DON'T: Share state between strategy calls
✅ DO: Keep strategies stateless and pure

❌ DON'T: Ignore the interface contract
✅ DO: Implement exactly the interface signature

❌ DON'T: Make strategies tightly coupled to database/API
✅ DO: Accept all dependencies as constructor parameters

❌ DON'T: Forget to update factory provider
✅ DO: Register new strategies before using them
*/

// ============================================================================
// SECTION 10: Integration Examples
// ============================================================================

/**
 * Example 1: Policy Decoder Integration
 * (Already done in policy-decode.processor.ts)
 */

async process(job: Job) {
    // ... schema import ...

    // Execute mapping pipeline
    const { schemaMap, fieldMap } = await this.mappingPipeline.executePipeline(
        schemas,
        fields,
    );

    // Store results
    await this.database.update('business_view', {
        businessData: { schemaMap, fieldMap },
    });
}

/**
 * Example 2: REST API Endpoint
 */

@Post('/map-schemas')
async mapSchemas(@Body() body: { schemas: SchemaInfo[] }) {
    const schemaMap = await this.mappingPipeline.mapSchemas(body.schemas);
    return schemaMap;
}

/**
 * Example 3: Batch Processing
 */

async batchProcess(policies: PolicyInfo[]) {
    for (const policy of policies) {
        const schemas = await this.getSchemas(policy.id);
        const fields = this.getDefaultFields();

        const { schemaMap, fieldMap } = await this.mappingPipeline.executePipeline(
            schemas,
            fields,
        );

        await this.storeResults(policy.id, { schemaMap, fieldMap });
    }
}

export {};
