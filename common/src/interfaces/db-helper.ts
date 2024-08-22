import { MongoDriver } from '@mikro-orm/mongodb';
import { DataBaseNamingStrategy } from '../helpers/index.js';

export interface ICommonConnectionConfig {
    driver: typeof MongoDriver;
    namingStrategy: typeof DataBaseNamingStrategy;
    dbName: string;
    clientUrl: string;
    entities: string[];
}
export interface IGetAggregationFilters {
    aggregation: unknown[],
    aggregateMethod: string,
    nameFilter: string,
}

export interface IGetDocumentAggregationFilters extends IGetAggregationFilters {
    timelineLabelPath?: string,
    timelineDescriptionPath?: string,
    dryRun?: string,
    sortObject?: Record<string, unknown>,
    itemsPerPage?: number,
    page?: number,
    policyId?: string,
}