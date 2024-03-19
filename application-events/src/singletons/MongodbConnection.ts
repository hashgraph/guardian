import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { Webhook } from '../entities/Webhook.js';

export default class MongodbConnection {

  private static instance: MongodbConnection;

  private readonly connection: any;

  constructor () {
    this.connection = MikroORM.init({
      clientUrl: process.env.MONGODB_SERVER_URL || 'mongodb://mongo:27017',
      dbName: 'application_events',
      driver: MongoDriver,
      entities: [ Webhook ],
    });
  };

  static getInstance (): MongodbConnection {
    if (!MongodbConnection.instance) {
      MongodbConnection.instance = new MongodbConnection();
    }
    return MongodbConnection.instance;
  }

  getConnection () {
    return this.connection;
  }
}
