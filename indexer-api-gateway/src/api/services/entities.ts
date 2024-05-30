import {
    Controller,
    HttpCode,
    HttpStatus,
    Get,
    Param,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IndexerMessageAPI } from '@indexer/common';
import { ApiClient } from '../api-client.js';
@Controller('entities')
@ApiTags('entities')
export class EntityApi extends ApiClient {
    //#region ACCOUNTS
    //#region STANDARD REGISTRIES
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
        });
    }

    @Get('/registries/:messageId')
    @HttpCode(HttpStatus.OK)
    async getRegistry(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_REGISTRY, {
            messageId,
        });
    }
    //#endregion
    //#region REGISTRY USERS
    @Get('/registry-users')
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
    @Get('/registry-users/:messageId')
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
    @Get('/policies')
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
    @Get('/policies/:messageId')
    @HttpCode(HttpStatus.OK)
    async getPolicy(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_POLICY, {
            messageId,
        });
    }
    //#endregion
    //#region TOOLS
    @Get('/tools')
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
    @Get('/tools/:messageId')
    @HttpCode(HttpStatus.OK)
    async getTool(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_TOOL, {
            messageId,
        });
    }
    //#endregion
    //#region MODULES
    @Get('/modules')
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
    @Get('/modules/:messageId')
    @HttpCode(HttpStatus.OK)
    async getModule(@Param('messageId') messageId: string) {
        return await this.send(IndexerMessageAPI.GET_MODULE, {
            messageId,
        });
    }
    //#endregion
    //#region SCHEMAS
    @Get('/schemas')
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
    @Get('/schemas/:messageId')
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
