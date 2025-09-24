import {
    Controller,
    Get,
    Param,
    HttpCode,
    HttpStatus,
    Res,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiOkResponse,
    ApiParam,
    ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ApiClient } from '../api-client.js';
import { IndexerMessageAPI } from '@indexer/common';

type MetaRes = {
    fileId: string;
    length: number;
    filename: string;
    contentType: string;
    chunkSize: number;
    totalChunks: number;
};

type ChunkRes = { index: number; b64: string };

@Controller('artifacts')
@ApiTags('artifacts')
export class ArtifactApi extends ApiClient {
    @Get('/files/:fileId')
    @ApiOperation({ summary: 'Download file by id', description: 'Streamed via chunked NATS' })
    @ApiParam({ name: 'fileId', required: true })
    @ApiOkResponse({ description: 'Raw file contents (streamed)' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @HttpCode(HttpStatus.OK)
    async downloadFile(@Param('fileId') fileId: string, @Res() res: Response) {
        const meta = await this.send<MetaRes>(IndexerMessageAPI.GET_ARTIFACT_FILE_META, { fileId });

        res.setHeader('Content-Type', meta.contentType || 'text/csv; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${(meta.filename || `${fileId}.csv`).replace(/"/g, '')}"`
        );
        if (Number.isFinite(meta.length)) {
            res.setHeader('Content-Length', String(meta.length));
        }

        for (let i = 0; i < meta.totalChunks; i += 1) {
            const chunk = await this.send<ChunkRes>(
                IndexerMessageAPI.GET_ARTIFACT_FILE_CHUNK,
                { fileId, index: i, chunkSize: meta.chunkSize }
            );
            if (!chunk?.b64) { break; }
            res.write(Buffer.from(chunk.b64, 'base64'));
        }

        res.end();
    }
}
