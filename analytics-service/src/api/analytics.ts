import { Controller, Get, HttpCode, HttpStatus, Req, Response } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('analytics')
@ApiTags('analytics')
export class AnalyticsApi {
    @Get('/users')
    @HttpCode(HttpStatus.OK)
    async getUsers(@Req() req, @Response() res): Promise<any> {
        try {
            return res.json([]);
        } catch (error) {
            throw error;
        }
    }

    @Get('/policies')
    @HttpCode(HttpStatus.OK)
    async getPolicies(@Req() req, @Response() res): Promise<any> {
        try {
            return res.json([]);
        } catch (error) {
            throw error;
        }
    }
}
