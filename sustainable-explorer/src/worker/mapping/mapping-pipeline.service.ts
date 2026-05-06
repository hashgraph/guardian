import { Injectable, Logger, Inject } from '@nestjs/common';
import {
    MAP_SCHEMAS_STRATEGY_TOKEN,
    MAP_FIELDS_STRATEGY_TOKEN,
} from './tokens/mapping.tokens';
import { IMapSchemasStrategy, IMapFieldsStrategy } from './interfaces/strategies.interface';
import {
    SchemaLabelMap,
    FieldMap,
    FieldDescriptor,
    SchemaInfo,
} from './types';

/**
 * Mapping Pipeline Service
 *
 * Orchestrates the schema and field mapping steps in sequence.
 * Uses dependency injection to obtain the configured strategy implementations.
 * The pipeline is agnostic to the specific strategy implementations used.
 *
 * ## Pipeline Flow:
 * 1. **Map Schemas**: Convert raw schema documents into a labeled map (SchemaLabelMap)
 * 2. **Map Fields**: Use the schema map to locate and map individual fields (FieldMap)
 *
 * ## Usage:
 * ```typescript
 * const schemas: SchemaInfo[] = [...];
 * const fields: FieldDescriptor[] = [...];
 *
 * const schemaMap = await pipeline.mapSchemas(schemas);
 * const fieldMap = await pipeline.mapFields(schemaMap, schemas, fields);
 * ```
 *
 * ## Extensibility:
 * - Add a new mapping strategy by implementing `IMapSchemasStrategy` or `IMapFieldsStrategy`
 * - Register the strategy in the factory provider
 * - Update the environment variable to select the strategy at runtime
 * - No changes needed to the pipeline orchestration logic
 */
@Injectable()
export class MappingPipelineService {
    private readonly logger = new Logger(MappingPipelineService.name);

    constructor(
        @Inject(MAP_SCHEMAS_STRATEGY_TOKEN)
        private readonly mapSchemasStrategy: IMapSchemasStrategy,
        @Inject(MAP_FIELDS_STRATEGY_TOKEN)
        private readonly mapFieldsStrategy: IMapFieldsStrategy,
    ) {}

    /**
     * Step 1: Map Schemas
     *
     * Converts a list of raw schema documents into a label map that identifies each schema.
     * This output becomes the input for Step 2.
     *
     * @param schemas - Array of schema information objects
     * @returns Promise resolving to a SchemaLabelMap
     *
     * @example
     * ```typescript
     * const schemas = [
     *   { id: 'uuid-1', name: 'ProjectSchema', document: {...} },
     *   { id: 'uuid-2', name: 'PDD', document: {...} },
     * ];
     *
     * const schemaMap = await pipeline.mapSchemas(schemas);
     * // Result: { 'ProjectSchema': 'uuid-1', 'PDD': 'uuid-2' }
     * ```
     */
    async mapSchemas(schemas: SchemaInfo[]): Promise<SchemaLabelMap> {
        try {
            this.logger.log(`Starting schema mapping with ${schemas.length} schema(s)`);
            const result = await this.mapSchemasStrategy.execute(schemas);
            this.logger.log(
                `Schema mapping completed successfully. Mapped ${Object.keys(result).length} schema(s)`,
            );
            return result;
        } catch (error) {
            this.logger.error(
                `Schema mapping failed: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    /**
     * Step 2: Map Fields
     *
     * Locates individual fields within the schema documents and maps them to their paths.
     * Uses the schema map from Step 1 to identify which schema contains each field.
     *
     * @param schemaMap - Pre-computed schema label map (output from mapSchemas)
     * @param schemas - Array of schema information objects
     * @param fields - Array of field descriptors to map
     * @returns Promise resolving to a FieldMap
     *
     * @example
     * ```typescript
     * const fields = [
     *   { fieldName: 'Project Title', description: 'Name of the project', keywords: ['title', 'name'] },
     *   { fieldName: 'Emissions', description: 'Total emissions', keywords: ['emissions', 'co2'] },
     * ];
     *
     * const fieldMap = await pipeline.mapFields(schemaMap, schemas, fields);
     * // Result: {
     * //   'Project Title': { schemaId: 'uuid-1', path: 'projectDescription.name' },
     * //   'Emissions': { schemaId: 'uuid-1', path: 'projectDescription.emissions' },
     * // }
     * ```
     */
    async mapFields(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        try {
            this.logger.log(`Starting field mapping with ${fields.length} field(s)`);
            const result = await this.mapFieldsStrategy.execute(schemaMap, schemas, fields);
            this.logger.log(
                `Field mapping completed successfully. Mapped ${Object.keys(result).length} field(s)`,
            );
            return result;
        } catch (error) {
            this.logger.error(
                `Field mapping failed: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw error;
        }
    }

    /**
     * Execute the complete mapping pipeline (both steps in sequence)
     *
     * Convenience method that executes both steps and returns both results.
     *
     * @param schemas - Array of schema information objects
     * @param fields - Array of field descriptors to map
     * @returns Promise resolving to both SchemaLabelMap and FieldMap
     *
     * @example
     * ```typescript
     * const { schemaMap, fieldMap } = await pipeline.executePipeline(schemas, fields);
     * ```
     */
    async executePipeline(
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<{ schemaMap: SchemaLabelMap; fieldMap: FieldMap }> {
        this.logger.log('Executing complete mapping pipeline');

        const schemaMap = await this.mapSchemas(schemas);
        const fieldMap = await this.mapFields(schemaMap, schemas, fields);

        this.logger.log('Pipeline execution completed successfully');

        return { schemaMap, fieldMap };
    }
}
