import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Strategies
import { GeoJsonMapSchemasService } from './strategies/map-schemas/geo-json-map-schemas.service';
import { HeuristicFieldMapperService } from './strategies/map-fields/heuristic-field-mapper.service';
import { LlmFieldMapperService } from './strategies/map-fields/llm-field-mapper.service';

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
 * - Strategy implementations (GeoJSON for schema mapping, heuristic and LLM dummies for field mapping)
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
        GeoJsonMapSchemasService,
        HeuristicFieldMapperService,
        LlmFieldMapperService,

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
