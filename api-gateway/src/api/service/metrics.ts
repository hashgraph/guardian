import client from 'prom-client';
import { Controller, Get, HttpCode, HttpStatus, Response } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('metrics')
@ApiTags('metrics')
export class MetricsApi {
    @Get('/')
    @HttpCode(HttpStatus.OK)
    async getMetrics(@Response() res) {
        res.header('Content-Type', client.register.contentType);
        return res.send(await client.register.metrics());
    }
}
