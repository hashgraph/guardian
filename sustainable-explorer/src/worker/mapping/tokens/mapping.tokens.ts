import { IMapSchemasStrategy, IMapFieldsStrategy } from '../interfaces/strategies.interface';

/**
 * Injection tokens for strategy resolution
 * These tokens are used with NestJS DI to inject the correct implementations
 */

export const MAP_SCHEMAS_STRATEGY_TOKEN = 'MAP_SCHEMAS_STRATEGY';
export const MAP_FIELDS_STRATEGY_TOKEN = 'MAP_FIELDS_STRATEGY';

/**
 * Known strategy implementation names
 */
export enum MapSchemasMethodType {
    GEOJSON = 'GEOJSON',
}

export enum MapFieldsMethodType {
    LLM_FIELD_MAPPER = 'LLM-FIELD-MAPPER',
    HEURISTIC_FIELD_MAPPER = 'HEURISTIC-FIELD-MAPPER',
    CROSS_SCHEMA_FUZZY = 'CROSS-SCHEMA-FUZZY',
}

/**
 * Default strategy implementations
 */
export const DEFAULT_MAP_SCHEMAS_METHOD = MapSchemasMethodType.GEOJSON;
export const DEFAULT_MAP_FIELDS_METHOD = MapFieldsMethodType.CROSS_SCHEMA_FUZZY;
