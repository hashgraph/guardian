import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { IndexerMessageAPI, MessageResponse, MessageError, DataBaseHelper } from '@indexer/common';
import { ObjectId } from 'mongodb';

@Controller()
export class ArtifactsService {
    @MessagePattern(IndexerMessageAPI.GET_ARTIFACT_FILE)
    async getArtifactFile(
        @Payload() msg: { fileId: string }
    ) {
        try {
            const { fileId } = msg || {};
            if (!fileId) {
                throw new Error('fileId is required');
            }

            const _id = new ObjectId(fileId);

            const files = await DataBaseHelper.gridFS.find({ _id }).limit(1).toArray();

            if (!files.length) {
                throw new Error('File not found');
            }
            const meta = files[0] as any;

            const chunks: Buffer[] = [];
            await new Promise<void>((resolve, reject) => {
                DataBaseHelper.gridFS
                    .openDownloadStream(_id)
                    .on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
                    .on('end', resolve)
                    .on('error', reject);
            });

            return new MessageResponse({
                buffer: Buffer.concat(chunks),
                filename: meta.filename || `${fileId}.csv`,
                contentType: meta.contentType || 'text/csv; charset=utf-8',
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
}
