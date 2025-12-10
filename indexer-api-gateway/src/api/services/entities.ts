import {
    Controller,
    HttpCode,
    HttpStatus,
    Get,
    Param,
    Query,
    Post,
    Body,
} from '@nestjs/common';
import {
    ApiBody,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';
import { ApiPaginatedRequest, ApiPaginatedResponse } from '#decorators';
import {
    RegistryDTO,
    NFTDetailsDTO,
    NFTDTO,
    TokenDTO,
    TokenDetailsDTO,
    ContractDTO,
    ContractDetailsDTO,
    TopicDTO,
    VCGridDTO,
    VPGridDTO,
    DIDGridDTO,
    RoleDTO,
    SchemaGridDTO,
    ModuleDTO,
    ToolDTO,
    PolicyDTO,
    RegistryUserGridDTO,
    TopicDetailsDTO,
    VCDetailsDTO,
    VPDetailsDTO,
    DIDDetailsDTO,
    RoleDetailsDTO,
    SchemaDetailsDTO,
    ModuleDetailsDTO,
    ToolDetailsDTO,
    PolicyDetailsDTO,
    RegistryUserDetailsDTO,
    RegistryDetailsDTO,
    RelationshipsDTO,
    SchemaTreeDTO,
    InternalServerErrorDTO,
    DetailsDTO,
    UpdateFileDTO,
    StatisticDTO,
    StatisticDetailsDTO,
    LabelDTO,
    LabelDetailsDTO,
    LabelDocumentDetailsDTO,
    FormulaDetailsDTO,
    FormulaDTO,
    FormulaRelationshipsDTO,
    SchemasPackageDetailsDTO
} from '#dto';

@Controller('entities')
@ApiTags('entities')
export class EntityApi extends ApiClient {
    @ApiOperation({
        summary: 'Get file',
        description: 'Returns file',
    })
    @ApiOkResponse({
        description: 'File',
        type: String,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/ipfs/:cid')
    @ApiParam({
        name: 'cid',
        description: 'CID',
        example: 'bafybe...3w5sk3m',
    })
    @HttpCode(HttpStatus.OK)
    async loadFile(@Param('cid') cid: string) {
        return await this.send(IndexerMessageAPI.GET_IPFS_FILE, { cid });
    }

    //#region ACCOUNTS
    //#region STANDARD REGISTRIES
    @ApiOperation({
        summary: 'Get standard registries',
        description: 'Returns standard registries',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Registries', RegistryDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/registries')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search registries, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Global topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'options.did',
        description: 'Registry did',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @ApiQuery({
        name: 'options.registrantTopicId',
        description: 'Registry user topic identifier',
        example: '0.0.4481265',
        required: false,
    })
    @ApiQuery({
        name: 'options.attributes.OrganizationName',
        description: 'Registry organization name',
        example: 'Example',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getRegistries(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.did') did?: string,
        @Query('options.registrantTopicId') registrantTopicId?: string,
        @Query('options.attributes.OrganizationName') organizationName?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_REGISTRIES, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.did': did,
            'options.registrantTopicId': registrantTopicId,
            'options.attributes.OrganizationName': organizationName,
        });
    }

    @ApiOperation({
        summary: 'Get registry',
        description: 'Returns registry',
    })
    @ApiOkResponse({
        description: 'Registry details',
        type: RegistryDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/registries/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getRegistry(
        @Param('messageId') messageId: string
    ): Promise<RegistryDTO> {
        return await this.send(IndexerMessageAPI.GET_REGISTRY, {
            messageId,
        });
    }

    @ApiOperation({
        summary: 'Get registry relationships',
        description: 'Returns registry relationships',
    })
    @ApiOkResponse({
        description: 'Registry relationships',
        type: RelationshipsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/registries/:messageId/relationships')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getRegistriesRelationships(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_REGISTRY_RELATIONSHIPS, {
            messageId,
        });
    }
    //#endregion
    //#region REGISTRY USERS
    @ApiOperation({
        summary: 'Get registry users',
        description: 'Returns registry users',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Registry users', RegistryUserGridDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/registry-users')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search registry users, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'User topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getRegistryUsers(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_REGISTRY_USERS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
        });
    }

    @ApiOperation({
        summary: 'Get registry user',
        description: 'Returns registry user',
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/registry-users/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @ApiOkResponse({
        description: 'Registry user details',
        type: RegistryUserDetailsDTO,
    })
    @HttpCode(HttpStatus.OK)
    async getRegistryUser(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_REGISTRY_USER, {
            messageId,
        });
    }
    //#endregion
    //#endregion

    //#region METHODOLOGIES
    //#region POLICIES
    @ApiOperation({
        summary: 'Get policies',
        description: 'Returns policies',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Policies', PolicyDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/policies')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search policies, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Policy topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'options.owner',
        description: 'Policy owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @ApiQuery({
        name: 'analytics.tools',
        description: 'Tool',
        example: '1706823227.586179534',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getPolicies(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.owner') owner?: string,
        @Query('analytics.tools') tool?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_POLICIES, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.owner': owner,
            'analytics.tools': tool,
        });
    }

    @ApiOperation({
        summary: 'Get policy',
        description: 'Returns policy',
    })
    @ApiOkResponse({
        description: 'Policy details',
        type: PolicyDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/policies/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getPolicy(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_POLICY, {
            messageId,
        });
    }

    @ApiOperation({
        summary: 'Get policy relationships',
        description: 'Returns policy relationships',
    })
    @ApiOkResponse({
        description: 'Policy relationships',
        type: RelationshipsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/policies/:messageId/relationships')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getPolicyRelationships(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_POLICY_RELATIONSHIPS, {
            messageId,
        });
    }
    //#endregion
    //#region TOOLS
    @ApiOperation({
        summary: 'Get tools',
        description: 'Returns tools',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Tools', ToolDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/tools')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search tools, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'options.owner',
        description: 'Tool owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getTools(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('options.owner') owner?: string,
        @Query('topicId') topicId?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_TOOLS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.owner': owner,
        });
    }

    @ApiOperation({
        summary: 'Get tool',
        description: 'Returns tool',
    })
    @ApiOkResponse({
        description: 'Tool details',
        type: ToolDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/tools/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getTool(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_TOOL, {
            messageId,
        });
    }
    //#endregion
    //#region MODULES
    @ApiOperation({
        summary: 'Get modules',
        description: 'Returns modules',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Modules', ModuleDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/modules')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search modules, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'options.owner',
        description: 'Module owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getModules(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('options.owner') owner?: string,
        @Query('topicId') topicId?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_MODULES, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.owner': owner,
        });
    }

    @ApiOperation({
        summary: 'Get module',
        description: 'Returns module',
    })
    @ApiOkResponse({
        description: 'Module details',
        type: ModuleDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/modules/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getModule(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_MODULE, {
            messageId,
        });
    }
    //#endregion
    //#region SCHEMAS
    @ApiOperation({
        summary: 'Get schemas',
        description: 'Returns schemas',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Schemas', SchemaGridDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/schemas')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search schemas, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Policy topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'options.owner',
        description: 'Schema owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getSchemas(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.owner') owner?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_SCHEMAS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.owner': owner,
        });
    }

    @ApiOperation({
        summary: 'Get schema',
        description: 'Returns schema',
    })
    @ApiOkResponse({
        description: 'Schema details',
        type: SchemaDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/schemas/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getSchema(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_SCHEMA, {
            messageId,
        });
    }

    @ApiOperation({
        summary: 'Get schema tree',
        description: 'Returns schema tree',
    })
    @ApiOkResponse({
        description: 'Schema tree',
        type: SchemaTreeDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/schemas/:messageId/tree')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getSchemaTree(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_SCHEMA_TREE, {
            messageId,
        });
    }

    @ApiOperation({
        summary: 'Get schemas packages',
        description: 'Returns schemas packages',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Schemas', SchemaGridDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/schemas-packages')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search schemas packages, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Policy topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'options.owner',
        description: 'Schema owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getSchemasPackages(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.owner') owner?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_SCHEMAS_PACKAGES, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.owner': owner,
        });
    }

    @ApiOperation({
        summary: 'Get schemas package',
        description: 'Returns schemas package',
    })
    @ApiOkResponse({
        description: 'Schemas package details',
        type: SchemasPackageDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/schemas-packages/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getSchemasPackage(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_SCHEMAS_PACKAGE, {
            messageId,
        });
    }
    //#endregion
    //#region TOKENS
    @ApiOperation({
        summary: 'Get tokens',
        description: 'Returns tokens',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Tokens', TokenDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/tokens')
    @ApiQuery({
        name: 'tokenId',
        description: 'Token identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'treasury',
        description: 'Treasury',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getTokens(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('tokenId') tokenId?: string,
        @Query('treasury') treasury?: string,
        @Query('topicId') topicId?: string,
    ) {
        return await this.send(IndexerMessageAPI.GET_TOKENS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            tokenId,
            treasury,
            topicId,
        });
    }

    @ApiOperation({
        summary: 'Get token',
        description: 'Returns token',
    })
    @ApiOkResponse({
        description: 'Token details',
        type: TokenDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/tokens/:tokenId')
    @ApiParam({
        name: 'tokenId',
        description: 'Token identifier',
        example: '0.0.1960',
    })
    @HttpCode(HttpStatus.OK)
    async getToken(@Param('tokenId') tokenId: string) {
        return await this.send(IndexerMessageAPI.GET_TOKEN, {
            tokenId,
        });
    }
    //#endregion
    //#region ROLES
    @ApiOperation({
        summary: 'Get roles',
        description: 'Returns roles',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Roles', RoleDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/roles')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search roles, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'options.issuer',
        description: 'Issuer',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'analytics.policyId',
        description: 'Policy identifier',
        example: '1706823227.586179534',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getRoles(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('options.issuer') issuer?: string,
        @Query('options.role') role?: string,
        @Query('analytics.sr') sr?: string,
        @Query('topicId') topicId?: string,
        @Query('analytics.policyId') policyId?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_ROLES, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.issuer': issuer,
            'options.role': role,
            'analytics.sr': sr,
            'analytics.policyId': policyId,
        });
    }

    @ApiOperation({
        summary: 'Get role',
        description: 'Returns role',
    })
    @ApiOkResponse({
        description: 'Role details',
        type: RoleDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/roles/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getRole(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_ROLE, {
            messageId,
        });
    }
    //#endregion
    //#region STATISTICS
    @Get('/statistics')
    @ApiOperation({
        summary: 'Get statistics',
        description: 'Returns statistics',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Statistics', StatisticDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search statistics, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Statistic topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'options.owner',
        description: 'Statistic owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @ApiQuery({
        name: 'options.policy',
        description: 'Policy',
        example: '1706823227.586179534',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getStatistics(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.owner') owner?: string,
        @Query('options.policy') policy?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_STATISTICS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.owner': owner,
            'options.policy': policy,
        });
    }

    @Get('/statistics/:messageId')
    @ApiOperation({
        summary: 'Get statistic',
        description: 'Returns statistic',
    })
    @ApiOkResponse({
        description: 'Statistic details',
        type: StatisticDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getStatistic(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_STATISTIC, {
            messageId,
        });
    }

    @Get('/statistic-documents')
    @ApiOperation({
        summary: 'Get VCs',
        description: 'Returns VCs',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('VCs', VCGridDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search VCs, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'options.issuer',
        description: 'Issuer',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @ApiQuery({
        name: 'analytics.policyId',
        description: 'Policy identifier',
        example: '1706823227.586179534',
        required: false,
    })
    @ApiQuery({
        name: 'analytics.schemaId',
        description: 'Schema identifier',
        example: '1706823227.586179534',
        required: false,
    })
    @ApiQuery({
        name: 'options.relationships',
        description: 'Relationships',
        example: '1706823227.586179534',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getStatisticDocuments(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.issuer') issuer?: string,
        @Query('analytics.policyId') policyId?: string,
        @Query('analytics.schemaId') schemaId?: string,
        @Query('options.relationships') relationship?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_STATISTIC_DOCUMENTS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.issuer': issuer,
            'analytics.policyId': policyId,
            'analytics.schemaId': schemaId,
            'options.relationships': relationship,
        });
    }
    //#endregion
    //#region LABELS
    @Get('/labels')
    @ApiOperation({
        summary: 'Get labels',
        description: 'Returns labels',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Labels', LabelDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search labels, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Label topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'options.owner',
        description: 'Label owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @ApiQuery({
        name: 'options.policy',
        description: 'Policy',
        example: '1706823227.586179534',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getLabels(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.owner') owner?: string,
        @Query('options.policy') policy?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_LABELS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.owner': owner,
            'options.policy': policy,
        });
    }

    @Get('/labels/:messageId')
    @ApiOperation({
        summary: 'Get label',
        description: 'Returns label',
    })
    @ApiOkResponse({
        description: 'Label details',
        type: LabelDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getLabel(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_LABEL, {
            messageId,
        });
    }

    @Get('/label-documents/:messageId')
    @ApiOperation({
        summary: 'Get label document',
        description: 'Returns label document',
    })
    @ApiOkResponse({
        description: 'Label document details',
        type: LabelDocumentDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getLabelDocument(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_LABEL_DOCUMENT, {
            messageId,
        });
    }

    @Get('/label-documents')
    @ApiOperation({
        summary: 'Get Label Documents',
        description: 'Returns Label Documents',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Label Documents', VPGridDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search VPs, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'options.issuer',
        description: 'Issuer',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @ApiQuery({
        name: 'analytics.policyId',
        description: 'Policy identifier',
        example: '1706823227.586179534',
        required: false,
    })
    @ApiQuery({
        name: 'analytics.schemaIds',
        description: 'Schema identifier',
        example: '1706823227.586179534',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getLabelDocuments(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.issuer') issuer?: string,
        @Query('analytics.policyId') policyId?: string,
        @Query('analytics.schemaIds') schemaId?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_LABEL_DOCUMENTS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.issuer': issuer,
            'analytics.policyId': policyId,
            'analytics.schemaIds': schemaId,
        });
    }
    //#endregion

    //#region FORMULAS
    @Get('/formulas')
    @ApiOperation({
        summary: 'Get formulas',
        description: 'Returns formulas',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('formulas', FormulaDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search formulas, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Policy topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'options.owner',
        description: 'formula owner',
        example: 'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getFormulas(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.owner') owner?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_FORMULAS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.owner': owner,
        });
    }

    @Get('/formulas/:messageId')
    @ApiOperation({
        summary: 'Get formula',
        description: 'Returns formula',
    })
    @ApiOkResponse({
        description: 'Formula details',
        type: FormulaDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getFormula(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_FORMULA, {
            messageId,
        });
    }

    @Get('/formulas/:messageId/relationships')
    @ApiOperation({
        summary: 'Get formula relationships',
        description: 'Returns formula relationships',
    })
    @ApiOkResponse({
        description: 'Formula relationships',
        type: FormulaRelationshipsDTO
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getFormulaRelationships(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_FORMULA_RELATIONSHIPS, {
            messageId,
        });
    }
    //#endregion

    //#endregion

    //#region DOCUMENTS
    //#region DIDS
    @ApiOperation({
        summary: 'Get DIDs',
        description: 'Returns DIDs',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('DIDs', DIDGridDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/did-documents')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search DIDs, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'options.did',
        description: 'DID',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getDidDocuments(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.did') did?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_DID_DOCUMENTS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.did': did,
        });
    }

    @ApiOperation({
        summary: 'Get DID',
        description: 'Returns DID',
    })
    @ApiOkResponse({
        description: 'DID details',
        type: DIDDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/did-documents/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getDidDocument(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_DID_DOCUMENT, {
            messageId,
        });
    }

    @ApiOperation({
        summary: 'Get DID relationships',
        description: 'Returns DID relationships',
    })
    @ApiOkResponse({
        description: 'DID relationships',
        type: RelationshipsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/did-documents/:messageId/relationships')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getDidRelationships(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_DID_RELATIONSHIPS, {
            messageId,
        });
    }
    //#endregion
    //#region VP DOCUMENTS
    @ApiOperation({
        summary: 'Get VPs',
        description: 'Returns VPs',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('VPs', VPGridDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/vp-documents')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search VPs, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'options.issuer',
        description: 'Issuer',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @ApiQuery({
        name: 'analytics.policyId',
        description: 'Policy identifier',
        example: '1706823227.586179534',
        required: false,
    })
    @ApiQuery({
        name: 'analytics.schemaIds',
        description: 'Schema identifier',
        example: '1706823227.586179534',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getVpDocuments(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.issuer') issuer?: string,
        @Query('analytics.policyId') policyId?: string,
        @Query('analytics.schemaIds') schemaId?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_VP_DOCUMENTS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.issuer': issuer,
            'analytics.policyId': policyId,
            'analytics.schemaIds': schemaId,
        });
    }

    @ApiOperation({
        summary: 'Get VP',
        description: 'Returns VP',
    })
    @ApiOkResponse({
        description: 'VP details',
        type: VPDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/vp-documents/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getVpDocument(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_VP_DOCUMENT, {
            messageId,
        });
    }

    @ApiOperation({
        summary: 'Get VP relationships',
        description: 'Returns VP relationships',
    })
    @ApiOkResponse({
        description: 'VP relationships',
        type: RelationshipsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/vp-documents/:messageId/relationships')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getVpRelationships(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_VP_RELATIONSHIPS, {
            messageId,
        });
    }
    //#endregion
    //#region VC DOCUMENTS
    @ApiOperation({
        summary: 'Get VCs',
        description: 'Returns VCs',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('VCs', VCGridDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/vc-documents')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search VCs, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'options.issuer',
        description: 'Issuer',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
        required: false,
    })
    @ApiQuery({
        name: 'analytics.policyId',
        description: 'Policy identifier',
        example: '1706823227.586179534',
        required: false,
    })
    @ApiQuery({
        name: 'analytics.schemaId',
        description: 'Schema identifier',
        example: '1706823227.586179534',
        required: false,
    })
    @ApiQuery({
        name: 'options.relationships',
        description: 'Relationships',
        example: '1706823227.586179534',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getVcDocuments(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.issuer') issuer?: string,
        @Query('analytics.policyId') policyId?: string,
        @Query('analytics.schemaId') schemaId?: string,
        @Query('options.relationships') relationship?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_VC_DOCUMENTS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            'options.issuer': issuer,
            'analytics.policyId': policyId,
            'analytics.schemaId': schemaId,
            'options.relationships': relationship,
        });
    }

    @ApiOperation({
        summary: 'Get VC',
        description: 'Returns VC',
    })
    @ApiOkResponse({
        description: 'VC details',
        type: VCDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/vc-documents/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getVcDocument(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_VC_DOCUMENT, {
            messageId,
        });
    }

    @ApiOperation({
        summary: 'Get VC relationships',
        description: 'Returns VC relationships',
    })
    @ApiOkResponse({
        description: 'VC relationships',
        type: RelationshipsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/vc-documents/:messageId/relationships')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getVcRelationships(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_VC_RELATIONSHIPS, {
            messageId,
        });
    }

    @ApiOperation({
        summary: 'Get VC comments',
        description: 'Returns VC comments',
    })
    @ApiOkResponse({
        description: 'VC comments',
        type: RelationshipsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/vc-documents/:messageId/discussions')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getDiscussions(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_DISCUSSIONS, {
            messageId,
        });
    }

    @ApiOperation({
        summary: 'Get VC comments',
        description: 'Returns VC comments',
    })
    @ApiOkResponse({
        description: 'VC comments',
        type: RelationshipsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/vc-documents/:messageId/discussions/:discussionId/comments')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @ApiParam({
        name: 'discussionId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getVcComments(
        @Param('messageId') messageId: string,
        @Param('discussionId') discussionId: string,
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
    ) {
        return await this.send(IndexerMessageAPI.GET_COMMENTS, {
            messageId,
            discussionId,
            pageIndex,
            pageSize,
        });
    }
    //#endregion
    //#endregion

    //#region OTHERS
    //#region NFTS
    @ApiOperation({
        summary: 'Get NFTs',
        description: 'Returns NFTs',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('NFTs', NFTDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/nfts')
    @ApiQuery({
        name: 'tokenId',
        description: 'Token identifier',
        example: '0.0.1960',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getNFTs(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('tokenId') tokenId?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_NFTS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            tokenId,
        });
    }

    @ApiOperation({
        summary: 'Get NFT',
        description: 'Returns NFT',
    })
    @ApiOkResponse({
        description: 'NFT details',
        type: NFTDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/nfts/:tokenId/:serialNumber')
    @ApiParam({
        name: 'tokenId',
        description: 'Token identifier',
        example: '0.0.1960',
    })
    @ApiParam({
        name: 'serialNumber',
        description: 'Serial number',
        example: '1',
    })
    @HttpCode(HttpStatus.OK)
    async getNFT(
        @Param('tokenId') tokenId: string,
        @Param('serialNumber') serialNumber: string
    ) {
        return await this.send(IndexerMessageAPI.GET_NFT, {
            tokenId,
            serialNumber,
        });
    }
    //#endregion
    //#region TOPICS
    @ApiOperation({
        summary: 'Get topics',
        description: 'Returns topics',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Topics', TopicDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/topics')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search topics, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'options.parentId',
        description: 'Parent topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getTopics(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('options.parentId') parentId?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_TOPICS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            'options.parentId': parentId,
        });
    }

    @ApiOperation({
        summary: 'Get topic',
        description: 'Returns topic',
    })
    @ApiOkResponse({
        description: 'Topic details',
        type: TopicDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/topics/:topicId')
    @ApiParam({
        name: 'topicId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getTopic(@Param('topicId') topicId: string) {
        return await this.send(IndexerMessageAPI.GET_TOPIC, {
            topicId,
        });
    }
    //#endregion
    //#region CONTRACTS
    @ApiOperation({
        summary: 'Get contracts',
        description: 'Returns contracts',
    })
    @ApiPaginatedRequest
    @ApiPaginatedResponse('Contracts', ContractDTO)
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/contracts')
    @ApiQuery({
        name: 'keywords',
        description: 'Keywords to search',
        examples: {
            '0.0.1960': {
                description:
                    'Search contracts, which are related to specific topic identifier',
                value: '["0.0.1960"]',
            },
        },
        required: false,
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Topic identifier',
        example: '0.0.1960',
        required: false,
    })
    @ApiQuery({
        name: 'owner',
        description: 'Owner',
        example: '0.0.2160',
        required: false,
    })
    @HttpCode(HttpStatus.OK)
    async getContracts(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('owner') owner?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_CONTRACTS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
            owner
        });
    }

    @ApiOperation({
        summary: 'Get contract',
        description: 'Returns contract',
    })
    @ApiOkResponse({
        description: 'Contract details',
        type: ContractDetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO
    })
    @Get('/contracts/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @HttpCode(HttpStatus.OK)
    async getContract(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_CONTRACT, {
            messageId,
        });
    }
    //#endregion
    //#region FILES
    @Post('/update-files')
    @ApiOperation({
        summary: 'Try to load ipfs files',
        description: 'Returns ipfs files',
    })
    @ApiBody({
        description: 'Entity Timestamp',
        type: UpdateFileDTO,
    })
    @ApiOkResponse({
        description: 'ipfs files',
        type: DetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async search(@Body() body: UpdateFileDTO) {
        return await this.send(
            IndexerMessageAPI.UPDATE_FILES,
            body
        );
    }

    @Post('/unpack-schemas')
    @ApiOperation({
        summary: 'Try to unpack schemas',
        description: 'Returns schemas',
    })
    @ApiBody({
        description: 'Entity Timestamp',
        type: UpdateFileDTO,
    })
    @ApiOkResponse({
        description: 'Try to unpack schemas',
        type: DetailsDTO,
    })
    @ApiInternalServerErrorResponse({
        description: 'Internal server error',
        type: InternalServerErrorDTO,
    })
    @HttpCode(HttpStatus.OK)
    async unpackSchemas(@Body() body: UpdateFileDTO) {
        return await this.send(
            IndexerMessageAPI.UNPACK_SCHEMAS,
            body
        );
    }
    //#endregion
    //#endregion
}
