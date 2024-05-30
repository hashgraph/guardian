import { createParamDecorator, ExecutionContext } from '@nestjs/common';

//types and interfaces
import { FastifyRequest, MultipartFile } from '../interceptors/types/index.js';

export const UploadedFiles = createParamDecorator(
  async (_data: unknown, ctx: ExecutionContext): Promise<null | MultipartFile[]> => {
    const req = ctx.switchToHttp().getRequest() as FastifyRequest;
    return req.storedFiles;
  },
);