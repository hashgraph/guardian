import {
    MikroORM,
    UseRequestContext,
    wrap
} from '@mikro-orm/core';
import { MongoDriver, MongoEntityManager, ObjectId } from '@mikro-orm/mongodb';
import { BaseEntity } from '../models/base-entity';
import { DataBaseNamingStrategy } from './db-naming-strategy';

/**
 * Common connection config
 */
export const COMMON_CONNECTION_CONFIG: any = {
    type: 'mongo',
    namingStrategy: DataBaseNamingStrategy,
    dbName: process.env.DB_DATABASE,
    clientUrl:`mongodb://${process.env.DB_HOST}`,
    entities: [
        'dist/entity/*.js'
    ]
};

/**
 * Dependency injection of database
 */
export const DB_DI: {
    /**
     * ORM
     */
    orm?: MikroORM<MongoDriver>
} = {};

/**
 * Database helper
 */
export class DataBaseHelper<T extends BaseEntity> {

    /**
     * Entity manager
     */
    private readonly _em: MongoEntityManager;

    public constructor(private readonly entityClass: new() => T) {
        if (!DB_DI.orm) {
            throw new Error('ORM is not initialized to DB_DI');
        }
        this._em = DB_DI.orm.em;
    }

    /**
     * Delete entities by filters
     * @param filters filters
     * @returns Count
     */
    @UseRequestContext(() => DB_DI.orm)
    public async delete(filters: any | string | ObjectId): Promise<number> {
        return await this._em.nativeDelete(this.entityClass, filters);
    }

    /**
     * Remove entities or entity
     * @param entity Entities or entity
     */
    @UseRequestContext(() => DB_DI.orm)
    public async remove(entity: T | T[]): Promise<void> {
        if(Array.isArray(entity)) {
            for (const element of entity) {
                await this._em.removeAndFlush(element)
            }
        } else {
            await this._em.removeAndFlush(entity);
        }
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
    public create(entity: any | any[]): T | T[]{
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
    @UseRequestContext(() => DB_DI.orm)
    public async aggregate(pipeline: any[]): Promise<any[]> {
        return await this._em.aggregate(this.entityClass, pipeline);
    }

    /**
     * Find and count
     * @param filters Filters
     * @param options Options
     * @returns Entities and count
     */
    @UseRequestContext(() => DB_DI.orm)
    public async findAndCount(filters: any | string | ObjectId, options?: any): Promise<[T[],number]> {
        return await this._em.findAndCount(this.entityClass, filters?.where || filters, options);
    }

    /**
     * Count entities
     * @param filters Filters
     * @param options Options
     * @returns Count
     */
    @UseRequestContext(() => DB_DI.orm)
    public async count(filters?: any | string | ObjectId, options?: any): Promise<number> {
        return await this._em.count(this.entityClass, filters?.where || filters, options);
    }

    /**
     * Find entities
     * @param filters Filters
     * @param options Options
     * @returns Entities
     */
    @UseRequestContext(() => DB_DI.orm)
    public async find(filters: any | string | ObjectId, options?: any): Promise<T[]> {
        return await this._em.getRepository<T>(this.entityClass).find(filters?.where || filters, options);
    }

    /**
     * Find all entities
     * @param options Options
     * @returns Entities
     */
    @UseRequestContext(() => DB_DI.orm)
    public async findAll(options?: any): Promise<T[]> {
        return await this._em.getRepository<T>(this.entityClass).findAll(options);
    }

    /**
     * Find entity
     * @param filters Filters
     * @param options Options
     * @returns Entity
     */
    @UseRequestContext(() => DB_DI.orm)
    public async findOne(filter: any | string | ObjectId, options: any = {}): Promise<T> {
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
    @UseRequestContext(() => DB_DI.orm)
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
            await repository.persistAndFlush(e);
            return e;
        }

        let entityToUpdateOrCreate: any = await repository.findOne(filter?.where || filter || entity.id || entity._id);
        if (entityToUpdateOrCreate) {
            wrap(entityToUpdateOrCreate).assign(entity);
        } else {
            entityToUpdateOrCreate = repository.create({ ...entity });
            await repository.persist(entityToUpdateOrCreate);
        }
        await repository.flush();
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
    @UseRequestContext(() => DB_DI.orm)
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
        if (entitiesToUpdate.length > 1) {
            for (const entityToUpdate of entitiesToUpdate) {
                wrap(entityToUpdate).assign(entity);
            }
            await repository.flush();
            return entitiesToUpdate;
        } else if (entitiesToUpdate.length === 1) {
            const entityToUpdate = entitiesToUpdate[0];
            wrap(entityToUpdate).assign(entity);
            await repository.flush();
            return entityToUpdate;
        }
    }
}