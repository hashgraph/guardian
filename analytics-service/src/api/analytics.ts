import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, Response, HttpException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportService } from '../analytics/report.service';

@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi {
    @Post('/report')
    @HttpCode(HttpStatus.OK)
    async createReport(@Body() body: any, @Req() req: any, @Response() res: any): Promise<any> {
        try {
            let report = await ReportService.create(process.env.INITIALIZATION_TOPIC_ID, body?.type);
            report = await ReportService.update(report.uuid, report.type);
            return res.json(report);
        } catch (error) {
            throw error;
        }
    }

    @Get('/report')
    @HttpCode(HttpStatus.OK)
    async getReport(@Body() body: any, @Req() req: any, @Response() res: any): Promise<any> {
        try {
            let report = await ReportService.get(process.env.INITIALIZATION_TOPIC_ID);
            return res.json(report);
        } catch (error) {
            throw error;
        }
    }

    @Post('/report/:uuid')
    @HttpCode(HttpStatus.OK)
    async updateReport(@Body() body: any, @Req() req: any, @Response() res: any): Promise<any> {
        try {
            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const report = await ReportService.update(req.params.uuid, body?.type);
            return res.json(report);
        } catch (error) {
            throw error;
        }
    }

    @Get('/report/:uuid')
    @HttpCode(HttpStatus.OK)
    async getReportData(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const report = await ReportService.report(req.params.uuid);
            return res.json(report);
        } catch (error) {
            throw error;
        }
    }
}