import * as fastify from 'fastify'

export interface FastifyRequest extends fastify.FastifyRequest {
  storedFiles: MultipartFile[];
  body: unknown;
}

export interface MultipartFile {
  buffer: Buffer;
  filename: string;
  size: number;
  mimetype: string;
  fieldname: string;
}

export class MultipartOptions {
  constructor(
    public maxFileSize?: number,
    public fileType?: string | RegExp,
  ) {}
}