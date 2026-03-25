import { Auth, AuthUser } from '#auth';
import { PREFIXES } from '#constants';
import { CacheService, EntityOwner, getCacheKey, InternalException, PolicyEngine } from '#helpers';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { Permissions } from '@guardian/interfaces';
import {
    All,
    Body,
    Controller,
    HttpCode,
    HttpException,
    HttpStatus,
    Param,
    Query,
    Req,
} from '@nestjs/common';
import {
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { InternalServerErrorDTO } from '#middlewares';

@Controller('dmrv')
@ApiTags('dmrv')
export class DmrvApi {
    constructor(
        private readonly cacheService: CacheService,
        private readonly logger: PinoLogger
    ) {}

    /**
     * DMRV proxy: resolves alias to block and forwards request
     */
    @All('/:policyId/:alias')
    @Auth(
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_POLICY_MANAGE,
    )
    @ApiOperation({
        summary: 'DMRV proxy endpoint.',
        description: 'Resolves a human-readable alias to a policy block and proxies the request.',
    })
    @ApiParam({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: true,
    })
    @ApiParam({
        name: 'alias',
        type: String,
        description: 'Human-readable alias for the block endpoint',
        required: true,
    })
    @ApiOkResponse({
        description: 'Proxied response from the block.',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async proxyByAlias(
        @AuthUser() user: IAuthUser,
        @Param('policyId') policyId: string,
        @Param('alias') alias: string,
        @Query() query: any,
        @Body() body: any,
        @Req() req: any
    ): Promise<any> {
        try {
            const engineService = new PolicyEngine();
            const policy = await engineService.getPolicy(
                { filters: policyId, userDid: user.did },
                new EntityOwner(user)
            );
            if (!policy) {
                throw new HttpException('Policy does not exist.', HttpStatus.NOT_FOUND);
            }

            const docs = policy.policyDocumentation || [];
            const method = req.method.toUpperCase();
            const entry = docs.find(
                (d: any) => d.alias === alias && d.method === method
            );
            if (!entry) {
                throw new HttpException(
                    `No documented endpoint with alias "${alias}" and method ${method}.`,
                    HttpStatus.NOT_FOUND
                );
            }

            const tagName = entry.target;

            if (method === 'POST') {
                const invalidedCacheTags = [
                    `${PREFIXES.POLICIES}${policyId}/navigation`,
                    `${PREFIXES.POLICIES}${policyId}/groups`,
                ];
                await this.cacheService.invalidate(
                    getCacheKey([req.url, ...invalidedCacheTags], user)
                );
                return await engineService.setBlockDataByTag(
                    user, policyId, tagName, body, false, false, 60000, true
                );
            } else {
                return await engineService.getBlockByTagName(
                    user, policyId, tagName
                );
            }
        } catch (error) {
            await InternalException(error, this.logger, user.id);
        }
    }
}
