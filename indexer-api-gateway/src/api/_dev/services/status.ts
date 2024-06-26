import { Controller, HttpCode, HttpStatus, Get, Inject } from '@nestjs/common';
import { ClientProxy, EventPattern } from '@nestjs/microservices';
import { InternalServerErrorDTO } from '../../../middlewares/validation/schemas/index.js';
import {
    ApiInternalServerErrorResponse,
    ApiForbiddenResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags
} from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';

@Controller('status')
@ApiTags('status')
export class StatusApi {
    private readonly workers: Map<string, any>;
    private readonly indexers: Map<string, any>;

    constructor(@Inject('INDEXER_API') private readonly client: ClientProxy) {
        this.workers = new Map();
        this.indexers = new Map();
        setTimeout(() => {
            this.client.emit(IndexerMessageAPI.GET_INDEXER_WORKER_STATUS, '');
            this.client.emit(IndexerMessageAPI.GET_INDEXER_STATUS, '');
        })
    }

    @EventPattern(IndexerMessageAPI.INDEXER_WORKER_STATUS)
    async onWorkerStatus(data: any) {
        data.time = Date.now();
        this.workers.set(data.id, data);
    }

    @EventPattern(IndexerMessageAPI.INDEXER_STATUS)
    async onIndexerStatus(data: any) {
        data.time = Date.now();
        this.indexers.set(data.id, data);
    }

    /**
     * Get
     */
    @Get('/')
    @ApiOperation({
        summary: '.',
        description: '.'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        type: String
    })
    @ApiForbiddenResponse({
        description: 'Forbidden.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @HttpCode(HttpStatus.OK)
    async getStatus(): Promise<any> {
        const workers = [];
        const indexers = [];
        const time = Date.now();
        for (const worker of this.workers.values()) {
            if ((time - worker.time) > (worker.delay * 2)) {
                worker.status = 'SERVICE NOT AVAILABLE'
            }
            workers.push(worker);
        }
        for (const indexer of this.indexers.values()) {
            if ((time - indexer.time) > (indexer.delay * 2)) {
                indexer.status = 'SERVICE NOT AVAILABLE'
            }
            indexers.push(indexer);
        }
        return { workers, indexers };
    }
}
