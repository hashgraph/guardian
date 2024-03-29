import { Body, Controller, HttpCode, HttpException, HttpStatus, Get, Param, Inject } from '@nestjs/common';
import { ClientProxy, EventPattern, MessagePattern } from '@nestjs/microservices';
import { InternalServerErrorDTO } from '../../middlewares/validation/schemas/index.js';
import {
    ApiInternalServerErrorResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiSecurity,
    ApiTags
} from '@nestjs/swagger';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator.js';
import { firstValueFrom, timeout } from 'rxjs';
import { IndexerMessageAPI } from '@indexer/common';

@Controller('status')
@ApiTags('status')
export class StatusApi {
    private readonly status: {
        workers: Map<string, any>;
    };
    constructor(@Inject('INDEXER_API') private readonly client: ClientProxy) {
        this.status = {
            workers: new Map()
        }
        setTimeout(() => {
            this.client.emit(IndexerMessageAPI.GET_INDEXER_WORKER_STATUS, '');
        })
    }

    @EventPattern(IndexerMessageAPI.INDEXER_WORKER_STATUS)
    async onWorkerStatus(data: any) {
        data.time = Date.now();
        this.status.workers.set(data.id, data);
    }

    /**
     * Get
     */
    @Get('/workers')
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
        const statuses = [];
        const time = Date.now();
        for (const worker of this.status.workers.values()) {
            if (time - worker.time > 2 * worker.delay) {
                worker.status = 'SERVICE NOT AVAILABLE'
            }
            statuses.push(worker);
        }
        return statuses;
    }
}
