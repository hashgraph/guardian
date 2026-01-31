import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    DataBaseHelper,
    ARTIFACT_CHUNK_BYTES,
} from '@indexer/common';
import { ObjectId } from 'mongodb';

type MetaReq = { fileId: string };
type MetaRes = {
    fileId: string;
    length: number;
    filename: string;
    contentType: string;
    chunkSize: number;
    totalChunks: number;
};

type ChunkReq = { fileId: string; index: number; chunkSize?: number };

@Controller()
export class ArtifactsService {
    @MessagePattern(IndexerMessageAPI.GET_ARTIFACT_FILE_META)
    async getArtifactMeta(@Payload() msg: MetaReq) {
        try {
            const fileId = msg?.fileId?.trim();
            if (!fileId) { throw new Error('fileId is required'); }

            const _id = new ObjectId(fileId);
            const files = await DataBaseHelper.gridFS.find({ _id }).limit(1).toArray();
            if (!files.length) { throw new Error('File not found'); }

            const meta = files[0] as any;
            const length: number = Number(meta.length ?? 0);
            const filename: string = String(meta.filename ?? `${fileId}.csv`);
            const contentType: string = String(meta.contentType ?? 'text/csv; charset=utf-8');

            const chunkSize = ARTIFACT_CHUNK_BYTES;
            const totalChunks = Math.ceil(length / chunkSize);

            const res: MetaRes = {
                fileId,
                length,
                filename,
                contentType,
                chunkSize,
                totalChunks,
            };
            return new MessageResponse(res);
        } catch (e) {
            return new MessageError(e);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_ARTIFACT_FILE_CHUNK)
    async getArtifactChunk(@Payload() msg: ChunkReq) {
        try {
            const fileId = msg?.fileId?.trim();
            if (!fileId) { throw new Error('fileId is required'); }

            const index = Number.isFinite(msg?.index) ? Number(msg.index) : NaN;
            if (!Number.isInteger(index) || index < 0) { throw new Error('index must be >= 0'); }

            const chunkSize = Number(msg?.chunkSize ?? ARTIFACT_CHUNK_BYTES);
            if (!Number.isFinite(chunkSize) || chunkSize <= 0) { throw new Error('invalid chunkSize'); }

            const _id = new ObjectId(fileId);
            const files = await DataBaseHelper.gridFS.find({ _id }).limit(1).toArray();
            if (!files.length) { throw new Error('File not found'); }

            const meta = files[0] as any;
            const length: number = Number(meta.length ?? 0);

            const start = index * chunkSize;
            if (start >= length) {
                return new MessageResponse<any>({ index, b64: '' });
            }
            const endExclusive = Math.min(length, start + chunkSize);

            const parts: Buffer[] = [];
            await new Promise<void>((resolve, reject) => {
                DataBaseHelper.gridFS
                    .openDownloadStream(_id, { start, end: endExclusive })
                    .on('data', (c) => parts.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
                    .on('end', resolve)
                    .on('error', reject);
            });

            const buf = Buffer.concat(parts);
            return new MessageResponse<any>({ index, b64: buf.toString('base64') });
        } catch (e) {
            return new MessageError(e);
        }
    }
}
