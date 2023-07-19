import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, Response, HttpException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportServiceService } from '../analytics/report.service';
import { ReportType } from '../interfaces/report.type';

@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi {
    @Post('/report')
    @HttpCode(HttpStatus.OK)
    async createReport(@Body() body: any, @Req() req: any, @Response() res: any): Promise<any> {
        try {
            const type = body?.type;
            // const type = ReportType.TOKENS;
            let report = await ReportServiceService.create(process.env.INITIALIZATION_TOPIC_ID, type);
            report = await ReportServiceService.update(report.uuid, report.type);
            return res.json(report);
        } catch (error) {
            throw error;
        }
    }

    @Get('/report')
    @HttpCode(HttpStatus.OK)
    async getReport(@Body() body: any, @Req() req: any, @Response() res: any): Promise<any> {
        try {
            let report = await ReportServiceService.get(process.env.INITIALIZATION_TOPIC_ID);
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
            const type = body?.type;
            const report = await ReportServiceService.update(req.params.uuid, type);
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
            const report = await ReportServiceService.report(req.params.uuid);
            return res.json(report);
        } catch (error) {
            throw error;
        }
    }

    @Get('/report/:uuid/export/csv')
    @HttpCode(HttpStatus.OK)
    async exportToCsv(@Req() req, @Response() res): Promise<any> {
        try {

            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const reports = await ReportServiceService.csv(req.params.uuid);
            const name = `${Date.now()}`;
            const zip = await ReportServiceService.generateCSV(reports);
            const arcStream = zip.generateNodeStream({
                type: 'nodebuffer',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 3
                }
            });
            res.setHeader('Content-disposition', `attachment; filename=${name}`);
            res.setHeader('Content-type', 'application/zip');
            arcStream.pipe(res);
            return res;
        } catch (error) {
            throw error;
        }
    }

    @Get('/report/:uuid/export/xlsx')
    @HttpCode(HttpStatus.OK)
    async exportToXlsx(@Req() req, @Response() res): Promise<any> {
        try {
            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const reports = await ReportServiceService.csv(req.params.uuid);
            const name = `${Date.now()}`;
            const xlsx = await ReportServiceService.generateExcel(reports);
            xlsx.write(`${name}.xlsx`, res);
            return res;
        } catch (error) {
            throw error;
        }
    }
}