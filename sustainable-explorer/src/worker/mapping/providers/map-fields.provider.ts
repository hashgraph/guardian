import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';
import {
    MAP_FIELDS_STRATEGY_TOKEN,
    MapFieldsMethodType,
    DEFAULT_MAP_FIELDS_METHOD,
} from '../tokens/mapping.tokens';
import { IMapFieldsStrategy } from '../interfaces/strategies.interface';
import { RuleMapFieldsService } from '../strategies/map-fields/rule-map-fields.service';
import { AIMapFieldsService } from '../strategies/map-fields/ai-map-fields.service';

/**
 * Factory provider for Map Fields strategy
 *
 * Dynamically selects the strategy implementation based on the
 * MAP_FIELDS_METHOD environment variable.
 *
 * Environment variable:
 * - MAP_FIELDS_METHOD: 'RULE' | 'AI' (default: 'RULE')
 */
export const mapFieldsStrategyProvider: Provider<IMapFieldsStrategy> = {
    provide: MAP_FIELDS_STRATEGY_TOKEN,
    useFactory: (configService: ConfigService): IMapFieldsStrategy => {
        const method = configService.get<string>(
            'MAP_FIELDS_METHOD',
            DEFAULT_MAP_FIELDS_METHOD,
        );

        switch (method.toUpperCase()) {
            case MapFieldsMethodType.AI:
                return new AIMapFieldsService();
            case MapFieldsMethodType.RULE:
            default:
                return new RuleMapFieldsService();
        }
    },
    inject: [ConfigService],
};
