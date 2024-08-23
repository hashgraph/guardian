import { MikroORM, CreateRequestContext, wrap } from '@mikro-orm/core';
import { MongoDriver, MongoEntityManager, MongoEntityRepository, ObjectId } from '@mikro-orm/mongodb';
import { BaseEntity } from '../models/index.js';
import { DataBaseNamingStrategy } from './db-naming-strategy.js';
import { GridFSBucket } from 'mongodb';
import fixConnectionString from './fix-connection-string.js';

/**
 * Common connection config
 */
export const COMMON_CONNECTION_CONFIG: any = {
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
    public async delete(filters: any | string | ObjectId): Promise<number> {
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
    public create(entity: any): T;
    /**
     * Create entities
     * @param entities Entities
     */
    public create(entities: any[]): T[];
    public create(entity: any | any[]): T | T[] {
        if (Array.isArray(entity)) {
            const arrResult = [];
            for (const item of entity) {
                arrResult.push(this.create(item));
            }
            return arrResult;
        }
        if (!entity._id) {
            entity._id = new ObjectId(ObjectId.generate());
        }
        return this._em.fork().create(this.entityClass, entity);
    }

    /**
     * Aggregate
     * @param pipeline Pipeline
     * @returns Result
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async aggregate(pipeline: any[]): Promise<any[]> {
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
     * Find and count
     * @param filters Filters
     * @param options Options
     * @returns Entities and count
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async findAndCount(filters: any | string | ObjectId, options?: any): Promise<[T[], number]> {
        return await this._em.findAndCount(this.entityClass, filters?.where || filters, options);
    }

    /**
     * Count entities
     * @param filters Filters
     * @param options Options
     * @returns Count
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async count(filters?: any | string | ObjectId, options?: any): Promise<number> {
        return await this._em.count(this.entityClass, filters?.where || filters, options);
    }

    /**
     * Find entities
     * @param filters Filters
     * @param options Options
     * @returns Entities
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async find(filters?: any | string | ObjectId, options?: any): Promise<T[]> {
        return await this._em.getRepository<T>(this.entityClass).find(filters?.where || filters || {}, options);
    }

    /**
     * Find all entities
     * @param options Options
     * @returns Entities
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async findAll(options?: any): Promise<T[]> {
        return await this._em.getRepository<T>(this.entityClass).findAll(options);
    }

    /**
     * Find entity
     * @param filters Filters
     * @param options Options
     * @returns Entity
     */
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async findOne(filter: any | string | ObjectId, options: any = {}): Promise<T | null> {
        return await this._em.getRepository<T>(this.entityClass).findOne(filter?.where || filter, options);
    }

    /**
     * Save entity by id field or filters.
     * @param entity Entity
     * @param filter Filter
     * @returns Entity
     */
    public async save(entity: any, filter?: any): Promise<T>;
    /**
     * Save entities by ids
     * @param entites Entities
     * @returns Entities
     */
    public async save(entites: any[]): Promise<T[]>;
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async save(
        entity: any,
        filter?: any
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

        let entityToUpdateOrCreate: any = await repository.findOne(filter?.where || filter || entity.id || entity._id);
        if (entityToUpdateOrCreate) {
            DataBaseHelper._systemFileFields.forEach(systemFileField => {
                if (entity[systemFileField]) {
                    entity[systemFileField] = entityToUpdateOrCreate[systemFileField];
                }
            });
            wrap(entityToUpdateOrCreate).assign({ ...entity, updateDate: new Date() }, { merge: false });
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
    public async update(entity: any, filter?: any): Promise<T>;
    /**
     * Update entities by ids
     * @param entities Entities
     */
    public async update(entities: any[]): Promise<T[]>;
    @CreateRequestContext(() => DataBaseHelper.orm)
    public async update(
        entity: any | any[],
        filter?: any
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
        const entitiesToUpdate: any = await repository.find(filter?.where || filter || entity.id || entity._id);
        for (const entityToUpdate of entitiesToUpdate) {
            DataBaseHelper._systemFileFields.forEach(systemFileField => {
                if (entity[systemFileField]) {
                    entity[systemFileField] = entityToUpdate[systemFileField];
                }
            });
            wrap(entityToUpdate).assign({ ...entity, updateDate: new Date() }, { mergeObjectProperties: false });
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
    public async createMuchData(data: any, amount: number): Promise<void> {
        const repository: MongoEntityRepository<T> = this._em.getRepository(this.entityClass);
        delete data.id;
        delete data._id;
        while (amount > 0) {
            delete data.id;
            delete data._id;
            await this._em.persist(repository.create(data));
            amount--;
        }
        await this._em.flush();
    }
}
