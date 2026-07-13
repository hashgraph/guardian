import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { Webhook } from '../entities/Webhook.js';
import process from 'node:process';
import { DEFAULT_MONGO } from '#constants';

export default class MongodbConnection {

  private static instance: MongodbConnection;

  private readonly connection: any;

  constructor () {
    this.connection = MikroORM.init({
      clientUrl: process.env.MONGODB_SERVER_URL || 'mongodb://mongo:27017',
      dbName: 'application_events',
      driver: MongoDriver,
      entities: [ Webhook ],
      driverOptions: {
        minPoolSize: parseInt(process.env.MIN_POOL_SIZE ?? DEFAULT_MONGO.MIN_POOL_SIZE),
        maxPoolSize: parseInt(process.env.MAX_POOL_SIZE  ?? DEFAULT_MONGO.MAX_POOL_SIZE),
        maxIdleTimeMS: parseInt(process.env.MAX_IDLE_TIME_MS  ?? DEFAULT_MONGO.MAX_IDLE_TIME_MS)
      },
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
