import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Strategies
import { RuleMapSchemasService } from './strategies/map-schemas/rule-map-schemas.service';
import { AIMapSchemasService } from './strategies/map-schemas/ai-map-schemas.service';
import { RuleMapFieldsService } from './strategies/map-fields/rule-map-fields.service';
import { AIMapFieldsService } from './strategies/map-fields/ai-map-fields.service';

// Pipeline Service
import { MappingPipelineService } from './mapping-pipeline.service';

// Providers
import { mapSchemasStrategyProvider } from './providers/map-schemas.provider';
import { mapFieldsStrategyProvider } from './providers/map-fields.provider';

/**
 * Mapping Pipeline Module
 *
 * Encapsulates all schema and field mapping functionality.
 * Provides:
 * - Strategy implementations (Rule-based and AI-based for both steps)
 * - Factory providers for runtime strategy selection
 * - MappingPipelineService for orchestration
 *
 * Usage in other modules:
 * ```typescript
 * @Module({
 *   imports: [MappingModule],
 * })
 * export class YourModule {}
 * ```
 *
 * Then inject MappingPipelineService:
 * ```typescript
 * constructor(private pipeline: MappingPipelineService) {}
 * ```
 */
@Module({
    providers: [
        // Strategy implementations
        RuleMapSchemasService,
        AIMapSchemasService,
        RuleMapFieldsService,
        AIMapFieldsService,

        // Factory providers
        mapSchemasStrategyProvider,
        mapFieldsStrategyProvider,

        // Orchestration service
        MappingPipelineService,
    ],
    exports: [
        // Export the pipeline service for use in other modules
        MappingPipelineService,

        // Also export strategy tokens for advanced use cases
        // (typically not needed, but available if custom logic is required)
        mapSchemasStrategyProvider,
        mapFieldsStrategyProvider,
    ],
})
export class MappingModule {}
