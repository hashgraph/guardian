import { Controller, Get, HttpCode, HttpException, HttpStatus, Req, Response } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportService } from '../analytics/report.service';

/**
 * Analytics Api
 */
@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi {
    /**
     * Get current report
     */
    @Get('/report')
    @HttpCode(HttpStatus.OK)
    async getCurrentReport(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            const report = await ReportService.getCurrentReport();
            return res.json(report);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get all reports
     */
    @Get('/reports')
    @HttpCode(HttpStatus.OK)
    async getReports(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            const report = await ReportService.getReports();
            return res.json(report);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get report status by uuid
     */
    @Get('/reports/:uuid')
    @HttpCode(HttpStatus.OK)
    async getReport(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const report = await ReportService.getReport(req.params.uuid);
            return res.json(report);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Export report in csv
     */
    @Get('/reports/:uuid/export/csv')
    @HttpCode(HttpStatus.OK)
    async exportToCsv(@Req() req, @Response() res): Promise<any> {
        try {
            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const reports = await ReportService.csv(req.params.uuid);
            const name = `${Date.now()}`;
            const zip = await ReportService.generateCSV(reports);
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

    /**
     * Export report in xlsx
     */
    @Get('/reports/:uuid/export/xlsx')
    @HttpCode(HttpStatus.OK)
    async exportToXlsx(@Req() req, @Response() res): Promise<any> {
        try {
            if (!req.params.uuid) {
                throw new HttpException('Invalid uuid', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const reports = await ReportService.csv(req.params.uuid);
            const name = `${Date.now()}`;
            const xlsx = await ReportService.generateExcel(reports);
            xlsx.write(`${name}.xlsx`, res);
            return res;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get all dashboards(snapshots)
     */
    @Get('/dashboards')
    @HttpCode(HttpStatus.OK)
    async getDashboards(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            const dashboards = await ReportService.getDashboards();
            return res.json(dashboards);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get data by dashboard id
     */
    @Get('/dashboards/:id')
    @HttpCode(HttpStatus.OK)
    async getDashboardById(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            if (!req.params.id) {
                throw new HttpException('Invalid id', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            const dashboard = await ReportService.getDashboard(req.params.id);
            return res.json(dashboard);
        } catch (error) {
            throw error;
        }
    }
}