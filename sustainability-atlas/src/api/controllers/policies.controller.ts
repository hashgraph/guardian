import { Controller, Post, Param, Query } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
} from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PoliciesService } from '../services/policies.service';
import { AdminWrite } from '../auth/decorators/admin-write.decorator';

class RedecodeQueryDto {
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    forceRedownload?: boolean;
}

@ApiTags('policies')
@Controller('api/v1/:network/policies')
export class PoliciesController {
    constructor(private readonly policiesService: PoliciesService) {}

    @AdminWrite()
    @Post(':topicId/redecode')
    @ApiOperation({
        summary: 'Re-decode a policy by topic ID',
        description:
            'Resets the decode state for the policy (decodeStatus=pending, attempts=0, ' +
            'policyMapping=null, schemaFields=null) and enqueues a fresh policy-decode job ' +
            'for the latest stored sourceCid. ' +
            'Pass ?forceRedownload=true to delete the cached zip from local storage first, ' +
            'forcing the processor to re-download from IPFS. ' +
            'Manual policyMapping edits are lost — use /reparse-projects to replay VCs ' +
            'against the existing mapping without overwriting it.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({ name: 'topicId', description: 'Hedera policy topic ID (policyTopicId)' })
    @ApiQuery({
        name: 'forceRedownload',
        required: false,
        type: Boolean,
        description: 'When true, deletes the cached zip before re-decoding',
    })
    @ApiResponse({
        status: 202,
        description: 'Redecode job enqueued',
        schema: {
            type: 'object',
            properties: {
                enqueued:  { type: 'boolean' },
                jobId:     { type: 'string' },
                sourceCid: { type: 'string' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'No policy row found for the given topicId' })
    async redecode(
        @Param('network') network: string,
        @Param('topicId') topicId: string,
        @Query() query: RedecodeQueryDto,
    ): Promise<{ enqueued: boolean; jobId: string; sourceCid: string }> {
        return this.policiesService.redecodePolicy(
            network,
            topicId,
            query.forceRedownload === true,
        );
    }

    @AdminWrite()
    @Post(':topicId/reparse-projects')
    @ApiOperation({
        summary: 'Re-parse projects for all VCs linked to a policy topic',
        description:
            'Enqueues one PROJECT_REPARSE job per VC-Document that has been fetched ' +
            '(documents IS NOT NULL) and is linked to any policy version under this ' +
            'policyTopicId. Uses the current policyMapping so manual edits are preserved. ' +
            'Returns 202 with the count of jobs enqueued. Returns { enqueued: 0 } when ' +
            'no decoded policy rows exist for this topic.',
    })
    @ApiParam({
        name: 'network',
        enum: ['mainnet', 'testnet', 'previewnet'],
        description: 'Hedera network',
    })
    @ApiParam({ name: 'topicId', description: 'Hedera policy topic ID (policyTopicId)' })
    @ApiResponse({
        status: 202,
        description: 'Reparse jobs enqueued',
        schema: {
            type: 'object',
            properties: {
                enqueued: { type: 'number', description: 'Number of PROJECT_REPARSE jobs enqueued' },
            },
        },
    })
    async reparseProjects(
        @Param('network') network: string,
        @Param('topicId') topicId: string,
    ): Promise<{ enqueued: number }> {
        return this.policiesService.reparseProjects(network, topicId);
    }
}
