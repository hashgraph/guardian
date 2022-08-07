import {
    MikroORM,
    UseRequestContext, 
    wrap
} from '@mikro-orm/core';
import { MongoDriver, MongoEntityManager, ObjectId } from '@mikro-orm/mongodb';
import { BaseEntity } from '../models/base-entity';

export const DB_DI: { 
    orm?: MikroORM<MongoDriver>
} = {};

export class DataBaseHelper<T extends BaseEntity> {

    private readonly _em: MongoEntityManager;

    public constructor(private entityClass: new() => T) {
        if (!DB_DI.orm) {
            throw new Error('ORM is not initialized to DB_DI');
        }
        this._em = DB_DI.orm.em;
    }

    @UseRequestContext(() => DB_DI.orm)
    public async delete(filters: any | string | ObjectId): Promise<number> {
        return await this._em.nativeDelete(this.entityClass, filters);
    }

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

    public create(entity: any | any[]): T | T[]{
        if (Array.isArray(entity)) {
            const result = [];
            for (const item of entity) {
                result.push(this.create(item)); 
            }
            return result;
        }
        return this._em.fork().create(this.entityClass, entity);
    }

    @UseRequestContext(() => DB_DI.orm)
    public async aggregate(pipeline: any[]): Promise<any[]> {
        return await this._em.aggregate(this.entityClass, pipeline);
    }

    @UseRequestContext(() => DB_DI.orm)
    public async findAndCount(filters: any | string | ObjectId, options?: any): Promise<[T[],number]> {
        return await this._em.findAndCount(this.entityClass, filters?.where || filters, options);
    }

    @UseRequestContext(() => DB_DI.orm)
    public async count(filters?: any | string | ObjectId, options?: any): Promise<number> {
        return await this._em.count(this.entityClass, filters?.where || filters, options);
    }

    @UseRequestContext(() => DB_DI.orm)
    public async find(filters: any | string | ObjectId, options?: any) {
        return await this._em.getRepository<T>(this.entityClass).find(filters?.where || filters, options);
    }

    @UseRequestContext(() => DB_DI.orm)
    public async findAll(options?: any) {
        return await this._em.getRepository<T>(this.entityClass).findAll(options);
    }

    @UseRequestContext(() => DB_DI.orm)
    public async findOne(filter: any | string | ObjectId, options: any = {}): Promise<T> {
        return await this._em.getRepository<T>(this.entityClass).findOne(filter?.where || filter, options);
    }

    @UseRequestContext(() => DB_DI.orm)
    public async save(
        entity: any | any[],
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
            let e = repository.create(Object.assign({}, entity));
            await repository.persistAndFlush(e);
            return e;
        }

        let entityToUpdateOrCreate: any = await repository.findOne(filter?.where || filter || (entity as any).id || (entity as any)._id);
        if (entityToUpdateOrCreate) {
            wrap(entityToUpdateOrCreate).assign(entity);
        } else {
            let entityToUpdateOrCreate = repository.create({ ...entity });
            await repository.persist(entityToUpdateOrCreate);
        }
        await repository.flush();
        return entityToUpdateOrCreate;
    }

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
        let entitiesToUpdate: any = await repository.find(filter?.where || filter || entity.id || entity._id);
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

        return null;
    }
}