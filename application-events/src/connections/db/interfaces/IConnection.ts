import { EntityClass } from '@mikro-orm/core';

export default interface IConnection {
  getAll <T> (entityClass: EntityClass<T>): Promise<any[]>;
  save<T> (entity: T): Promise<void>;
  find<T> (id: string, entityClass: EntityClass<T>): Promise<any>;
  remove<T> (entity: T): Promise<any>;
}
