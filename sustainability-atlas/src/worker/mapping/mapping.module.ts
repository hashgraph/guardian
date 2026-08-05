import { Module } from '@nestjs/common';

// Strategies
import { HeuristicFieldMapperService } from './strategies/map-fields/heuristic-field-mapper.service';
import { LlmFieldMapperService } from './strategies/map-fields/llm-field-mapper.service';
import { CrossSchemaFuzzyMapperService } from './strategies/map-fields/cross-schema-fuzzy-mapper.service';

// Pipeline Service
import { MappingPipelineService } from './mapping-pipeline.service';
import { PolicyMappingPipelineService } from './policy-pipeline.service';

// Providers
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
        HeuristicFieldMapperService,
        LlmFieldMapperService,
        CrossSchemaFuzzyMapperService,
        mapFieldsStrategyProvider,
        MappingPipelineService,
        PolicyMappingPipelineService,
    ],
    exports: [
        MappingPipelineService,
        PolicyMappingPipelineService,
        mapFieldsStrategyProvider,
    ],
})
export class MappingModule {}
