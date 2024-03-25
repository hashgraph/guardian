import { MikroORM, EntityRepository, EntityName, GetRepository } from "@mikro-orm/core";
import { MongoDriver, MongoEntityManager, MongoEntityRepository } from "@mikro-orm/mongodb";
import { GridFSBucket } from 'mongodb';

/**
 * Database helper
 */
export class DataBaseHelper {
    /**
     * ORM
     */
    private static _orm?: MikroORM<MongoDriver>;

    /**
     * Grid FS
     */
    private static _gridFS?: GridFSBucket;

    /**
     * Set ORM
     */
    public static set orm(orm: MikroORM<MongoDriver>) {
        DataBaseHelper._orm = orm;
    }

    /**
     * Set GridFS
     */
    public static set gridFS(gridFS: GridFSBucket) {
        DataBaseHelper._gridFS = gridFS;
    }

    /**
     * Get ORM
     */
    public static get orm() {
        return DataBaseHelper._orm;
    }

    /**
     * Get GridFS
     */
    public static get gridFS() {
        return DataBaseHelper._gridFS;
    }

    /**
     * Set MongoDriver
     */
    public static connect(db: MikroORM<MongoDriver>) {
        DataBaseHelper.orm = db;
        const connect:any = db.em.getDriver().getConnection().getDb();
        DataBaseHelper.gridFS = new GridFSBucket(connect);
    }

    public static getRepository<T extends object, U extends EntityRepository<T> = MongoEntityRepository<T>>(
        entityName: EntityName<T>
    ): GetRepository<T, U> {
        if (!DataBaseHelper.orm) {
            throw new Error('ORM is not initialized');
        }
        const fork = DataBaseHelper.orm.em.fork();
        return fork.getRepository(entityName);
    }

    public static getEntityManager(): MongoEntityManager<MongoDriver> {
        if (!DataBaseHelper.orm) {
            throw new Error('ORM is not initialized');
        }
        return DataBaseHelper.orm.em.fork();
    }
}
