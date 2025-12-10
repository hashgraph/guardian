import { MongoDriver } from '@mikro-orm/mongodb';

//helpers
import { DataBaseNamingStrategy } from '../helpers/index.js';

//entities
import { BaseEntity } from '../models/index.js';

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
    savepointIds?: string[]
}

export interface IOrmConnection {
    connect(): void;
}

export const STATUS_IMPLEMENTATION = {
    METHOD_IS_NOT_IMPLEMENTED: 'Method not implemented.'
}

/**
 * Abstract Database helper
 */
export abstract class AbstractDataBaseHelper<T extends BaseEntity> {
    /**
     * Set ORM
     */
    public static set orm(orm: IOrmConnection) {
        throw new Error(`${AbstractDataBaseHelper.name}.set orm: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get ORM
     */
    public static get orm(): IOrmConnection | undefined {
        throw new Error(`${AbstractDataBaseHelper.name}.get orm: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Set MongoDriver
     * @param db
     */
    public static connectBD(db: IOrmConnection): void {
        throw new Error(`${AbstractDataBaseHelper.name}.${AbstractDataBaseHelper.connectBD.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save file
     * @param uuid
     * @param buffer
     * @returns file ID
     */
    public static async saveFile(uuid: string, buffer: Buffer): Promise<unknown> {
        throw new Error(`${AbstractDataBaseHelper.name}.${AbstractDataBaseHelper.saveFile.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Load file
     * @param id
     * @returns file ID
     */
    public static async loadFile(id: unknown): Promise<Buffer> {
        throw new Error(`${AbstractDataBaseHelper.name}.${AbstractDataBaseHelper.loadFile.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Delete entities by filters
     * @param filters Filters
     * @returns Count
     */
    public abstract delete(filters: Partial<T> | string): Promise<number>;

    /**
     * Remove entities or entity
     * @param entity Entities or entity
     */
    public abstract remove(entity: T | T[]): Promise<void>;

    /**
     * Create entity
     * @param entity Entity
     */
    public abstract create(entity: Partial<T>): T;

    /**
     * Create entities
     * @param entities Entities
     */
    public abstract create(entities: (Partial<T>)[]): T[];

    /**
     * Aggregate
     * @param pipeline Pipeline
     * @returns Result
     */
    public abstract aggregate(pipeline: Partial<T>[]): Promise<T[]>;

    /**
     * AggregateDryRun
     * @param pipeline Pipeline
     * @param dryRunId
     * @param dryRunClass
     * @returns Result
     */
    public abstract aggregateDryRan(pipeline: Partial<T>[], dryRunId: string, dryRunClass: string): Promise<T[]>;

    /**
     * get document aggregation filters
     * @param props
     * @returns Result
     */
    public static getDocumentAggregationFilters(props: IGetDocumentAggregationFilters): void {
        throw new Error(`${AbstractDataBaseHelper.name}.${AbstractDataBaseHelper.getDocumentAggregationFilters.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * get document aggregation filters for analytics
     * @param nameFilter
     * @param uuid
     * @returns Result
     */
    public static getAnalyticsDocAggregationFilters(nameFilter: string, uuid: string): unknown[] {
        throw new Error(`${AbstractDataBaseHelper.name}.${AbstractDataBaseHelper.getAnalyticsDocAggregationFilters.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * get attributes aggregation filters
     * @param nameFilterMap
     * @param nameFilterAttributes
     * @param existingAttributes
     * @returns Result
     */
    public static getAttributesAggregationFilters(nameFilterMap: string, nameFilterAttributes: string, existingAttributes: string[] | []): unknown[] {
        throw new Error(`${AbstractDataBaseHelper.name}.${AbstractDataBaseHelper.getAttributesAggregationFilters.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * get tasks aggregation filters
     * @param nameFilter
     * @param processTimeout
     * @returns Result
     */
    public static getTasksAggregationFilters(nameFilter: string, processTimeout: number): unknown[] {
        throw new Error(`${AbstractDataBaseHelper.name}.${AbstractDataBaseHelper.getTasksAggregationFilters.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * get transactions serials aggregation filters
     * @param props
     * @returns Result
     */
    public static getTransactionsSerialsAggregationFilters(props: IGetAggregationFilters): void {
        throw new Error(`${AbstractDataBaseHelper.name}.${AbstractDataBaseHelper.getTransactionsSerialsAggregationFilters.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get aggregation filter for transactions serials
     * @param mintRequestId Mint request identifier
     * @param transferStatus Transfer status
     * @returns Aggregation filter
     */
    public static _getTransactionsSerialsAggregation(mintRequestId: string, transferStatus?: unknown): unknown[] {
        throw new Error(`${AbstractDataBaseHelper.name}.${AbstractDataBaseHelper._getTransactionsSerialsAggregation.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Find and count
     * @param filters Filters
     * @param options Options
     * @returns Entities and count
     */
    public abstract findAndCount(filters: Partial<T> | string, options?: unknown): Promise<[T[], number]>;

    /**
     * Count entities
     * @param filters Filters
     * @param options Options
     * @returns Count
     */
    public abstract count(filters?: Partial<T> | string, options?: unknown): Promise<number>;

    /**
     * Find entities
     * @param filters Filters
     * @param options Options
     * @returns Entities
     */
    public abstract find(filters?: Partial<T> | string, options?: unknown): Promise<T[]>;

    /**
     * Find all entities
     * @param options Options
     * @returns Entities
     */
    public abstract findAll(options?: unknown): Promise<T[]>;

    /**
     * Find entity
     * @param filters Filters
     * @param options Options
     * @returns Entity
     */
    public abstract findOne(filters: Partial<T> | string, options: Partial<object>): Promise<T | null>;

    /**
     * Save entity by id field or filters.
     * @param entity Entity
     * @param filter Filter
     * @returns Entity
     */
    public abstract save(entity: Partial<T>, filter?: Partial<T>): Promise<T>;

    /**
     * Save entities by ids
     * @param entities Entities
     * @returns Entities
     */
    public abstract save(entities: Partial<T>[]): Promise<T[]>;

    /**
     * Save many entities by ids
     * @param entities Entities
     * @returns Entities
     */
    public abstract saveMany(entities: Partial<T>[]): Promise<T[]>;

    /**
     * Update entity by id field or filters
     * @param entity Entity
     * @param filter Filter
     * @returns Entity
     */
    public abstract update(entity: T, filter?: Partial<T>): Promise<T>;

    /**
     * Update entities by ids
     * @param entities Entities
     */
    public abstract update(entities: T[]): Promise<T[]>;

    /**
     * Update many entities by ids
     * @param entities Entities
     * @param filter Filter
     * @returns Entity
     */
    public abstract updateMany(entities: T[], filter?: Partial<T>): Promise<T[]>;

    /**
     * Create a lot of data
     * @param data Data
     * @param amount Amount
     */
    public abstract createMuchData(data: Partial<T> & { id: string, _id: string }, amount: number): Promise<void>;
}
