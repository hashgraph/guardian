import { SetMetadata as SetMetadataNest } from '@nestjs/common';

export const SetMetadata = (key: string, value: unknown) => SetMetadataNest(key, value);
