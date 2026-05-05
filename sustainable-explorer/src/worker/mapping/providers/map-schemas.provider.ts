import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';
import {
    MAP_SCHEMAS_STRATEGY_TOKEN,
    MapSchemasMethodType,
    DEFAULT_MAP_SCHEMAS_METHOD,
} from '../tokens/mapping.tokens';
import { IMapSchemasStrategy } from '../interfaces/strategies.interface';
import { GeoJsonMapSchemasService } from '../strategies/map-schemas/geo-json-map-schemas.service';

/**
 * Factory provider for Map Schemas strategy
 *
 * Dynamically selects the strategy implementation based on the
 * MAP_SCHEMAS_METHOD environment variable.
 *
 * Environment variable:
 * - MAP_SCHEMAS_METHOD: 'GEOJSON' (default: 'GEOJSON')
 */
export const mapSchemasStrategyProvider: Provider<IMapSchemasStrategy> = {
    provide: MAP_SCHEMAS_STRATEGY_TOKEN,
    useFactory: (configService: ConfigService): IMapSchemasStrategy => {
        const method = configService.get<string>(
            'MAP_SCHEMAS_METHOD',
            DEFAULT_MAP_SCHEMAS_METHOD,
        );

        switch (method.toUpperCase()) {
            case MapSchemasMethodType.GEOJSON:
            default:
                return new GeoJsonMapSchemasService();
        }
    },
    inject: [ConfigService],
};
