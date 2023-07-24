import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, Response, HttpException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportServiceService } from '../analytics/report.service';
import { ReportType } from '../interfaces/report.type';

@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi {
    @Get('/reports')
    @HttpCode(HttpStatus.OK)
    async getReports(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            const report = await ReportServiceService.getReports();
            return res.json(report);
        } catch (error) {
            throw error;
        }
    }

    @Get('/reports/:uuid')
    @HttpCode(HttpStatus.OK)
    async getReport(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const report = await ReportServiceService.getReport(req.params.uuid);
            return res.json(report);
        } catch (error) {
            throw error;
        }
    }

    @Get('/reports/:uuid/export/csv')
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

    @Get('/reports/:uuid/export/xlsx')
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

    @Get('/dashboards')
    @HttpCode(HttpStatus.OK)
    async getDashboards(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            const dashboards = await ReportServiceService.getDashboards();
            return res.json(dashboards);
        } catch (error) {
            throw error;
        }
    }

    @Get('/dashboards/:id')
    @HttpCode(HttpStatus.OK)
    async getDashboardById(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            if (!req.params.id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const dashboard = await ReportServiceService.getDashboard(req.params.id);
            return res.json(dashboard);
        } catch (error) {
            throw error;
        }
    }
}