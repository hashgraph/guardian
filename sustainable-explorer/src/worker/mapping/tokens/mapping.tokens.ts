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
    RULE = 'RULE',
    AI = 'AI',
}

export enum MapFieldsMethodType {
    RULE = 'RULE',
    AI = 'AI',
}

/**
 * Default strategy implementations
 */
export const DEFAULT_MAP_SCHEMAS_METHOD = MapSchemasMethodType.RULE;
export const DEFAULT_MAP_FIELDS_METHOD = MapFieldsMethodType.RULE;
