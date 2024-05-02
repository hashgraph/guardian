import { FileValidator } from '@nestjs/common/pipes/file/file-validator.interface';
import { FileTypeValidator, MaxFileSizeValidator } from '@nestjs/common';

import { MultipartFile as MultipartFileFastify} from '@fastify/multipart';

//types and interfaces
import { MultipartFile, MultipartOptions } from '../types/index.js';


export const getFileFromPart = async (part: MultipartFileFastify): Promise<MultipartFile> => {
  const buffer: Buffer = await part.toBuffer()
  return {
    buffer,
    size: buffer.byteLength,
    filename: part.filename,
    mimetype: part.mimetype,
    fieldname: part.fieldname,
  };
};

export const validateFile = (file: MultipartFile, options: MultipartOptions): string | void => {
  const validators: FileValidator[] = [];

  if (options.maxFileSize) {
    validators.push(new MaxFileSizeValidator({ maxSize: options.maxFileSize }));
  }

  if (options.fileType) {
    validators.push(new FileTypeValidator({ fileType: options.fileType }));
  }

  for (const validator of validators) {
    if (validator.isValid(file)) continue;

    return validator.buildErrorMessage(file);
  }
};