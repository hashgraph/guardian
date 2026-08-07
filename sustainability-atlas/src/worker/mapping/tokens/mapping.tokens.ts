/**
 * Injection token for field-mapping strategy resolution.
 */
export const MAP_FIELDS_STRATEGY_TOKEN = 'MAP_FIELDS_STRATEGY';

export enum MapFieldsMethodType {
    LLM_FIELD_MAPPER = 'LLM-FIELD-MAPPER',
    HEURISTIC_FIELD_MAPPER = 'HEURISTIC-FIELD-MAPPER',
    CROSS_SCHEMA_FUZZY = 'CROSS-SCHEMA-FUZZY',
}

export const DEFAULT_MAP_FIELDS_METHOD = MapFieldsMethodType.CROSS_SCHEMA_FUZZY;
