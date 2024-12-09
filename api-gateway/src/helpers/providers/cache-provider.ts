import { Provider } from '@nestjs/common';

import Cache from 'ioredis';

//types and interfaces
export type CacheClient = Cache;

//constants
export const CACHE_CLIENT = 'CACHE_CLIENT'

const HOST = process.env.HOST_CACHE;
const PORT = Number(process.env.PORT_CACHE);
const USE_SENTINEL = process.env.USE_SENTINEL === 'true';
const SENTINEL_HOSTS = process.env.SENTINEL_HOSTS?.split(',') || [];
const MASTER_NAME = process.env.REDIS_MASTER_NAME;

export const cacheProvider: Provider = {
  useFactory: (): CacheClient => {
    if (USE_SENTINEL && SENTINEL_HOSTS.length > 0) {
      return new Cache({
        sentinels: SENTINEL_HOSTS.map(host => {
          const [hostName, port] = host.split(':');
          return { host: hostName, port: Number(port) };
        }),
        name: MASTER_NAME,
      });
    } else {
      // Direct Redis connection
      return new Cache({
        host: HOST,
        port: PORT,
      });
    }
  },
  provide: CACHE_CLIENT,
};
