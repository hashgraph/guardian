import { IAuthUser } from '@guardian/common';
import { Controller, Get, HttpCode, HttpStatus, Param, Query, Response } from '@nestjs/common';
import { Permissions } from '@guardian/interfaces';
import { ApiTags, ApiOperation, ApiOkResponse, ApiInternalServerErrorResponse, ApiExtraModels, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Guardians, Users, UseCache, ONLY_SR, InternalException } from '#helpers';
import { Auth } from '#auth';
import { Examples, InternalServerErrorDTO, VpDocumentDTO, pageHeader } from '#middlewares';

@Controller('trust-chains')
@ApiTags('trust-chains')
export class TrustChainsApi {
    /**
     * Get VP Document
     */
    @Get('/')
    @Auth(
        Permissions.AUDIT_TRUST_CHAIN_READ,
        // UserRole.AUDITOR,
    )
    @ApiOperation({
        summary: 'Returns a list of all VP documents.',
        description: 'Returns a list of all VP documents.' + ONLY_SR,
    })
    @ApiQuery({
        name: 'pageIndex',
        type: Number,
        description: 'The number of pages to skip before starting to collect the result set',
        required: false,
        example: 0
    })
    @ApiQuery({
        name: 'pageSize',
        type: Number,
        description: 'The numbers of items to return',
        required: false,
        example: 20
    })
    @ApiQuery({
        name: 'policyId',
        type: String,
        description: 'Policy Id',
        required: false,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'policyOwner',
        type: String,
        description: 'Policy Owner',
        required: false,
        example: Examples.DID
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        isArray: true,
        headers: pageHeader,
        type: VpDocumentDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(VpDocumentDTO, InternalServerErrorDTO)
    @HttpCode(HttpStatus.OK)
    async getTrustChains(
        @Response() res: any,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('policyId') policyId?: string,
        @Query('policyOwner') policyOwner?: string
    ): Promise<VpDocumentDTO[]> {
        try {
            const guardians = new Guardians();
            let filters: any;
            if (policyId) {
                filters = { policyId }
            } else if (policyOwner) {
                filters = { policyOwner }
            }
            const { items, count } = await guardians.getVpDocuments({ filters, pageIndex, pageSize });
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error);
        }
    }

    /**
     * Get TrustChain
     */
    @Get('/:hash')
    @Auth(
        Permissions.AUDIT_TRUST_CHAIN_READ,
        // UserRole.AUDITOR,
    )
    @ApiOperation({
        summary: 'Builds and returns a trustchain, from the VP to the root VC document.',
        description: 'Builds and returns a trustchain, from the VP to the root VC document.' + ONLY_SR,
    })
    @ApiParam({
        name: 'hash',
        type: String,
        description: 'Hash',
        required: true,
        example: 'hash'
    })
    @ApiOkResponse({
        description: 'Successful operation.',
        schema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string'
                            },
                            type: {
                                type: 'string'
                            },
                            tag: {
                                type: 'string'
                            },
                            label: {
                                type: 'string'
                            },
                            schema: {
                                type: 'string'
                            },
                            owner: {
                                type: 'string'
                            },
                            document: {
                                type: 'object'
                            },
                        },
                        required: [
                            'id',
                            'type',
                            'tag',
                            'label',
                            'schema',
                            'owner',
                            'document'
                        ],
                    }
                },
                userMap: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            did: {
                                type: 'string'
                            },
                            username: {
                                type: 'string'
                            },
                        },
                        required: [
                            'did',
                            'username'
                        ],
                    }
                }
            },
            required: [
                'chain',
                'userMap'
            ],
        },
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO
    })
    @ApiExtraModels(InternalServerErrorDTO)
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getTrustChainByHash(
        @Param('hash') hash: string,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const chain = await guardians.getChain(hash);
            const DIDs = chain.map((item) => {
                if (item.type === 'VC' && item.document) {
                    if (typeof item.document.issuer === 'string') {
                        return item.document.issuer;
                    } else {
                        return item.document.issuer.id;
                    }
                }
                if (item.type === 'DID') {
                    return item.id;
                }
                return null;
            }).filter(did => !!did);

            const users = new Users();
            const allUsers = (await users.getUsersByIds(DIDs)) || [];
            const userMap = allUsers.map((user: IAuthUser) => {
                return { username: user.username, did: user.did }
            })

            return { chain, userMap };
        } catch (error) {
            await InternalException(error);
        }
    }
}
