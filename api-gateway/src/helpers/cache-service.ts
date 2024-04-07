import { Inject, Injectable } from '@nestjs/common';

//helpers
import { CACHE_CLIENT, CacheClient } from './cache-provider.js';

@Injectable()
export class CacheService {
  public constructor(
    @Inject(CACHE_CLIENT)
    private readonly client: CacheClient,
  ) {}

  async set(key: string, value: string, expirationSeconds: number) {
    await this.client.set(key, value, 'EX', expirationSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
}
