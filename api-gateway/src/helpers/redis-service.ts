import { Inject, Injectable } from '@nestjs/common';

//helpers
import { REDIS_CLIENT, RedisClient } from './redis-provider.js';

@Injectable()
export class RedisService {
  public constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: RedisClient,
  ) {
  }

  async set(key: string, value: string, expirationSeconds: number) {
    await this.client.set(key, value, 'EX', expirationSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
}
