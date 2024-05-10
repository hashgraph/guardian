import { CallHandler, ExecutionContext, HttpException, HttpStatus, mixin, NestInterceptor, Type } from '@nestjs/common';

import { MultipartValue } from '@fastify/multipart';
import { Observable } from 'rxjs';

//utils
import { getFileFromPart } from './utils/index.js';

//types and interfaces
import { FastifyRequest, MultipartFile, MultipartOptions } from './types/index.js';

export function AnyFilesInterceptor(options: MultipartOptions = {}): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      const req = context.switchToHttp().getRequest() as FastifyRequest;

      if (!req.isMultipart()) {
        throw new HttpException('The request should be a form-data', HttpStatus.BAD_REQUEST);
      }

      const files: MultipartFile[] = [];
      const body = {};

      try {
        for await (const part of req.parts()) {
          const { type, fieldname } = part;

          if (type !== 'file') {
            body[fieldname] = (part as MultipartValue).value;
            continue;
          }

          const file: MultipartFile | null = await getFileFromPart(part);

          if (file) {
            files.push(file);
          }
        }
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      if (files.length) {
        req.storedFiles = files;
      }

      req.body = body;

      return next.handle();
    }
  }

  return mixin(MixinInterceptor);
}