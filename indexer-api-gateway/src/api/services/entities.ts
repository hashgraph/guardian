import {
    Controller,
    HttpCode,
    HttpStatus,
    Get,
    Param,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';
import { ApiPaginatedRequest } from '../../decorators/api-paginated-request.js';
import { Page, Registry } from '@indexer/interfaces';
import {
    ApiDetailsRegistryResponse,
    ApiPaginatedRegistryResponse,
    ApiDetailsRegistryUserResponse,
    ApiPaginatedRegistryUserResponse,
    ApiDetailsPolicyResponse,
    ApiPaginatedPolicyResponse,
    ApiDetailsToolResponse,
    ApiPaginatedToolResponse,
    ApiDetailsModuleResponse,
    ApiPaginatedModuleResponse,
    ApiDetailsSchemaResponse,
    ApiPaginatedSchemaResponse,
    PageDTO,
    RegistryDTO,
} from '#dto';
import {} from 'dto/details/tool.details.js';
@Controller('entities')
@ApiTags('entities')
export class EntityApi extends ApiClient {
    //#region ACCOUNTS
    //#region STANDARD REGISTRIES
    @ApiOperation({
        summary: 'Get standard registries',
        description: 'Returns standard registries',
    })
    @ApiPaginatedRequest
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
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Global topic identifier',
        example: '0.0.1960',
    })
    @ApiQuery({
        name: 'options.did',
        description: 'Registry did',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    @ApiQuery({
        name: 'options.registrantTopicId',
        description: 'Registry user topic identifier',
        example: '0.0.4481265',
    })
    @ApiPaginatedRegistryResponse
    @Get('/registries')
    @HttpCode(HttpStatus.OK)
    async getRegistries(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string,
        @Query('options.did') did?: string,
        @Query('options.registrantTopicId') registrantTopicId?: string
    ): Promise<PageDTO<RegistryDTO>> {
        return await this.send<Page<Registry>>(
            IndexerMessageAPI.GET_REGISTRIES,
            {
                pageIndex,
                pageSize,
                orderField,
                orderDir,
                keywords,
                topicId,
                'options.did': did,
                'options.registrantTopicId': registrantTopicId,
            }
        );
    }

    @ApiOperation({
        summary: 'Get registry',
        description: 'Returns registry',
    })
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @ApiDetailsRegistryResponse
    @Get('/registries/:messageId')
    @HttpCode(HttpStatus.OK)
    async getRegistry(
        @Param('messageId') messageId: string
    ): Promise<RegistryDTO> {
        return await this.send<Registry>(IndexerMessageAPI.GET_REGISTRY, {
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
    @ApiPaginatedRegistryUserResponse
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
    })
    @ApiQuery({
        name: 'topicId',
        description: 'User topic identifier',
        example: '0.0.1960',
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
    @Get('/registry-users/:messageId')
    @ApiParam({
        name: 'messageId',
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    @ApiDetailsRegistryUserResponse
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
    @ApiPaginatedPolicyResponse
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
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Policy topic identifier',
        example: '0.0.1960',
    })
    @ApiQuery({
        name: 'options.owner',
        description: 'Policy owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    @ApiQuery({
        name: 'analytics.tools',
        description: 'Tool',
        example: '1706823227.586179534',
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
    @ApiDetailsPolicyResponse
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
    //#endregion
    //#region TOOLS
    @ApiOperation({
        summary: 'Get tools',
        description: 'Returns tools',
    })
    @ApiPaginatedRequest
    @ApiPaginatedToolResponse
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
    })
    @ApiQuery({
        name: 'options.owner',
        description: 'Tool owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Topic identifier',
        example: '0.0.1960',
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
    @ApiDetailsToolResponse
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
    @ApiPaginatedModuleResponse
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
    })
    @ApiQuery({
        name: 'options.owner',
        description: 'Module owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Topic identifier',
        example: '0.0.1960',
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
    @ApiDetailsModuleResponse
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
    @ApiPaginatedSchemaResponse
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
    })
    @ApiQuery({
        name: 'topicId',
        description: 'Policy topic identifier',
        example: '0.0.1960',
    })
    @ApiQuery({
        name: 'options.owner',
        description: 'Schema owner',
        example:
            'did:hedera:testnet:8Go53QCUXZ4nzSQMyoWovWCxseogGTMLDiHg14Fkz4VN_0.0.4481265',
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
    @ApiDetailsSchemaResponse
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

    @Get('/schemas/:messageId/tree')
    @HttpCode(HttpStatus.OK)
    async getSchemaTree(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_SCHEMA_TREE, {
            messageId,
        });
    }
    //#endregion
    //#region TOKENS
    @ApiPaginatedRequest
    @Get('/tokens')
    @HttpCode(HttpStatus.OK)
    async getTokens(
        @Query('pageIndex') pageIndex?: number,
        @Query('pageSize') pageSize?: number,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('tokenId') tokenId?: string,
        @Query('treasury') treasury?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_TOKENS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            tokenId,
            treasury,
        });
    }
    @Get('/tokens/:tokenId')
    @HttpCode(HttpStatus.OK)
    async getToken(@Param('tokenId') tokenId: string) {
        return await this.send(IndexerMessageAPI.GET_TOKEN, {
            tokenId,
        });
    }
    //#endregion
    //#region ROLES
    @ApiPaginatedRequest
    @Get('/roles')
    @HttpCode(HttpStatus.OK)
    async getRoles(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('options.issuer') issuer?: string,
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
            'analytics.policyId': policyId,
        });
    }
    @Get('/roles/:messageId')
    @HttpCode(HttpStatus.OK)
    async getRole(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_ROLE, {
            messageId,
        });
    }
    //#endregion
    //#endregion

    //#region DOCUMENTS
    //#region DIDS
    @ApiPaginatedRequest
    @Get('/did-documents')
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
    @Get('/did-documents/:messageId')
    @HttpCode(HttpStatus.OK)
    async getDidDocument(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_DID_DOCUMENT, {
            messageId,
        });
    }
    @Get('/did-documents/:messageId/relationships')
    @HttpCode(HttpStatus.OK)
    async getDidRelationships(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_DID_RELATIONSHIPS, {
            messageId,
        });
    }
    //#endregion
    //#region VP DOCUMENTS
    @ApiPaginatedRequest
    @Get('/vp-documents')
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
    @Get('/vp-documents/:messageId')
    @HttpCode(HttpStatus.OK)
    async getVpDocument(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_VP_DOCUMENT, {
            messageId,
        });
    }
    @Get('/vp-documents/:messageId/relationships')
    @HttpCode(HttpStatus.OK)
    async getVpRelationships(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_VP_RELATIONSHIPS, {
            messageId,
        });
    }
    //#endregion
    //#region VC DOCUMENTS
    @ApiPaginatedRequest
    @Get('/vc-documents')
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
    @Get('/vc-documents/:messageId')
    @HttpCode(HttpStatus.OK)
    async getVcDocument(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_VC_DOCUMENT, {
            messageId,
        });
    }
    @Get('/vc-documents/:messageId/relationships')
    @HttpCode(HttpStatus.OK)
    async getVcRelationships(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_VC_RELATIONSHIPS, {
            messageId,
        });
    }
    //#endregion
    //#endregion

    //#region OTHERS
    //#region NFTS
    @ApiPaginatedRequest
    @Get('/nfts')
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
    @Get('/nfts/:tokenId/:serialNumber')
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
    @ApiPaginatedRequest
    @Get('/topics')
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
    @Get('/topics/:topicId')
    @HttpCode(HttpStatus.OK)
    async getTopic(@Param('topicId') topicId: string) {
        return await this.send(IndexerMessageAPI.GET_TOPIC, {
            topicId,
        });
    }
    //#endregion
    //#region CONTRACTS
    @ApiPaginatedRequest
    @Get('/contracts')
    @HttpCode(HttpStatus.OK)
    async getContracts(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('orderField') orderField?: string,
        @Query('orderDir') orderDir?: string,
        @Query('keywords') keywords?: string,
        @Query('topicId') topicId?: string
    ) {
        return await this.send(IndexerMessageAPI.GET_CONTRACTS, {
            pageIndex,
            pageSize,
            orderField,
            orderDir,
            keywords,
            topicId,
        });
    }
    @Get('/contracts/:messageId')
    @HttpCode(HttpStatus.OK)
    async getContract(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_CONTRACT, {
            messageId,
        });
    }
    //#endregion
    //#endregion
}
