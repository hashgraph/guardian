import { Injectable, Logger, Inject } from '@nestjs/common';
import { MAP_FIELDS_STRATEGY_TOKEN } from './tokens/mapping.tokens';
import { IMapFieldsStrategy } from './interfaces/strategies.interface';
import { FieldMap, FieldDescriptor, SchemaInfo } from './types';

/**
 * Orchestrates the field-mapping step. The schema-labelling pass was removed
 * (its output was unused downstream); strategy selection is now a single
 * IMapFieldsStrategy injection.
 */
@Injectable()
export class MappingPipelineService {
    private readonly logger = new Logger(MappingPipelineService.name);

    constructor(
        @Inject(MAP_FIELDS_STRATEGY_TOKEN)
        private readonly mapFieldsStrategy: IMapFieldsStrategy,
    ) {}

    async mapFields(
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        try {
            this.logger.log(`Starting field mapping with ${fields.length} field(s)`);
            const result = await this.mapFieldsStrategy.execute(schemas, fields);
            this.logger.log(
                `Field mapping completed. Mapped ${Object.keys(result).length} field(s)`,
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

    async executePipeline(
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<{ fieldMap: FieldMap }> {
        const fieldMap = await this.mapFields(schemas, fields);
        return { fieldMap };
    }
}
