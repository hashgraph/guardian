import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PolicySchemasService } from '../services/policy-schemas.service';
import { PaginatedPolicySchemasDto, PolicySchemaQueryDto } from '../dto/policy-schema.dto';

@ApiTags('policy-schemas')
@Controller('api/v1/:network/methodologies/:id/schemas')
export class PolicySchemasController {
    constructor(private readonly policySchemasService: PolicySchemasService) {}

    @Get()
    @ApiOperation({
        summary: 'List policy schemas for a methodology',
        description:
            'Returns schema files extracted from published policy archives for the specified methodology topic ID.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({ name: 'id', description: 'Methodology/policy topic ID' })
    @ApiResponse({ status: 200, type: PaginatedPolicySchemasDto })
    @ApiResponse({ status: 404, description: 'Network not configured on this API instance' })
    async findByMethodologyId(
        @Param('network') network: string,
        @Param('id') methodologyId: string,
        @Query() query: PolicySchemaQueryDto,
    ) {
        return this.policySchemasService.findByMethodologyId(network, methodologyId, query);
    }
}
