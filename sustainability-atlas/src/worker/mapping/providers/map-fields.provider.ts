import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';
import {
    MAP_FIELDS_STRATEGY_TOKEN,
    MapFieldsMethodType,
    DEFAULT_MAP_FIELDS_METHOD,
} from '../tokens/mapping.tokens';
import { IMapFieldsStrategy } from '../interfaces/strategies.interface';
import { HeuristicFieldMapperService } from '../strategies/map-fields/heuristic-field-mapper.service';
import { LlmFieldMapperService } from '../strategies/map-fields/llm-field-mapper.service';
import { CrossSchemaFuzzyMapperService } from '../strategies/map-fields/cross-schema-fuzzy-mapper.service';

/**
 * Factory provider for Map Fields strategy
 *
 * Dynamically selects the strategy implementation based on the
 * MAP_FIELDS_METHOD environment variable.
 *
 * Environment variable:
 * - MAP_FIELDS_METHOD: 'CROSS-SCHEMA-FUZZY' | 'HEURISTIC-FIELD-MAPPER' | 'LLM-FIELD-MAPPER'
 *   (default: 'CROSS-SCHEMA-FUZZY')
 */
export const mapFieldsStrategyProvider: Provider<IMapFieldsStrategy> = {
    provide: MAP_FIELDS_STRATEGY_TOKEN,
    useFactory: (configService: ConfigService): IMapFieldsStrategy => {
        const method = configService.get<string>(
            'MAP_FIELDS_METHOD',
            DEFAULT_MAP_FIELDS_METHOD,
        );

        switch (method.toUpperCase()) {
            case MapFieldsMethodType.LLM_FIELD_MAPPER:
                return new LlmFieldMapperService();
            case MapFieldsMethodType.HEURISTIC_FIELD_MAPPER:
                return new HeuristicFieldMapperService();
            case MapFieldsMethodType.CROSS_SCHEMA_FUZZY:
            default:
                return new CrossSchemaFuzzyMapperService();
        }
    },
    inject: [ConfigService],
};
