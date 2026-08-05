import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Global module exposing the app-level Redict (Redis) client (RedisService),
 * so guards/services can inject it without importing a provider module.
 */
@Global()
@Module({
    providers: [RedisService],
    exports: [RedisService],
})
export class RedisModule {}
