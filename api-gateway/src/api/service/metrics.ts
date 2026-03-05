import client from 'prom-client';
import { Controller, Get, HttpCode, HttpStatus, Response } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiInternalServerErrorResponse, ApiProduces } from '@nestjs/swagger';

@Controller('metrics')
@ApiTags('metrics')
export class MetricsApi {
    @Get('/')
    @ApiOperation({
        summary: 'Return Prometheus metrics.',
        description: 'Returns application metrics in Prometheus exposition format.',
    })
    @ApiProduces('text/plain')
    @ApiOkResponse({
        description: 'Successful operation. Returns metrics in Prometheus text format.',
        schema: {
            type: 'string',
            example: '# HELP nodejs_eventloop_lag_seconds Event loop lag in seconds.'
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        example: { result: 'ok' }
    })
    @HttpCode(HttpStatus.OK)
    async getMetrics(@Response() res) {
        res.header('Content-Type', client.register.contentType);
        return res.send(await client.register.metrics());
    }
}
