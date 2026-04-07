import {
    MV_REGISTRY_STATS_NAME,
    MV_REGISTRY_STATS_CREATE_SQL,
    MV_REGISTRY_STATS_INDEX_SQL,
} from './registry-stats.mv';
import {
    MV_METHODOLOGY_STATS_NAME,
    MV_METHODOLOGY_STATS_CREATE_SQL,
    MV_METHODOLOGY_STATS_INDEX_SQL,
} from './methodology-stats.mv';

export interface MaterializedViewDefinition {
    name: string;
    createSql: string;
    indexSql?: string;
}

/**
 * Registry of all materialized views.
 * New views should be added here; they will be created on worker startup
 * and refreshed periodically by MvRefreshProcessor.
 */
export const MATERIALIZED_VIEWS: MaterializedViewDefinition[] = [
    {
        name: MV_REGISTRY_STATS_NAME,
        createSql: MV_REGISTRY_STATS_CREATE_SQL,
        indexSql: MV_REGISTRY_STATS_INDEX_SQL,
    },
    {
        name: MV_METHODOLOGY_STATS_NAME,
        createSql: MV_METHODOLOGY_STATS_CREATE_SQL,
        indexSql: MV_METHODOLOGY_STATS_INDEX_SQL,
    },
];

export { MV_REGISTRY_STATS_NAME, MV_METHODOLOGY_STATS_NAME };
