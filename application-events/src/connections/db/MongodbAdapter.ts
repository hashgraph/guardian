import IConnection from './interfaces/IConnection';
import { ObjectId } from '@mikro-orm/mongodb';
import { EntityClass } from '@mikro-orm/core/typings';
import MongodbConnection from '../../singletons/MongodbConnection';

/**
 * MongodbAdapter
 */
export default class MongodbAdapter implements IConnection {
  /**
   * Connection
   * @private
   */
  private connection: any;

  constructor() {
    const mongodbInstance = MongodbConnection.getInstance();
    this.connection = mongodbInstance.getConnection();
  }

  /**
   * Get all webhook
   * @param entityClass
   */
  public async getAll<T>(entityClass: EntityClass<T>) {
    const em = await this.getEntityManager();
    const records = await em.find(entityClass, {});
    return records || [];
  }

  /**
   * Save webhook
   * @param entity
   */
  public async save<T>(entity: T) {
    const em = await this.getEntityManager();
    await em.persistAndFlush(entity);
  }

  /**
   * Find webhook
   * @param id
   * @param entityClass
   */
  public async find<T>(id: string, entityClass: EntityClass<T>) {
    const em = await this.getEntityManager();
    return em.findOne(entityClass, {_id: new ObjectId(id)});
  }

  /**
   * Remove webhook
   * @param entity
   */
  public async remove<T>(entity: T) {
    const em = await this.getEntityManager();
    em.remove(entity);
    await em.flush();
  }

  /**
   * Get entity manager
   * @private
   */
  private async getEntityManager() {
    const orm = await this.connection;
    return orm.em.fork();
  }

}
