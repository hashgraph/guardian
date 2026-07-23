import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DevelopersService } from '../services/developers.service';
import {
    DeveloperQueryDto,
    PaginatedDevelopersDto,
} from '../dto/developer.dto';

@ApiTags('developers')
@Controller('api/v1/:network/developers')
export class DevelopersController {
    constructor(private readonly developersService: DevelopersService) {}

    @Get()
    @ApiOperation({
        summary: 'List Project Developers',
        description:
            'Returns a paginated list of project developers aggregated from PROJECT ' +
            'business_view rows. Each entry includes counts of projects and countries, ' +
            'distinct registries and categories, and total credits issued / retired ' +
            'across the developer\'s projects. Supports full-text search by developer ' +
            'name or country, plus sorting by name, projects, countries, totalIssued, ' +
            'totalRetired.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiResponse({ status: 200, type: PaginatedDevelopersDto })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async findAll(
        @Param('network') network: string,
        @Query() query: DeveloperQueryDto,
    ) {
        return this.developersService.findAll(network, query);
    }
}
