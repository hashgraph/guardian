import { Provider } from '@nestjs/common';

import Redis from 'ioredis';

//types and interfaces
export type RedisClient = Redis;

//constants
export const REDIS_CLIENT = 'REDIS_CLIENT'

//TODO move out to env
const HOST = '127.0.0.1';
const PORT = 6379;

export const redisProvider: Provider = {
  useFactory: (): RedisClient => {
    return new Redis({
      host: HOST,
      port: PORT,
    });
  },
  provide: REDIS_CLIENT,
};
