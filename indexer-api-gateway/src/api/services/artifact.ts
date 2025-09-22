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

type ArtifactFileDTO = {
    buffer: Buffer | Uint8Array | string;
    filename?: string;
    contentType?: string;
};

@Controller('artifacts')
@ApiTags('artifacts')
export class ArtifactApi extends ApiClient {
    @Get('/files/:fileId')
    @ApiOperation({ summary: 'Download file by id', description: 'Returns a file from storage by id' })
    @ApiParam({ name: 'fileId', required: true, description: 'GridFS file _id' })
    @ApiOkResponse({ description: 'Raw file contents' })
    @ApiInternalServerErrorResponse({ description: 'Internal server error' })
    @HttpCode(HttpStatus.OK)
    async downloadFile(
        @Param('fileId') fileId: string,
        @Res() res: Response,
    ) {
        console.log('fileId', fileId)
        const { buffer, filename, contentType } = await this.send<ArtifactFileDTO>(
            IndexerMessageAPI.GET_ARTIFACT_FILE,
            { fileId },
        );

        res.setHeader('Content-Type', contentType || 'text/csv; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${(filename || `${fileId}.csv`).replace(/"/g, '')}"`,
        );

        const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
        res.status(HttpStatus.OK).send(data);
    }
}
