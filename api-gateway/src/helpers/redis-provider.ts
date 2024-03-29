import { Provider } from '@nestjs/common';

import Redis from 'ioredis';

//types and interfaces
export type RedisClient = Redis;

//constants
export const REDIS_CLIENT = 'REDIS_CLIENT'

const HOST = process.env.HOST_REDIS;
const PORT = Number(process.env.PORT_REDIS);

export const redisProvider: Provider = {
  useFactory: (): RedisClient => {
    return new Redis({
      host: HOST,
      port: PORT,
    });
  },
  provide: REDIS_CLIENT,
};
