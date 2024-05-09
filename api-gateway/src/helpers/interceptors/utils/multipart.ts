import { MultipartFile as MultipartFileFastify} from '@fastify/multipart';

//types and interfaces
import { MultipartFile } from '../types/index.js';

export const getFileFromPart = async (part: MultipartFileFastify): Promise<MultipartFile> => {
  const buffer: Buffer = await part.toBuffer()
  return {
    buffer,
    size: buffer.byteLength,
    filename: part.filename,
    mimetype: part.mimetype,
    fieldname: part.fieldname,
    encoding: part.encoding,
    originalname: part.fieldname
  };
};