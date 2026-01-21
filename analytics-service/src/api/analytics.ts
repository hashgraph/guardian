import { Controller, Get, HttpCode, HttpException, HttpStatus, Req, Response } from '@nestjs/common';
import { ReportService } from '../analytics/report.service.js';
import {
    ApiExtraModels,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    getSchemaPath
} from '@nestjs/swagger';
import { InternalServerErrorDTO } from '../middlewares/validation/schemas/errors.js';
import { ReportDTO } from '../middlewares/validation/schemas/report.js';
import { DashboardDTO } from '../middlewares/validation/schemas/dashboard.js';
import { DataContainerDTO } from '../middlewares/validation/schemas/report-data.js';

/**
 * Analytics Api
 */
@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi {
    /**
     * Get current report
     */
    @ApiOperation({
        summary: 'Returns the status of the current report.',
        description: 'Returns the status of the current report.'
    })
    @ApiExtraModels(ReportDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(ReportDTO)
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Get('/report')
    async getCurrentReport(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            const report = await ReportService.getCurrentReport(
                ReportService.getRootTopic(),
                ReportService.getRestartDate()
            );
            return res.json(report);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update current report
     */
    @ApiOperation({
        summary: 'Update current report.',
        description: 'Update current report.'
    })
    @ApiExtraModels(ReportDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(ReportDTO)
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Get('/report/update')
    async updateReport(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            const result = await ReportService.run(
                ReportService.getRootTopic(),
                ReportService.getRestartDate()
            );
            return res.json(result);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get all reports
     */
    @ApiOperation({
        summary: 'Returns all reports.',
        description: 'Returns all reports.'
    })
    @ApiExtraModels(ReportDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'array',
            items: {
                $ref: getSchemaPath(ReportDTO)
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Get('/reports')
    async getReports(@Req() req: any, @Response() res: any): Promise<any> {
        try {
            const reports = await ReportService.getReports();
            return res.json(reports);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get report data by uuid
     */
    @ApiOperation({
        summary: 'Returns report data by report uuid.',
        description: 'Returns report data by report uuid.'
    })
    @ApiExtraModels(DataContainerDTO, InternalServerErrorDTO)
    @ApiParam({
        name: 'uuid',
        type: String,
        description: 'Report identifier',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(DataContainerDTO)
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Get('/reports/:uuid')
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
     * Export report data in csv
     */
    @ApiOperation({
        summary: 'Export report data in a csv file format.',
        description: 'Returns a csv file.'
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiParam({
        name: 'uuid',
        type: String,
        description: 'Report identifier',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'string',
            format: 'binary'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Get('/reports/:uuid/export/csv')
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
    @ApiOperation({
        summary: 'Export report data in a xlsx file format.',
        description: 'Returns a xlsx file.'
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @ApiParam({
        name: 'uuid',
        type: String,
        description: 'Report identifier',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'string',
            format: 'binary'
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Get('/reports/:uuid/export/xlsx')
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
     * Get all dashboards
     */
    @ApiOperation({
        summary: 'Returns all dashboards.',
        description: 'Returns all dashboards.'
    })
    @ApiExtraModels(DashboardDTO, InternalServerErrorDTO)
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'array',
            items: {
                $ref: getSchemaPath(DashboardDTO)
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Get('/dashboards')
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
    @ApiOperation({
        summary: 'Returns dashboard by uuid.',
        description: 'Returns dashboard by uuid.'
    })
    @ApiExtraModels(DataContainerDTO, InternalServerErrorDTO)
    @ApiParam({
        name: 'id',
        type: String,
        description: 'Dashboard identifier',
        required: true
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            $ref: getSchemaPath(DataContainerDTO)
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        schema: {
            $ref: getSchemaPath(InternalServerErrorDTO)
        }
    })
    @HttpCode(HttpStatus.OK)
    @Get('/dashboards/:id')
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
