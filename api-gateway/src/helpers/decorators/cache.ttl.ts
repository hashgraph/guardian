import { SetMetadata } from '@nestjs/common';

export const CacheTTL = (key: string, ttl: number) => SetMetadata(key, ttl);
