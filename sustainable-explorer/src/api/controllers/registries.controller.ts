import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RegistriesService } from '../services/registries.service';
import {
    RegistryQueryDto,
    RegistryResponseDto,
    PaginatedRegistriesDto,
} from '../dto/registry.dto';

@ApiTags('registries')
@Controller('api/v1/:network/registries')
export class RegistriesController {
    constructor(private readonly registriesService: RegistriesService) {}

    @Get()
    @ApiOperation({
        summary: 'List Standard Registries',
        description:
            'Returns a paginated list of Standard Registries for the specified network. ' +
            'Supports full-text search, filtering, sorting, and aggregated stats.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiResponse({ status: 200, type: PaginatedRegistriesDto })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async findAll(
        @Param('network') network: string,
        @Query() query: RegistryQueryDto,
    ) {
        return this.registriesService.findAll(network, query);
    }

    @Get(':did')
    @ApiOperation({
        summary: 'Get a Standard Registry by DID',
        description: 'Returns a single Standard Registry matching the given DID on the specified network.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({ name: 'did', description: 'Decentralized Identifier of the registry' })
    @ApiResponse({ status: 200, type: RegistryResponseDto })
    @ApiResponse({ status: 404, description: 'Registry not found' })
    async findByDid(
        @Param('network') network: string,
        @Param('did') did: string,
    ): Promise<RegistryResponseDto> {
        const registry = await this.registriesService.findByDid(network, did);
        if (!registry) {
            throw new NotFoundException(`Registry with DID "${did}" not found on ${network}`);
        }
        return registry;
    }
}
