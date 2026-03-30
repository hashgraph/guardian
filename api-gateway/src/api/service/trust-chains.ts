import { IAuthUser, PinoLogger } from '@guardian/common';
import { Controller, Get, HttpCode, HttpStatus, Param, Query, Response } from '@nestjs/common';
import { Permissions } from '@guardian/interfaces';
import { ApiTags, ApiOperation, ApiOkResponse, ApiInternalServerErrorResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Guardians, Users, UseCache, ONLY_SR, InternalException } from '#helpers';
import { Auth, AuthUser } from '#auth';
import { Examples, InternalServerErrorDTO, ObjectExamples, VpDocumentDTO, pageHeader } from '#middlewares';

@Controller('trust-chains')
@ApiTags('trust-chains')
export class TrustChainsApi {
    constructor(private readonly logger: PinoLogger) {
    }

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
        description: 'Filter by policy database ID',
        required: false,
        example: Examples.DB_ID
    })
    @ApiQuery({
        name: 'policyOwner',
        type: String,
        description: 'Filter by policy owner DID',
        required: false,
        example: Examples.DID
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns VP documents array and total count in X-Total-Count header.',
        isArray: true,
        headers: pageHeader,
        type: VpDocumentDTO,
        examples: {
            withDocuments: {
                summary: 'VP documents found',
                value: [ObjectExamples.VP_DOCUMENT]
            },
            empty: {
                summary: 'No VP documents match the filter',
                value: []
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            default: {
                summary: 'Internal server error',
                value: { statusCode: 500, message: 'Something went wrong' }
            }
        }
    })
    @HttpCode(HttpStatus.OK)
    async getTrustChains(
        @AuthUser() user: IAuthUser,
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
            const { items, count } = await guardians.getVpDocuments(user, { filters, pageIndex, pageSize });
            return res.header('X-Total-Count', count).send(items);
        } catch (error) {
            await InternalException(error, this.logger, user.id);
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
        description: 'VP document hash used to build the trust chain',
        required: true,
        example: Examples.HASH
    })
    @ApiOkResponse({
        description: 'Successful operation. Returns the trust chain and user map.',
        schema: {
            type: 'object',
            properties: {
                chain: {
                    type: 'array',
                    description: 'Ordered array of documents forming the trust chain (from VP to root VC)',
                    items: {
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                description: 'Document ID or DID'
                            },
                            type: {
                                type: 'string',
                                description: 'Document type (VC, VP, DID)'
                            },
                            tag: {
                                type: 'string',
                                description: 'Policy block tag'
                            },
                            label: {
                                type: 'string',
                                description: 'Human-readable label'
                            },
                            schema: {
                                type: 'string',
                                description: 'Schema identifier'
                            },
                            owner: {
                                type: 'string',
                                description: 'Document owner DID'
                            },
                            document: {
                                type: 'object',
                                description: 'Raw document content'
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
                    description: 'Mapping of DIDs to usernames for all users in the trust chain',
                    items: {
                        type: 'object',
                        properties: {
                            did: {
                                type: 'string',
                                description: 'User DID'
                            },
                            username: {
                                type: 'string',
                                description: 'Username'
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
        examples: {
            default: {
                summary: 'Default example',
                value: ObjectExamples.TRUST_CHAIN
            }
        }
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error.',
        type: InternalServerErrorDTO,
        examples: {
            default: {
                summary: 'Internal server error',
                value: { statusCode: 500, message: 'Something went wrong' }
            }
        }
    })
    @UseCache()
    @HttpCode(HttpStatus.OK)
    async getTrustChainByHash(
        @AuthUser() authUser: IAuthUser,
        @Param('hash') hash: string,
    ): Promise<any> {
        try {
            const guardians = new Guardians();
            const chain = await guardians.getChain(authUser, hash);
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
            const allUsers = (await users.getUsersByIds(DIDs, authUser.id)) || [];
            const userMap = allUsers.map((user: IAuthUser) => {
                return { username: user.username, did: user.did }
            })

            return { chain, userMap };
        } catch (error) {
            await InternalException(error, this.logger, authUser.id);
        }
    }
}
