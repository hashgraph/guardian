import { MultipartFile as MultipartFileFastify } from '@fastify/multipart';

//types and interfaces
import { MultipartFile } from '../types/index.js';

export const getFileFromPart = async (part: MultipartFileFastify): Promise<MultipartFile | null> => {
  const buffer: Buffer = await part.toBuffer();

  const { byteLength: size } = buffer;
  const { filename, mimetype, fieldname, encoding } = part;

  if (!size || !fieldname) {
    return null;
  }

  return {
    buffer,
    size,
    filename,
    mimetype,
    fieldname,
    encoding,
    originalname: fieldname,
  };
};