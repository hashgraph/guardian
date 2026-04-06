import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { RegistriesService } from '../services/registries.service';
import {
    RegistryQueryDto,
    RegistryResponseDto,
    PaginatedRegistriesDto,
} from '../dto/registry.dto';

@ApiTags('registries')
@Controller('api/v1/registries')
export class RegistriesController {
    constructor(private readonly registriesService: RegistriesService) {}

    @Get()
    @ApiOperation({
        summary: 'List Standard Registries',
        description: 'Returns a paginated list of Standard Registries, optionally filtered by network, DID, geography, or free-text search. Results include aggregated counts of policies, projects, and issuances.',
    })
    @ApiResponse({ status: 200, type: PaginatedRegistriesDto, description: 'Paginated list of registries' })
    async findAll(@Query() query: RegistryQueryDto) {
        return this.registriesService.findAll(query);
    }

    @Get(':did')
    @ApiOperation({
        summary: 'Get a Standard Registry by DID',
        description: 'Returns a single Standard Registry matching the given DID on the specified network.',
    })
    @ApiParam({ name: 'did', description: 'Decentralized Identifier of the registry' })
    @ApiQuery({
        name: 'network',
        required: false,
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network (default: mainnet)',
    })
    @ApiResponse({ status: 200, type: RegistryResponseDto })
    @ApiResponse({ status: 404, description: 'Registry not found' })
    async findByDid(
        @Param('did') did: string,
        @Query('network') network: string = 'mainnet',
    ): Promise<RegistryResponseDto> {
        const registry = await this.registriesService.findByDid(network, did);
        if (!registry) {
            throw new NotFoundException(`Registry with DID "${did}" not found on ${network}`);
        }
        return registry;
    }
}
