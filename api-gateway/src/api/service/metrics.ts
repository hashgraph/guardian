import client from 'prom-client';
import { Controller, Get, HttpCode, HttpStatus, Response } from '@nestjs/common';

@Controller('metrics')
export class MetricsApi {
    @Get('/')
    @HttpCode(HttpStatus.OK)
    async getMetrics(@Response() res) {
        res.set('Content-Type', client.register.contentType);
        return res.send(await client.register.metrics());
    }
}
