import { Inject, Injectable } from '@nestjs/common';

//helpers
import { CACHE_CLIENT, CacheClient } from './cache-provider.js';

@Injectable()
export class CacheService {
  public constructor(
    @Inject(CACHE_CLIENT)
    private readonly client: CacheClient,
  ) {}

  private async setTag(tag: string, key: string,): Promise<void> {
    await this.client.sadd(tag, key);
  }

  async set(key: string, value: string, expirationSeconds: number, tag: string): Promise<void> {
    await this.client.set(key, value, 'EX', expirationSeconds);

    await this.setTag(tag, key)
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async invalidate(tags: string[]): Promise<void> {
    for (const tag of tags) {
      const keys = await this.client.smembers(tag);

      if(keys.length) {
        await this.client.del(keys);
      }

      await this.client.del(tag);
    }
  }
}
