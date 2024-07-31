import { Provider } from '@nestjs/common';

import Cache from 'ioredis';

//types and interfaces
export type CacheClient = Cache;

//constants
export const CACHE_CLIENT = 'CACHE_CLIENT'

const HOST = process.env.HOST_CACHE;
const PORT = Number(process.env.PORT_CACHE);

export const cacheProvider: Provider = {
  useFactory: (): CacheClient => {
    return new Cache({
      host: HOST,
      port: PORT,
    });
  },
  provide: CACHE_CLIENT,
};
