/**
 * External integration service type
 */
export enum IntegrationType {
    GLOBAL_FOREST_WATCH = 'GLOBAL_FOREST_WATCH',
    KANOP_IO = 'KANOP_IO',
    WORLD_BANK = 'WORLD_BANK',
    FIRM = 'FIRM',
}

/**
 * Integration types that require user-managed credentials.
 * WORLD_BANK is a public API and does not need credentials.
 */
export const CREDENTIAL_SERVICE_TYPES: IntegrationType[] = [
    IntegrationType.GLOBAL_FOREST_WATCH,
    IntegrationType.KANOP_IO,
    IntegrationType.FIRM,
];
