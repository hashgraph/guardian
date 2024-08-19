import { MikroORM, CreateRequestContext, wrap, FilterObject, FilterQuery, FindAllOptions, EntityData, RequiredEntityData } from '@mikro-orm/core';
import { MongoDriver, MongoEntityManager, MongoEntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { BaseEntity } from '../models/index.js';
import { DataBaseNamingStrategy } from './db-naming-strategy.js';
import { GridFSBucket } from 'mongodb';
import fixConnectionString from './fix-connection-string.js';
import type { FindOptions } from '@mikro-orm/core/drivers/IDatabaseDriver';
import { MintTransactionStatus } from '@guardian/interfaces';

interface ICommonConnectionConfig {
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

export const MAP_DOCUMENT_AGGREGATION_FILTERS = {
    BASE: 'base',
    HISTORY: 'history',
    SORT: 'sort',
    PAGINATION: 'pagination',
    VC_DOCUMENTS: 'vc-documents',
    VP_DOCUMENTS: 'vp-documents',
    APPROVE: 'approve'
}

export const MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS = {
    DOC_BY_POLICY: 'doc_by_policy',
    DOC_BY_INSTANCE: 'doc_by_instance',
    DOCS_GROUPS: 'docs_groups',
    SCHEMA_BY_NAME: 'schema_by_name',
}

export const MAP_ATTRIBUTES_AGGREGATION_FILTERS = {
    RESULT: 'result'
}

export const MAP_TASKS_AGGREGATION_FILTERS = {
    RESULT: 'result'
}

export const MAP_TRANSACTION_SERIALS_AGGREGATION_FILTERS = {
    COUNT: 'count'
}

/**
 * Common connection config
 */
export const COMMON_CONNECTION_CONFIG: ICommonConnectionConfig = {
    driver: MongoDriver,
    namingStrategy: DataBaseNamingStrategy,
    dbName: (process.env.GUARDIAN_ENV || (process.env.HEDERA_NET !== process.env.PREUSED_HEDERA_NET)) ?
        `${process.env.GUARDIAN_ENV}_${process.env.HEDERA_NET}_${process.env.DB_DATABASE}` :
        process.env.DB_DATABASE,
    clientUrl: fixConnectionString(process.env.DB_HOST),
    entities: [
        'dist/entity/*.js'
    ]
};

/**
 * Database helper
 */
export class DataBaseHelper<T extends BaseEntity> {

    /**
     * System fields
     */
    private static readonly _systemFileFields: string[] = [
        'documentFileId',
        'contextFileId',
        'configFileId',
    ];

    /**
     * ORM
     */
    private static _orm?: MikroORM<MongoDriver>;

    /**
     * Grid FS
     */
    private static _gridFS?: GridFSBucket;

    /**
     * Entity manager
     */
    private readonly _em: MongoEntityManager;

    public constructor(private readonly entityClass: new () => T) {
        if (!DataBaseHelper.orm) {
            throw new Error('ORM is not initialized');
        }
        this._em = DataBaseHelper.orm.em;
    }

    /**
     * Set ORM
     */
    public static set orm(orm: MikroORM<MongoDriver>) {
        DataBaseHelper._orm = orm;
    }

    /**
     * Get ORM
     */
    public static get orm() {
        return DataBaseHelper._orm;
    }

    /**
     * Set GridFS
     */
    public static set gridFS(gridFS: GridFSBucket) {
        DataBaseHelper._gridFS = gridFS;
    }

    /**
     * Get GridFS
     */
    public static get gridFS() {
        return DataBaseHelper._gridFS;
    }

    /**
     * Delete entities by filters
     * @param filters filters
     * @returns Count
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async delete(filters: FilterObject<T> | string | ObjectId): Promise<number> {
        return await this._em.nativeDelete(this.entityClass, filters);
    }

    /**
     * Remove entities or entity
     * @param entity Entities or entity
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async remove(entity: T | T[]): Promise<void> {
        await this._em.removeAndFlush(entity);
    }

    /**
     * Create entity
     * @param entity Entity
     */
    public create(entity: FilterObject<T>): T;
    /**
     * Create entities
     * @param entities Entities
     */
    public create(entities: (FilterObject<T>)[]): T[];
    public create(entity: FilterObject<T> | FilterObject<T>[]): T | T[] {
        if (Array.isArray(entity)) {
            const arrResult = [];
            for (const item of entity) {
                arrResult.push(this.create(item));
            }
            return arrResult;
        }
        const entityWithId = entity as FilterObject<T> & { _id?: ObjectId };

        if (!entityWithId._id) {
            entityWithId._id = new ObjectId(ObjectId.generate());
        }
        return this._em.fork().create(this.entityClass, entityWithId);
    }

    /**
     * Aggregate
     * @param pipeline Pipeline
     * @returns Result
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async aggregate(pipeline: FilterObject<T>[]): Promise<T[]> {
        const aggregateEntities = await this._em.aggregate(
            this.entityClass,
            pipeline
        );
        for (const entity of aggregateEntities) {
            for (const systemFileField of DataBaseHelper._systemFileFields) {
                if (Object.keys(entity).includes(systemFileField)) {
                    const fileStream = DataBaseHelper.gridFS.openDownloadStream(
                        entity[systemFileField]
                    );
                    const bufferArray = [];
                    for await (const data of fileStream) {
                        bufferArray.push(data);
                    }
                    const buffer = Buffer.concat(bufferArray);
                    entity[systemFileField.replace('FileId', '')] = JSON.parse(
                        buffer.toString()
                    );
                }
            }
        }
        return aggregateEntities;
    }

    /**
     * AggregateDryRun
     * @param pipeline Pipeline
     * @param dryRunId
     * @param dryRunClass
     *
     * @returns Result
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async aggregateDryRan(pipeline: FilterObject<T>[], dryRunId: string, dryRunClass: string): Promise<T[]> {
        if (Array.isArray(pipeline)) {
            pipeline.unshift({
                $match: {
                    dryRunId,
                    dryRunClass,
                },
            } as FilterObject<unknown> & {
                $match?: {
                    dryRunId?: string;
                    dryRunClass?: string;
                }
            });
        }

        return await this.aggregate(pipeline)
    }

    /**
     * get document aggregation filters
     * @param props
     *
     * @returns Result
     */
    public static getDocumentAggregationFilters(props: IGetDocumentAggregationFilters): void {
        const {
            aggregation,
            aggregateMethod,
            nameFilter,
            timelineLabelPath,
            timelineDescriptionPath,
            dryRun,
            sortObject,
            itemsPerPage,
            page,
            policyId,
        } = props;

        const filters = {
            [MAP_DOCUMENT_AGGREGATION_FILTERS.BASE]: [
                {
                    $match: {
                        '__sourceTag__': { $ne: null },
                    },
                }, {
                    $set: {
                        'option': {
                            $cond: {
                                if: {
                                    $or: [
                                        { $eq: [null, '$newOption'] },
                                        { $not: '$newOption' },
                                    ],
                                },
                                then: '$option',
                                else: '$newOption',
                            },
                        },
                    },
                }, {
                    $unset: 'newOptions',
                },
            ],
            [MAP_DOCUMENT_AGGREGATION_FILTERS.HISTORY]: [
                {
                    $lookup: {
                        from: `${
                            dryRun
                                ? 'dry_run'
                                : 'document_state'
                        }`,
                        localField: 'id',
                        foreignField: 'documentId',
                        pipeline: [
                            {
                                $set: {
                                    labelValue: timelineLabelPath
                                        ? '$document.' + (timelineLabelPath || 'option.status')
                                        : '$document.option.status',
                                    comment: timelineDescriptionPath
                                        ? '$document.' + (timelineDescriptionPath || 'option.comment')
                                        : '$document.option.comment',
                                    created: '$createDate',
                                },
                            },
                        ],
                        as: 'history',
                    },
                },
            ],
            [MAP_DOCUMENT_AGGREGATION_FILTERS.SORT]: [
                {
                    $sort: sortObject
                }
            ],
            [MAP_DOCUMENT_AGGREGATION_FILTERS.PAGINATION]: [
                {
                    $skip: itemsPerPage * page
                },
                {
                    $limit: itemsPerPage
                }
            ],
            [MAP_DOCUMENT_AGGREGATION_FILTERS.VC_DOCUMENTS]: [
                {
                    $match: {
                        policyId: { $eq: policyId }
                    }
                }
            ],
            [MAP_DOCUMENT_AGGREGATION_FILTERS.VP_DOCUMENTS]: [
                {
                    $match: {
                        policyId: { $eq: policyId }
                    }
                }
            ],
            [MAP_DOCUMENT_AGGREGATION_FILTERS.APPROVE]: [
                {
                    $match: {
                        policyId: { $eq: policyId }
                    }
                }
            ],
        };

        aggregation[aggregateMethod](...filters[nameFilter]);
    }

    /**
     * get document aggregation filters for analytics
     * @param nameFilter
     * @param uuid
     *
     * @returns Result
     */
    public static getAnalyticsDocAggregationFilters(nameFilter: string, uuid: string): unknown[] {
        const filters = {
            [MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS.DOC_BY_POLICY]: [
                { $match: { uuid, } },
                {
                    $group: {
                        _id: {
                            policyTopicId: '$policyTopicId',
                            type: '$type',
                            action: '$action'
                        }, count: { $sum: 1 }
                    }
                }
            ],
            [MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS.DOC_BY_INSTANCE]: [
                { $match: { uuid } },
                {
                    $group: {
                        _id: {
                            instanceTopicId: '$instanceTopicId',
                            type: '$type',
                            action: '$action'
                        }, count: { $sum: 1 }
                    }
                }
            ],
            [MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS.DOCS_GROUPS]: [
                { $match: { uuid } },
                { $group: { _id: { type: '$type', action: '$action' }, count: { $sum: 1 } } }
            ],
            [MAP_REPORT_ANALYTICS_AGGREGATION_FILTERS.SCHEMA_BY_NAME]: [
                { $match: { uuid } },
                {
                    $group: {
                        _id: {
                            name: '$name',
                            action: '$action',
                        }, count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]
        };

        return filters[nameFilter];
    }

    /**
     * get attributes aggregation filters
     * @param nameFilterMap
     * @param nameFilterAttributes
     * @param existingAttributes
     *
     * @returns Result
     */
    public static getAttributesAggregationFilters(nameFilterMap: string, nameFilterAttributes: string, existingAttributes: string[] | []): unknown[] {
        const filters = {
            [MAP_ATTRIBUTES_AGGREGATION_FILTERS.RESULT]: [
                { $project: { attributes: '$attributes' } },
                { $unwind: { path: '$attributes' } },
                { $match: { attributes: { $regex: nameFilterAttributes, $options: 'i' } } },
                { $match: { attributes: { $not: { $in: existingAttributes } } } },
                { $group: { _id: null, uniqueValues: { $addToSet: '$attributes' } } },
                { $unwind: { path: '$uniqueValues' } },
                { $limit: 20 },
                { $group: { _id: null, uniqueValues: { $addToSet: '$uniqueValues' } } },
            ],
        };

        return filters[nameFilterMap];
    }

    /**
     * get tasks aggregation filters
     * @param nameFilter
     * @param processTimeout
     *
     * @returns Result
     */
    public static getTasksAggregationFilters(nameFilter: string, processTimeout: number): unknown[] {
        const filters = {
            [MAP_TASKS_AGGREGATION_FILTERS.RESULT]: [
                {
                    $match: {
                        sent: true,
                        done: { $ne: true },
                    },
                },
                {
                    $addFields: {
                        timeDifference: {
                            $subtract: ['$processedTime', '$createDate'],
                        },
                    },
                },
                {
                    $match: {
                        timeDifference: { $gt: processTimeout },
                    },
                },
            ],
        };

        return filters[nameFilter];
    }

    /**
     * get transactions serials aggregation filters
     * @param props
     *
     * @returns Result
     */
    public static getTransactionsSerialsAggregationFilters(props: IGetAggregationFilters): void {
        const { aggregation, aggregateMethod, nameFilter } = props;

        const filters = {
            [MAP_TRANSACTION_SERIALS_AGGREGATION_FILTERS.COUNT]: [
                {
                    $project: {
                        serials: { $size: '$serials' },
                    },
                }
            ],
        };

        aggregation[aggregateMethod](...filters[nameFilter]);
    }

    /**
     * Get aggregation filter for transactions serials
     * @param mintRequestId Mint request identifier
     * @param transferStatus Transfer status
     *
     * @returns Aggregation filter
     */
    public static _getTransactionsSerialsAggregation(
        mintRequestId: string,
        transferStatus?: MintTransactionStatus | unknown
    ): unknown[] {
        const match: any = {
            mintRequestId,
        };

        if (transferStatus) {
            match.transferStatus = transferStatus;
        }

        return [
            {
                $match: match,
            },
            {
                $group: {
                    _id: 1,
                    serials: {
                        $push: '$serials',
                    },
                },
            },
            {
                $project: {
                    serials: {
                        $reduce: {
                            input: '$serials',
                            initialValue: [],
                            in: {
                                $concatArrays: ['$$value', '$$this'],
                            },
                        },
                    },
                },
            },
        ];
    }

    /**
     * Find and count
     * @param filters Filters
     * @param options Options
     * @returns Entities and count
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async findAndCount(filters: FilterObject<T> | string | ObjectId, options?: unknown): Promise<[T[], number]> {
        return await this._em.findAndCount(this.entityClass, filters, options);
    }

    /**
     * Count entities
     * @param filters Filters
     * @param options Options
     * @returns Count
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async count(filters?: FilterObject<T> | string | ObjectId, options?: FindOptions<T>): Promise<number> {
        return await this._em.count(this.entityClass, filters, options);
    }

    /**
     * Find entities
     * @param filters Filters
     * @param options Options
     * @returns Entities
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async find(filters?: FilterQuery<T> | string | ObjectId, options?: FindOptions<T>): Promise<T[]> {
        let query: FilterQuery<T>;

        if (typeof filters === 'string' || filters instanceof ObjectId) {
            query = { _id: filters } as FilterQuery<T>;
        } else {
            query = filters || {};
        }

        return await this._em.getRepository<T>(this.entityClass).find(query, options);
    }

    /**
     * Find all entities
     * @param options Options
     * @returns Entities
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async findAll(options?: FindAllOptions<T>): Promise<T[]> {
        return await this._em.getRepository<T>(this.entityClass).findAll(options);
    }

    /**
     * Find entity
     * @param filters Filters
     * @param options Options
     * @returns Entity
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async findOne(filters: FilterQuery<T> | string | ObjectId, options: unknown = {}): Promise<T | null> {
        let query: FilterQuery<T>;

        if (typeof filters === 'string' || filters instanceof ObjectId) {
            query = { _id: filters } as FilterQuery<T>;
        } else {
            query = filters;
        }

        return await this._em.getRepository<T>(this.entityClass).findOne(query, options);
    }

    /**
     * Save entity by id field or filters.
     * @param entity Entity
     * @param filter Filter
     * @returns Entity
     */
    public async save(entity: Partial<T>, filter?: FilterObject<T>): Promise<T>;

    /**
     * Save entities by ids
     * @param entities Entities
     * @returns Entities
     */
    public async save(entities: Partial<T>[]): Promise<T[]>;

    @CreateRequestContext(() => DataBaseHelper.orm)
    public async save(
        entity: Partial<T> | Partial<T>[],
        filter?: FilterObject<T>
    ): Promise<T | T[]> {
        if (Array.isArray(entity)) {
            const result = [];
            for (const item of entity) {
                result.push(await this.save(item));
            }
            return result;
        }

        const repository = this._em.getRepository(this.entityClass);
        if (!entity.id && !entity._id && !filter) {
            const e = repository.create(Object.assign({}, entity));
            await this._em.persistAndFlush(e);
            return e;
        }

        let entityToUpdateOrCreate = await repository.findOne(filter || entity.id || entity._id);

        if (entityToUpdateOrCreate) {
            DataBaseHelper._systemFileFields.forEach(systemFileField => {
                if (entity[systemFileField]) {
                    entity[systemFileField] = entityToUpdateOrCreate[systemFileField];
                }
            });
            wrap(entityToUpdateOrCreate).assign({ ...entity, updateDate: new Date() } as EntityData<T>, { merge: false });
        } else {
            entityToUpdateOrCreate = repository.create({ ...entity });
            this._em.persist(entityToUpdateOrCreate);
        }

        await this._em.flush();
        await this._em.persistAndFlush(entityToUpdateOrCreate);

        return entityToUpdateOrCreate;
    }

    /**
     * Update entity by id field or filters
     * @param entity Entity
     * @param filter Filter
     * @returns Entity
     */
    public async update(entity: T, filter?: FilterQuery<T>): Promise<T>;

    /**
     * Update entities by ids
     * @param entities Entities
     */
    public async update(entities: T[]): Promise<T[]>;

    @CreateRequestContext(() => DataBaseHelper.orm)
    public async update(
        entity: T | T[],
        filter?: FilterQuery<T>
    ): Promise<T | T[]> {
        if (Array.isArray(entity)) {
            const result = [];
            for (const item of entity) {
                result.push(await this.update(item));
            }
            return result;
        }

        if (!entity.id && !entity._id && !filter) {
            return;
        }

        const repository = this._em.getRepository(this.entityClass);

        const entitiesToUpdate = await repository.find(filter || entity.id || entity._id);

        for (const entityToUpdate of entitiesToUpdate) {
            DataBaseHelper._systemFileFields.forEach(systemFileField => {
                if (entity[systemFileField]) {
                    entity[systemFileField] = entityToUpdate[systemFileField];
                }
            });
            wrap(entityToUpdate).assign({ ...entity, updateDate: new Date() } as EntityData<T>, { mergeObjectProperties: false });
        }
        await this._em.flush();
        return entitiesToUpdate.length === 1
            ? entitiesToUpdate[0]
            : entitiesToUpdate;
    }

    /**
     * Create a lot of data
     * @param data Data
     * @param amount Amount
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async createMuchData(data: FilterObject<T> & { id: string, _id: string }, amount: number): Promise<void> {
        const repository: MongoEntityRepository<T> = this._em.getRepository(this.entityClass);
        delete data.id;
        delete data._id;
        while (amount > 0) {
            delete data.id;
            delete data._id;
            this._em.persist(repository.create(data as RequiredEntityData<T>));
            amount--;
        }
        await this._em.flush();
    }
}
