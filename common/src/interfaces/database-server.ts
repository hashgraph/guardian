//entities
import { AssignedEntityType, IVC, MintTransactionStatus, PolicyTestStatus, SchemaEntity, TopicType } from '@guardian/interfaces';
import { TopicId } from '@hiero-ledger/sdk';
import { FilterQuery } from '@mikro-orm/core';
import {
    AggregateVC,
    ApprovalDocument as ApprovalDocumentCollection,
    Artifact as ArtifactCollection,
    AssignEntity,
    BlockCache,
    BlockState,
    Contract as ContractCollection,
    DidDocument as DidDocumentCollection,
    DocumentState,
    DryRun,
    ExternalDocument,
    Message,
    MintRequest,
    MintTransaction,
    MultiDocuments,
    MultiPolicy,
    MultiPolicyTransaction,
    Policy,
    PolicyCache,
    PolicyCacheData,
    PolicyCategory,
    PolicyInvitations,
    PolicyModule,
    PolicyProperty,
    PolicyRoles as PolicyRolesCollection,
    PolicyTest,
    PolicyTool,
    Record,
    RetirePool,
    Schema as SchemaCollection,
    SplitDocuments,
    SuggestionsConfig,
    Tag,
    TagCache,
    Theme,
    Token as TokenCollection,
    Topic as TopicCollection,
    VcDocument as VcDocumentCollection,
    VpDocument,
    VpDocument as VpDocumentCollection
} from '../index.js';
import { BaseEntity } from '../models/index.js';

//interfaces
import { IAuthUser, IGetDocumentAggregationFilters, IOrmConnection, STATUS_IMPLEMENTATION } from './index.js';

export interface IAddDryRunIdItem {
    dryRunId: string,
    dryRunClass: string,
    systemMode: boolean
    savepoint?: boolean
}

/**
 * Abstract database server
 */
export abstract class AbstractDatabaseServer {
    /**
     * Set MongoDriver
     * @param db
     */
    public static connectBD(db: IOrmConnection): void {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.connectBD.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Clear Dry Run table
     * @param dryRunId
     * @param all
     */
    public static clearDryRun(dryRunId: string, all: boolean): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.clearDryRun.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Current Virtual User
     * @param policyId
     *
     * @virtual
     */
    public static async getVirtualUser(policyId: string): Promise<DryRun | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getVirtualUser.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get All Virtual Users
     * @param policyId
     *
     * @virtual
     */
    public static async getVirtualUsers(policyId: string): Promise<DryRun[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getVirtualUsers.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Set Current Virtual User
     * @param policyId
     * @param did
     *
     * @virtual
     */
    public static async setVirtualUser(policyId: string, did: string): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.setVirtualUser.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Virtual Documents
     * @param policyId
     * @param type
     * @param pageIndex
     * @param pageSize
     *
     * @virtual
     */
    public static async getVirtualDocuments(policyId: string, type: string, pageIndex?: string, pageSize?: string): Promise<[DryRun[], number]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getVirtualDocuments.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save Virtual Transaction
     * @param policyId
     * @param type
     * @param operatorId
     *
     * @virtual
     */
    public static async setVirtualTransaction(policyId: string, type: string, operatorId?: string): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.setVirtualTransaction.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save Virtual File
     * @param policyId
     * @param file
     * @param url
     *
     * @virtual
     */
    public static async setVirtualFile(policyId: string, file: ArrayBuffer, url: { url: string }): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.setVirtualFile.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get VC
     * @param id
     */
    public static async getVCById(id: string): Promise<VcDocumentCollection> | null {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getVCById.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get VC
     * @param filters
     * @param options
     */
    public static async getVC(filters?: Partial<VcDocumentCollection>, options?: unknown): Promise<VcDocumentCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getVC.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get VCs
     * @param filters
     * @param options
     */
    public static async getVCs(filters?: Partial<VcDocumentCollection>, options?: Partial<VcDocumentCollection>): Promise<VcDocumentCollection[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getVCs.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get VC
     * @param id
     */
    public static async getVPById(id: string): Promise<VpDocumentCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getVPById.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get VC
     * @param filters
     * @param options
     */
    public static async getVP(filters?: Partial<VpDocumentCollection>, options?: unknown): Promise<VpDocumentCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyById.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get VCs
     * @param filters
     * @param options
     */
    public static async getVPs(filters?: Partial<VpDocumentCollection>, options?: unknown): Promise<VpDocumentCollection[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getVP.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save VC
     * @param row
     */
    public static async saveVC(row: Partial<VcDocumentCollection>): Promise<VcDocumentCollection> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.saveVC.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy
     * @param filters
     */
    public static async getPolicy(filters: Partial<Policy>): Promise<Policy | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicy.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policies
     * @param filters
     * @param options
     */
    public static async getPolicies(filters?: Partial<Policy>, options?: unknown): Promise<Policy[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicies.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policies
     * @param filters
     */
    public static async getListOfPolicies(filters?: Partial<Policy>): Promise<Policy[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getListOfPolicies.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy by id
     * @param policyId
     */
    public static async getPolicyById(policyId: string): Promise<Policy | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyById.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy by uuid
     * @param uuid
     */
    public static async getPolicyByUUID(uuid: string): Promise<Policy | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyByUUID.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy by tag
     * @param policyTag
     */
    public static async getPolicyByTag(policyTag: string): Promise<Policy | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyByTag.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy
     * @param model
     */
    public static async updatePolicy(model: Policy): Promise<Policy> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updatePolicy.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update policies
     * @param models
     */
    public static async savePolicies(models: Policy[]): Promise<Policy[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.savePolicies.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policies and count
     * @param filters
     * @param options
     */
    public static async getPoliciesAndCount(filters: Partial<Policy>, options?: unknown): Promise<[Policy[], number]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPoliciesAndCount.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy count
     * @param filters
     */
    public static async getPolicyCount(filters: Partial<Policy>): Promise<number> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyCount.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Create policy
     * @param data
     */
    public static createPolicy(data: Partial<Policy>): Policy {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createPolicy.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Delete policy
     * @param id Policy ID
     */
    public static async deletePolicy(id: string): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.deletePolicy.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get topic by id
     * @param topicId
     */
    public static async getTopicById(topicId: string): Promise<TopicCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getTopicById.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get topic by type
     * @param owner
     * @param type
     */
    public static async getTopicByType(owner: string, type: TopicType): Promise<TopicCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getTopicByType.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Publish Policies
     *
     * @virtual
     */
    public static getPublishPolicies(): Promise<Policy[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPublishPolicies.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Policy Categories
     *
     * @virtual
     */
    public static getPolicyCategories(): Promise<PolicyCategory[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyCategories.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Policy Properties
     *
     * @virtual
     */
    public static getPolicyProperties(): Promise<PolicyProperty[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyProperties.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Policies By Category and Name
     * @param {string[]} categoryIds - category ids
     * @param {string} text - part of category name
     *
     * @returns {Policy[]} - found policies
     */
    public static getFilteredPolicies(categoryIds: string[], text: string): Promise<Policy[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getFilteredPolicies.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save topic
     * @param row
     */
    public static async saveTopic(row: Partial<TopicCollection>): Promise<TopicCollection> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.saveTopic.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update topic
     * @param row
     */
    public static async updateTopic(row: TopicCollection): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updateTopic.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get schema
     * @param item
     */
    public static createSchema(item: Partial<SchemaCollection>): SchemaCollection {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createSchema.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get schema
     * @param items
     */
    public static async saveSchema(items: SchemaCollection): Promise<SchemaCollection> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.saveSchema.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get schema
     * @param item
     */
    public static async saveSchemas(item: SchemaCollection[]): Promise<SchemaCollection[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.saveSchemas.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get schema
     * @param item
     */
    public static async createAndSaveSchema(item: Partial<SchemaCollection>): Promise<SchemaCollection> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createAndSaveSchema.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get schema
     * @param filters
     * @param options
     */
    public static async getSchemasAndCount(filters?: Partial<SchemaCollection>, options?: unknown): Promise<[SchemaCollection[], number]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getSchemasAndCount.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get schema
     * @param ids
     */
    public static async getSchemasByIds(ids: string[]): Promise<SchemaCollection[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getSchemasByIds.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get schema
     * @param id
     */
    public static async getSchemaById(id: string): Promise<SchemaCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getSchemaById.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get schema
     * @param filters
     */
    public static async getSchemasCount(filters?: Partial<SchemaCollection>): Promise<number> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getSchemasCount.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get schema
     * @param topicId
     * @param entity
     */
    public static async getSchemaByType(topicId: string, entity: SchemaEntity): Promise<SchemaCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getSchemaByType.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get system schema
     * @param entity
     */
    public static async getSystemSchema(entity: SchemaEntity): Promise<SchemaCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getSystemSchema.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get schemas
     * @param filters
     * @param options
     */
    public static async getSchemas(filters?: Partial<SchemaCollection>, options?: unknown): Promise<SchemaCollection[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getSchemas.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Delete schemas
     * @param id
     */
    public static async deleteSchemas(id: string): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.deleteSchemas.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get user role in policy
     * @param policyId
     * @param did
     */
    public static async getUserRole(policyId: string, did: string): Promise<PolicyRolesCollection[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getUserRole.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update policy
     * @param policyId
     * @param data
     */
    public static async updatePolicyConfig(policyId: string, data: Policy): Promise<Policy> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updatePolicyConfig.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Create Virtual User
     * @param policyId
     * @param username
     * @param did
     * @param hederaAccountId
     * @param hederaAccountKey
     * @param active
     * @param systemMode
     *
     * @virtual
     */
    public static async createVirtualUser(
        policyId: string,
        username: string,
        did: string,
        hederaAccountId: string,
        hederaAccountKey: string,
        active: boolean,
        systemMode?: boolean
    ): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createVirtualUser.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save Virtual Message
     * @param dryRun
     * @param message
     *
     * @virtual
     */
    public static async saveVirtualMessage<T>(dryRun: string, message: Message): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.saveVirtualMessage.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Virtual Messages
     * @param dryRun
     * @param topicId
     *
     * @virtual
     */
    public static async getVirtualMessages(dryRun: string, topicId: string | TopicId): Promise<DryRun[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getVirtualMessages.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Virtual Message
     * @param dryRun
     * @param messageId
     *
     * @virtual
     */
    public static async getVirtualMessage(dryRun: string, messageId: string): Promise<DryRun | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getVirtualMessage.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get tokens
     * @param filters Filters
     * @returns Tokens
     */
    public static async getTokens(filters?: Partial<TokenCollection>): Promise<TokenCollection[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getTokens.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Token
     * @param tokenId
     */
    public static async getToken(tokenId: string): Promise<TokenCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getToken.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Token by ID
     * @param id
     */
    public static async getTokenById(id: string): Promise<TokenCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getTokenById.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Contract by ID
     * @param id
     */
    public static async getContractById(id: string): Promise<ContractCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getContractById.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Create MultiPolicyTransaction
     * @param transaction
     */
    public static async createMultiPolicyTransaction(transaction: Partial<MultiPolicyTransaction>): Promise<MultiPolicyTransaction> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createMultiPolicyTransaction.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get MultiPolicyTransaction
     * @param policyId
     * @param owner
     */
    public static async getMultiPolicyTransactions(policyId: string, owner: string): Promise<MultiPolicyTransaction[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getMultiPolicyTransactions.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get MultiPolicyTransaction count
     * @param policyId
     */
    public static async countMultiPolicyTransactions(policyId: string): Promise<number> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.countMultiPolicyTransactions.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Create createModules
     * @param module
     */
    public static async createModules(module: PolicyModule): Promise<PolicyModule> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createModules.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Modules
     * @param filters
     * @param options
     */
    public static async getModulesAndCount(filters?: Partial<PolicyModule>, options?: unknown): Promise<[PolicyModule[], number]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getModulesAndCount.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Module By UUID
     * @param uuid
     */
    public static async getModuleByUUID(uuid: string): Promise<PolicyModule | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getModuleByUUID.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Module
     * @param filters
     */
    public static async getModule(filters: Partial<PolicyModule>): Promise<PolicyModule | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getModuleByUUID.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Delete Module
     * @param module
     */
    public static async removeModule(module: PolicyModule): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.removeModule.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Modules
     * @param filters
     * @param options
     */
    public static async getModules(filters?: Partial<PolicyModule>, options?: unknown): Promise<PolicyModule[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getModules.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update Module
     * @param row
     */
    public static async updateModule(row: PolicyModule): Promise<PolicyModule> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updateModule.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Create Tool
     * @param tool
     */
    public static async createTool(tool: PolicyTool): Promise<PolicyTool> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createTool.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Tools
     * @param filters
     * @param options
     */
    public static async getToolsAndCount(filters?: PolicyTool, options?: unknown): Promise<[PolicyTool[], number]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getToolsAndCount.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Tool By UUID
     * @param uuid
     */
    public static async getToolByUUID(uuid: string): Promise<PolicyTool | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getToolByUUID.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Tool
     * @param filters
     */
    public static async getTool(filters: Partial<PolicyTool>): Promise<PolicyTool | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getTool.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Delete Tool
     * @param tool
     */
    public static async removeTool(tool: PolicyTool): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.removeTool.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Tools
     * @param filters
     * @param options
     */
    public static async getTools(filters?: Partial<PolicyTool>, options?: unknown): Promise<PolicyTool[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getTools.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update Tool
     * @param row
     */
    public static async updateTool(row: PolicyTool): Promise<PolicyTool> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updateTool.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Create tag
     * @param tag
     */
    public static async createTag(tag: Partial<Tag>): Promise<Tag> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createTag.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Delete tag
     * @param tag
     */
    public static async removeTag(tag: Tag): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.removeTag.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get tag By UUID
     * @param uuid
     */
    public static async getTagById(uuid: string): Promise<Tag | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getTagById.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get tags
     * @param filters
     * @param options
     */
    public static async getTags(filters?: Partial<Tag>, options?: unknown): Promise<Tag[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getTags.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update tag
     * @param tag
     */
    public static async updateTag(tag: Tag): Promise<Tag> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updateTag.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update tags
     * @param tags
     */
    public static async updateTags(tags: Tag[]): Promise<Tag[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updateTag.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Create tag cache
     * @param tag
     */
    public static async createTagCache(tag: Partial<TagCache>): Promise<TagCache> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createTagCache.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get tags
     * @param filters
     * @param options
     */
    public static async getTagCache(filters?: Partial<TagCache>, options?: unknown): Promise<TagCache[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getTagCache.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update tag cache
     * @param row
     */
    public static async updateTagCache(row: TagCache): Promise<TagCache> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updateTagCache.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update tags cache
     * @param rows
     */
    public static async updateTagsCache(rows: TagCache[]): Promise<TagCache[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updateTagsCache.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Create Theme
     * @param theme
     */
    public static async createTheme(theme: Partial<Theme>): Promise<Theme> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createTheme.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Theme
     * @param filters
     */
    public static async getTheme(filters: Partial<Theme>): Promise<Theme | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getTheme.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Themes
     * @param filters
     */
    public static async getThemes(filters: Partial<Theme>): Promise<Theme[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getThemes.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Delete Theme
     * @param theme
     */
    public static async removeTheme(theme: Theme): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.removeTheme.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update Theme
     * @param row
     */
    public static async updateTheme(row: Theme): Promise<Theme> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updateTheme.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save suggestions config
     * @param config
     * @returns config
     */
    public static async setSuggestionsConfig(config: Partial<SuggestionsConfig>): Promise<SuggestionsConfig> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.setSuggestionsConfig.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get suggestions config
     * @param did
     * @returns config
     */
    public static async getSuggestionsConfig(did: string): Promise<SuggestionsConfig | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.setSuggestionsConfig.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get retire pools
     * @param tokenIds Token identifiers
     * @returns Retire pools
     */
    public static async getRetirePools(tokenIds: string[]): Promise<RetirePool[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getRetirePools.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save Artifact
     * @param artifact Artifact
     * @returns Saved Artifact
     */
    public static async saveArtifact(artifact: ArtifactCollection): Promise<ArtifactCollection> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.saveArtifact.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save Artifacts
     * @param artifacts Artifacts
     * @returns Saved Artifacts
     */
    public static async saveArtifacts(artifacts: ArtifactCollection[]): Promise<ArtifactCollection[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.saveArtifact.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Artifact
     * @param filters Filters
     * @returns Artifact
     */
    public static async getArtifact(filters?: Partial<ArtifactCollection>): Promise<ArtifactCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getArtifact.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Artifacts
     * @param filters Filters
     * @param options Options
     * @returns Artifacts
     */
    public static async getArtifacts(filters?: Partial<ArtifactCollection>, options?: unknown): Promise<ArtifactCollection[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getArtifacts.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Artifacts
     * @param filters Filters
     * @param options Options
     * @returns Artifacts
     */
    public static async getArtifactsAndCount(filters?: Partial<ArtifactCollection>, options?: unknown): Promise<[ArtifactCollection[], number]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getArtifactsAndCount.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Remove Artifact
     * @param artifact Artifact
     */
    public static async removeArtifact(artifact?: ArtifactCollection): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.removeArtifact.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save Artifact File
     * @param uuid File UUID
     * @param data Data
     */
    public static async saveArtifactFile(uuid: string, data: Buffer): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.saveArtifactFile.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Artifact File By UUID
     * @param uuid File UUID
     * @returns Buffer
     */
    public static async getArtifactFileByUUID(uuid: string): Promise<Buffer> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getArtifactFileByUUID.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Multi Policy link
     * @param instanceTopicId
     * @param owner
     * @returns MultiPolicy
     */
    public static async getMultiPolicy(instanceTopicId: string, owner: string): Promise<MultiPolicy | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getArtifactFileByUUID.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Create Multi Policy object
     * @param multiPolicy
     * @returns MultiPolicy
     */
    public static createMultiPolicy(multiPolicy: MultiPolicy): MultiPolicy {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createMultiPolicy.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save Multi Policy object
     * @param multiPolicy
     * @returns multiPolicy
     */
    public static async saveMultiPolicy(multiPolicy: MultiPolicy): Promise<MultiPolicy> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.saveMultiPolicy.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Module By ID
     * @param id
     */
    public static async getModuleById(id: string): Promise<PolicyModule | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getModuleById.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Tool By ID
     * @param id
     */
    public static async getToolById(id: string): Promise<PolicyTool | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getToolById.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update MultiPolicyTransaction
     * @param item
     */
    public static async updateMultiPolicyTransactions(item: MultiPolicyTransaction): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updateMultiPolicyTransactions.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update schema
     * @param id
     * @param item
     */
    public static async updateSchema(id: string, item: SchemaCollection): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updateSchema.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update schemas
     * @param items Schemas
     */
    public static async updateSchemas(items: SchemaCollection[]): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updateSchemas.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy caches
     * @param filters Filters
     * @returns Policy caches
     */
    public static async getPolicyCaches(filters?: Partial<PolicyCache>): Promise<PolicyCache[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyCaches.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save policy cache
     * @param entity Entity
     * @returns Policy cache
     */
    public static async savePolicyCache(entity: Partial<PolicyCache>): Promise<PolicyCache> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.savePolicyCache.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy cache
     * @param filters Filters
     * @returns Policy cache
     */
    public static async getPolicyCache(filters: Partial<PolicyCache>): Promise<PolicyCache> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.savePolicyCache.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy cache data
     * @param filters Filters
     * @param options Options
     * @returns Policy cache data
     */
    public static async getPolicyCacheData(filters?: Partial<PolicyCache>, options?: PolicyCacheData): Promise<PolicyCacheData[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyCacheData.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save policy cache data
     * @param entity Policy cache data
     * @returns Policy cache data
     */
    public static async savePolicyCacheData(entity: Partial<PolicyCacheData>): Promise<PolicyCacheData> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.savePolicyCacheData.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get and count policy cache data
     * @param filters Filters
     * @param options Options
     * @returns Policy cache data and count
     */
    public static async getAndCountPolicyCacheData(filters?: Partial<PolicyCacheData>, options?: unknown): Promise<[PolicyCacheData[], number]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getAndCountPolicyCacheData.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Clear policy caches
     * @param filters Filters
     */
    public static async clearPolicyCaches(filters?: Partial<PolicyCache> | string): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.clearPolicyCaches.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Clear policy cache data
     * @param cachePolicyId Cache policy id
     */
    public static async clearPolicyCacheData(cachePolicyId: string) {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.clearPolicyCacheData.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Update VP Documents
     * @param value
     * @param filters
     * @param dryRun
     */
    public static async updateVpDocuments(value: unknown, filters: Partial<VpDocumentCollection>, dryRun?: string): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updateVpDocuments.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Create Record
     * @param record
     */
    public static async createRecord(record: Partial<Record>): Promise<Record> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createRecord.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Record
     * @param filters Filters
     * @param options Options
     * @returns Record
     */
    public static async getRecord(filters?: Partial<Record>, options?: unknown): Promise<Record[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getRecord.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Group By UUID
     * @param policyId
     * @param uuid
     *
     * @returns Group
     */
    public static async getGroupByID(policyId: string, uuid: string): Promise<PolicyRolesCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getGroupByID.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Groups By User
     * @param policyId
     * @param did
     * @param options
     *
     * @returns Groups
     */
    public static async getGroupsByUser(policyId: string, did: string, options?: unknown): Promise<PolicyRolesCollection[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getGroupsByUser.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save VCs
     * @param data
     *
     * @returns VCs
     */
    // tslint:disable-next-line:adjacent-overload-signatures
    public static async saveVCs<T extends VcDocumentCollection | VcDocumentCollection[]>(data: Partial<T>): Promise<VcDocumentCollection> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.saveVCs.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save VPs
     * @param data
     *
     * @returns VPs
     */
    public static async saveVPs<T extends VpDocumentCollection | VpDocumentCollection[]>(data: Partial<T>): Promise<VpDocumentCollection> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.saveVPs.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get Did Document
     * @param did
     */
    public static async getDidDocument(did: string): Promise<DidDocumentCollection | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getDidDocument.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Assign entity
     * @param type
     * @param entityId
     * @param assigned
     * @param did
     * @param owner
     */
    public static async assignEntity(type: AssignedEntityType, entityId: string, assigned: boolean, did: string, owner: string): Promise<AssignEntity> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.assignEntity.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Check entity
     * @param type
     * @param entityId
     * @param did
     */
    public static async getAssignedEntity(type: AssignedEntityType, entityId: string, did: string): Promise<AssignEntity | null> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getAssignedEntity.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get assigned entities
     * @param did
     * @param type
     */
    public static async getAssignedEntities(did: string, type?: AssignedEntityType): Promise<AssignEntity[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getAssignedEntities.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Remove assign entity
     * @param type
     * @param entityId
     * @param did
     * @param owner
     */
    public static async removeAssignEntity(type: AssignedEntityType, entityId: string, did: string, owner?: string): Promise<boolean> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.removeAssignEntity.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Save file
     * @param uuid
     * @param buffer
     *
     * @returns file ID
     */
    public static async saveFile(uuid: string, buffer: Buffer): Promise<unknown> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.saveFile.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Load file
     * @param id
     *
     * @returns file ID
     */
    public static async loadFile(id: unknown): Promise<Buffer> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.loadFile.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy tests
     * @param policyId
     * @returns tests
     */
    public static async getPolicyTests(policyId: string): Promise<PolicyTest[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyTests.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Assign entity
     * @param config
     * @param buffer
     */
    public static async createPolicyTest(config: { [key: string]: unknown }, buffer: Buffer): Promise<PolicyTest> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.createPolicyTest.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy test
     * @param policyId
     * @param id
     * @returns tests
     */
    public static async getPolicyTest(policyId: string, id: string): Promise<PolicyTest> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyTest.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy test
     * @param policyId
     * @param status
     * @returns tests
     */
    public static async getPolicyTestsByStatus(policyId: string, status: PolicyTestStatus): Promise<PolicyTest[]> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyTestsByStatus.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy tests
     * @param resultId
     *
     * @returns tests
     */
    public static async getPolicyTestByRecord(resultId: string): Promise<PolicyTest> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.getPolicyTestByRecord.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy tests
     * @param policyId
     * @param id
     * @returns tests
     */
    public static async deletePolicyTest(policyId: string, id: string): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.deletePolicyTest.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy tests
     * @param test
     *
     * @returns tests
     */
    public static async updatePolicyTest(test: PolicyTest): Promise<PolicyTest> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.updatePolicyTest.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy tests
     * @param policyId
     *
     * @returns tests
     */
    public static async deletePolicyTests(policyId: string): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.deletePolicyTests.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Get policy tests
     * @returns tests
     */
    public static async removePolicyTests(tests: PolicyTest[]): Promise<void> {
        throw new Error(`${AbstractDatabaseServer.name}.${AbstractDatabaseServer.removePolicyTests.name}: ${STATUS_IMPLEMENTATION.METHOD_IS_NOT_IMPLEMENTED}`);
    }

    /**
     * Set Dry Run id
     * @param id
     */
    public abstract setDryRun(id: string): void;

    /**
     * Get Dry Run id
     * @returns Dry Run id
     */
    public abstract getDryRun(): string;

    /**
     * Set System Mode
     * @param systemMode
     */
    public abstract setSystemMode(systemMode: boolean): void;

    /**
     * Clear Dry Run table
     * @param all
     */
    public abstract clear(all: boolean): Promise<void>;

    /**
     * Overriding the findOne method
     * @param entityClass
     * @param filters
     * @param options
     */
    public abstract findOne<T extends BaseEntity>(entityClass: new () => T, filters: Partial<T>, options: unknown): Promise<T>;

    /**
     * Overriding the find method
     * @param entityClass
     * @param filters
     * @param options
     */
    public abstract find<T extends BaseEntity>(entityClass: new () => T, filters: Partial<T> | unknown, options?: unknown): Promise<T[]>;

    /**
     * Overriding the create method
     * @param entityClass
     * @param item
     */
    public abstract create<T extends BaseEntity>(entityClass: new () => T, item: Partial<T>): T;

    /**
     * Overriding the update method
     * @param entityClass
     * @param criteria
     * @param row
     */
    public abstract update<T extends BaseEntity>(entityClass: new () => T, criteria: Partial<T>, row: unknown | unknown[]): Promise<T>;

    /**
     * Update many method
     * @param entityClass
     * @param entities
     * @param filter
     */
    public abstract updateMany<T extends BaseEntity>(entityClass: new () => T, entities: T[], filter: FilterQuery<T>): Promise<DryRun[] | T[]>;

    /**
     * Overriding the remove method
     * @param entityClass
     * @param entities
     */
    public abstract remove<T extends BaseEntity>(entityClass: new () => T, entities: T | T[]): Promise<void>;

    /**
     * Overriding the count method
     * @param entityClass
     * @param filters
     * @param options
     */
    public abstract count<T extends BaseEntity>(entityClass: new () => T, filters: Partial<T>, options?: unknown): Promise<number>;

    /**
     * Overriding the findAndCount method
     * @param entityClass
     * @param filters
     * @param options
     */
    public abstract findAndCount<T extends BaseEntity>(entityClass: new () => T, filters: Partial<T> | unknown, options?: unknown): Promise<[T[], number]>;

    /**
     * Overriding the findAll method
     * @param entityClass
     * @param options
     */
    public abstract findAll<T extends BaseEntity>(entityClass: new () => T, options?: unknown): Promise<T[]>;

    /**
     * Find data by aggregation
     * @param entityClass Entity class
     * @param aggregation aggregate filter
     * @returns
     */
    public abstract aggregate<T extends BaseEntity>(entityClass: new () => T, aggregation: Partial<T>[]): Promise<T[]>;

    /**
     * Overriding the save method
     * @param entityClass
     * @param item
     * @param filter
     */
    public abstract save<T extends BaseEntity>(entityClass: new () => T, item: unknown | unknown[], filter?: Partial<T>): Promise<T>

    /**
     * Save many
     * @param entityClass
     * @param item
     * @param filter
     */
    public abstract saveMany<T extends BaseEntity>(entityClass: new () => T, item: unknown[], filter?: Partial<T>): Promise<T[]>

    /**
     * Save Block State
     * @param policyId
     * @param blockId
     * @param blockTag
     * @param state
     *
     * @virtual
     */
    public abstract saveBlockState(policyId: string, blockId: string, blockTag: string, state: unknown): Promise<void>;

    /**
     * Get Block State
     * @param policyId
     * @param blockId
     * @param blockTag
     *
     * @virtual
     */
    public abstract getBlockState(policyId: string, blockId: string, blockTag: string): Promise<BlockState | null>;

    /**
     * Get block states
     * @param policyId Policy identifier
     * @returns Block states
     */
    public abstract getBlockStates(policyId: string): Promise<BlockState[]>;

    /**
     * Get Virtual User
     * @param did
     *
     * @virtual
     */
    public abstract getVirtualUser(did: string): Promise<IAuthUser | null>;

    /**
     * Get Key from Virtual User
     * @param did
     * @param keyName
     *
     * @virtual
     */
    public abstract getVirtualKey(did: string, keyName: string): Promise<string | null>;

    /**
     * Get virtual keys
     * @param filters Filters
     * @returns Virtual keys
     */
    public abstract getVirtualKeys(filters: Partial<DryRun>): Promise<DryRun[]>;

    /**
     * Set Key from Virtual User
     * @param did
     * @param keyName
     * @param key
     *
     * @virtual
     */
    public abstract setVirtualKey(did: string, keyName: string, key: string): Promise<void>;

    /**
     * Get Virtual Hedera Account
     * @param hederaAccountId
     *
     * @virtual
     */
    public abstract getVirtualHederaAccountInfo(hederaAccountId: string): Promise<DryRun>;

    /**
     * Virtual Associate Token
     * @param hederaAccountId
     * @param token
     *
     * @virtual
     */
    public abstract virtualAssociate(hederaAccountId: string, token: TokenCollection): Promise<boolean>;

    /**
     * Virtual Dissociate Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public abstract virtualDissociate(hederaAccountId: string, tokenId: string): Promise<boolean>;

    /**
     * Virtual Freeze Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public abstract virtualFreeze(hederaAccountId: string, tokenId: string): Promise<boolean>;

    /**
     * Virtual Unfreeze Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public abstract virtualUnfreeze(hederaAccountId: string, tokenId: string): Promise<boolean>;

    /**
     * Virtual GrantKyc Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public abstract virtualGrantKyc(hederaAccountId: string, tokenId: string): Promise<boolean>;

    /**
     * Virtual RevokeKyc Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public abstract virtualRevokeKyc(hederaAccountId: string, tokenId: string): Promise<boolean>;

    /**
     * Save Block State
     * @param {string} policyId - policy ID
     * @param {string} blockId - block UUID
     * @param {string} did - user DID
     * @param {string} name - variable name
     * @param {unknown} value - variable value
     * @param {boolean} isLongValue - if long value
     * @virtual
     */
    public abstract saveBlockCache(policyId: string, blockId: string, did: string, name: string, value: unknown, isLongValue: boolean): Promise<void>;

    /**
     * Get Block State
     * @param {string} policyId - policy ID
     * @param {string} blockId - block UUID
     * @param {string} did - user DID
     * @param {string} name - variable name
     *
     * @returns {BlockCache | null} - variable value
     * @virtual
     */
    public abstract getBlockCache(policyId: string, blockId: string, did: string, name: string): Promise<BlockCache | null>;

    /**
     * Save Document State
     * @param row
     *
     * @virtual
     */
    public abstract saveDocumentState(row: Partial<DocumentState>): Promise<DocumentState>;

    /**
     * Create Token
     * @param token
     * @returns
     */
    public abstract createToken(token: unknown): Promise<TokenCollection>;

    /**
     * Update Approval VC
     * @param row
     *
     * @virtual
     */
    public abstract updateApproval(row: ApprovalDocumentCollection): Promise<ApprovalDocumentCollection>;

    /**
     * Update VC
     * @param row
     *
     * @virtual
     */
    public abstract updateVC(row: VcDocumentCollection): Promise<VcDocumentCollection>;

    /**
     * Update VP
     * @param row
     *
     * @virtual
     */
    public abstract updateVP(row: VpDocumentCollection): Promise<VpDocumentCollection>;

    /**
     * Update Did
     * @param row
     *
     * @virtual
     */
    public abstract updateDid(row: DidDocumentCollection): Promise<DidDocumentCollection>;

    /**
     * Save Approval VC
     * @param row
     *
     * @virtual
     */
    public abstract saveApproval(row: Partial<ApprovalDocumentCollection>): Promise<ApprovalDocumentCollection>;

    /**
     * Save VC
     * @param row
     *
     * @virtual
     */
    public abstract saveVC(row: Partial<VcDocumentCollection>): Promise<VcDocumentCollection>;

    /**
     * Save VP
     * @param row
     *
     * @virtual
     */
    public abstract saveVP(row: Partial<VpDocumentCollection>): Promise<VpDocumentCollection>;

    /**
     * Save Did
     * @param row
     *
     * @virtual
     */
    public abstract saveDid(row: Partial<DidDocumentCollection>): Promise<DidDocumentCollection>;

    /**
     * Get Policy
     * @param policyId
     *
     * @virtual
     */
    public abstract getPolicy(policyId: string): Promise<Policy | null>;

    /**
     * Get Aggregate Documents
     * @param policyId
     * @param blockId
     * @param filters
     *
     * @virtual
     */
    public abstract getAggregateDocuments(policyId: string, blockId: string, filters: unknown): Promise<AggregateVC[]>;

    /**
     * Get aggregate document by policy identifier
     * @param policyId Policy identifier
     * @returns Aggregate documents
     */
    public abstract getAggregateDocumentsByPolicy(policyId: string): Promise<AggregateVC[]>;

    /**
     * Remove Aggregate Documents
     * @param removeMsp
     *
     * @virtual
     */
    public abstract removeAggregateDocuments(removeMsp: AggregateVC[]): Promise<void>;

    /**
     * Remove Aggregate Document
     * @param hash
     * @param blockId
     *
     * @virtual
     */
    public abstract removeAggregateDocument(hash: string, blockId: string): Promise<void>;

    /**
     * Create Aggregate Documents
     * @param item
     * @param blockId
     *
     * @virtual
     */
    public abstract createAggregateDocuments(item: VcDocumentCollection & { blockId: string }, blockId: string): Promise<void>;

    /**
     * Get Vc Document
     * @param filters
     *
     * @virtual
     */
    public abstract getVcDocument(filters: Partial<VcDocumentCollection>): Promise<VcDocumentCollection | null>;

    /**
     * Get Vp Document
     * @param filters
     *
     * @virtual
     */
    public abstract getVpDocument(filters: Partial<VpDocumentCollection>): Promise<VpDocumentCollection | null>;

    /**
     * Get Approval Document
     * @param filters
     *
     * @virtual
     */
    public abstract getApprovalDocument(filters: Partial<ApprovalDocumentCollection>): Promise<ApprovalDocumentCollection | null>;

    /**
     * Get Vc Documents
     * @param aggregation
     * @virtual
     */
    public abstract getVcDocumentsByAggregation(aggregation: Partial<VcDocumentCollection>[]): Promise<VcDocumentCollection[]>;

    /**
     * Get Vp Documents
     * @param aggregation
     * @virtual
     */
    public abstract getVpDocumentsByAggregation(aggregation: Partial<VpDocumentCollection>[]): Promise<VpDocumentCollection[]>;

    /**
     * Get Did Documents
     * @param aggregation
     * @virtual
     */
    public abstract getDidDocumentsByAggregation(aggregation: Partial<DidDocumentCollection>[]): Promise<DidDocumentCollection[]>;

    /**
     * Get Approval Documents
     * @param aggregation
     * @virtual
     */
    public abstract getApprovalDocumentsByAggregation(aggregation: Partial<DidDocumentCollection>[]): Promise<ApprovalDocumentCollection[]>;

    /**
     * Get Vc Documents
     * @param filters
     * @param options
     * @param countResult
     * @virtual
     */
    public abstract getVcDocuments<T extends VcDocumentCollection | number>(filters: Partial<T>, options?: unknown, countResult?: boolean): Promise<T[] | number>;

    /**
     * Get Vp Documents
     * @param filters
     *
     * @param options
     * @param countResult
     * @virtual
     */
    public abstract getVpDocuments<T extends VpDocumentCollection | number>(filters: Partial<T>, options?: unknown, countResult?: boolean): Promise<T[] | number>;

    /**
     * Get Did Documents
     * @param filters
     *
     * @param options
     * @param countResult
     * @virtual
     */
    public abstract getDidDocuments(filters: Partial<DidDocumentCollection>, options?: unknown, countResult?: boolean): Promise<DidDocumentCollection[] | number>;

    /**
     * Get Did Document
     * @param did
     */
    public abstract getDidDocument(did: string): Promise<DidDocumentCollection | null>;

    /**
     * Get Approval Documents
     * @param filters
     * @param options
     * @param countResult
     * @virtual
     */
    public abstract getApprovalDocuments(filters: Partial<ApprovalDocumentCollection>, options?: unknown, countResult?: boolean): Promise<ApprovalDocumentCollection[] | number>;

    /**
     * Get Document States
     * @param filters
     * @param options
     *
     * @virtual
     */
    public abstract getDocumentStates(filters: Partial<DocumentState>, options?: unknown): Promise<DocumentState[]>;

    /**
     * Get Topic
     * @param filters
     *
     * @virtual
     */
    public abstract getTopic(
        filters: {
            /**
             * policyId
             */
            policyId?: string,
            /**
             * type
             */
            type?: TopicType,
            /**
             * name
             */
            name?: string,
            /**
             * owner
             */
            owner?: string,
            /**
             * topicId
             */
            topicId?: string
        }): Promise<TopicCollection | null>;

    /**
     * Get Topics
     * @param filters
     *
     * @virtual
     */
    public abstract getTopics(
        filters: {
            /**
             * policyId
             */
            policyId?: string,
            /**
             * type
             */
            type?: TopicType,
            /**
             * name
             */
            name?: string,
            /**
             * owner
             */
            owner?: string,
            /**
             * topicId
             */
            topicId?: string
        }): Promise<TopicCollection[]>;

    /**
     * Get topic by id
     * @param topicId
     */
    public abstract getTopicById(topicId: string): Promise<TopicCollection | null>;

    /**
     * Get Token
     * @param tokenId
     * @param dryRun
     */
    public abstract getToken(tokenId: string, dryRun?: string): Promise<TokenCollection | null>;

    /**
     * Save Topic
     * @param topic
     *
     * @virtual
     */
    public abstract saveTopic(topic: TopicCollection): Promise<TopicCollection>;

    /**
     * Get schema
     * @param iri
     * @param topicId
     */
    public abstract getSchemaByIRI(iri: string, topicId?: string): Promise<SchemaCollection | null>;

    /**
     * Get schema
     * @param topicId
     * @param entity
     */
    public abstract getSchemaByType(topicId: string, entity: SchemaEntity): Promise<SchemaCollection | null>;

    /**
     * Set user in group
     *
     * @param group
     *
     * @virtual
     */
    public abstract setUserInGroup(group: unknown): Promise<PolicyRolesCollection>;

    /**
     * Set Active Group
     *
     * @param policyId
     * @param did
     * @param uuid
     *
     * @virtual
     */
    public abstract setActiveGroup(policyId: string, did: string, uuid: string): Promise<void>;

    /**
     * Get Group By UUID
     * @param policyId
     * @param uuid
     *
     * @virtual
     */
    public abstract getGroupByID(policyId: string, uuid: string): Promise<PolicyRolesCollection | null>;

    /**
     * Get Group By Name
     * @param policyId
     * @param groupName
     *
     * @virtual
     */
    public abstract getGlobalGroup(policyId: string, groupName: string): Promise<PolicyRolesCollection | null>;

    /**
     * Get User In Group
     * @param policyId
     * @param did
     * @param uuid
     *
     * @virtual
     */
    public abstract getUserInGroup(policyId: string, did: string, uuid: string): Promise<PolicyRolesCollection | null>;

    /**
     * Check User In Group
     * @param group
     *
     * @virtual
     */
    public abstract checkUserInGroup(group: { policyId: string, did: string, owner: string, uuid: string }): Promise<PolicyRolesCollection | null>;

    /**
     * Get Groups By User
     * @param policyId
     * @param did
     * @param options
     *
     * @virtual
     */
    public abstract getGroupsByUser(policyId: string, did: string, options?: unknown): Promise<PolicyRolesCollection[]>;

    /**
     * Get Active Group By User
     * @param policyId
     * @param did
     *
     * @virtual
     */
    public abstract getActiveGroupByUser(policyId: string, did: string): Promise<PolicyRolesCollection | null>;

    /**
     * Get members
     *
     * @param group
     *
     * @virtual
     */
    public abstract getAllMembersByGroup(group: PolicyRolesCollection): Promise<PolicyRolesCollection[]>;

    /**
     * Get all policy users
     * @param policyId
     *
     * @virtual
     */
    public abstract getAllPolicyUsers(policyId: string): Promise<PolicyRolesCollection[]>;

    /**
     * Get all policy users
     * @param policyId
     * @param uuid
     * @param role
     *
     * @virtual
     */
    public abstract getAllUsersByRole(policyId: string, uuid: string, role: string): Promise<PolicyRolesCollection[]>;

    /**
     * Get all policy users by role
     * @param policyId
     * @param role
     *
     * @virtual
     */
    public abstract getUsersByRole(policyId: string, role: string): Promise<PolicyRolesCollection[]>;

    /**
     * Get user roles
     * @param policyId
     * @param did
     * @returns
     *
     * @virtual
     */
    public abstract getUserRoles(policyId: string, did: string): Promise<PolicyRolesCollection[]>;

    /**
     * Delete user
     * @param group
     *
     * @virtual
     */
    public abstract deleteGroup(group: PolicyRolesCollection): Promise<void>;

    /**
     * Create invite token
     * @param policyId
     * @param uuid
     * @param owner
     * @param role
     *
     * @virtual
     */
    public abstract createInviteToken(policyId: string, uuid: string, owner: string, role: string): Promise<string>;

    /**
     * Parse invite token
     * @param policyId
     * @param invitationId
     *
     * @virtual
     */
    public abstract parseInviteToken(policyId: string, invitationId: string): Promise<PolicyInvitations | null>;

    /**
     * Get MultiSign Status by document or user
     * @param uuid
     * @param documentId
     * @param userId
     *
     * @virtual
     */
    public abstract getMultiSignStatus(uuid: string, documentId: string, userId: string): Promise<MultiDocuments>;

    /**
     * Get MultiSign Statuses
     * @param uuid
     * @param documentId
     * @param group
     *
     * @virtual
     */
    public abstract getMultiSignDocuments(uuid: string, documentId: string, group: string): Promise<MultiDocuments[]>

    /**
     * Get multi sign documents by document identifiers
     * @param documentIds Document identifiers
     * @returns Multi sign documents
     */
    public abstract getMultiSignDocumentsByDocumentIds(documentIds: string[]): Promise<MultiDocuments[]>

    /**
     * Get MultiSign Statuses by group
     * @param uuid
     * @param group
     *
     * @virtual
     */
    public abstract getMultiSignDocumentsByGroup(uuid: string, group: string): Promise<MultiDocuments[]>

    /**
     * Set MultiSign Status by document
     * @param uuid
     * @param documentId
     * @param group
     * @param status
     *
     * @virtual
     */
    public abstract setMultiSigStatus(
        uuid: string,
        policyId: string,
        documentId: string,
        group: string,
        status: string
    ): Promise<MultiDocuments>

    /**
     * Save mint request
     * @param data Mint request
     * @returns Saved mint request
     */
    public abstract saveMintRequest(data: Partial<MintRequest>): Promise<MintRequest>;

    /**
     * Create Residue object
     * @param policyId
     * @param blockId
     * @param userId
     * @param value
     * @param document
     */
    public abstract createResidue(
        policyId: string,
        blockId: string,
        userId: string,
        value: unknown,
        document: unknown
    ): SplitDocuments;

    /**
     * Get Residue objects
     * @param policyId
     * @param blockId
     * @param userId
     */
    public abstract getResidue(policyId: string, blockId: string, userId: string): Promise<SplitDocuments[]>;

    /**
     * Get External Topic
     * @param policyId
     * @param blockId
     * @param userId
     *
     * @virtual
     */
    public abstract getExternalTopic(policyId: string, blockId: string, userId: string): Promise<ExternalDocument | null>

    /**
     * Get split documents in policy
     * @param policyId Policy identifier
     * @returns Split documents
     */
    public abstract getSplitDocumentsByPolicy(policyId: string): Promise<SplitDocuments[]>

    /**
     * Set Residue objects
     * @param residue
     */
    public abstract setResidue(residue: SplitDocuments[]): Promise<void>

    /**
     * Remove Residue objects
     * @param residue
     */
    public abstract removeResidue(residue: SplitDocuments[]): Promise<void>;

    /**
     * Create tag
     * @param tag
     */
    public abstract createTag(tag: Tag): Promise<Tag>;

    /**
     * Get tags
     * @param filters
     * @param options
     */
    public abstract getTags(filters?: Partial<Tag>, options?: unknown): Promise<Tag[]>

    /**
     * Get tags
     * @param filters
     * @param options
     */
    public abstract getTagCache(filters?: Partial<TagCache>, options?: unknown): Promise<TagCache[]>

    /**
     * Delete tag
     * @param tag
     */
    public abstract removeTag(tag: Tag): Promise<void>

    /**
     * Update tag
     * @param tag
     */
    public abstract updateTag(tag: Tag): Promise<Tag>

    /**
     * Update tags
     * @param tags
     */
    public abstract updateTags(tags: Tag[]): Promise<DryRun[] | Tag[]>

    /**
     * Get tag By UUID
     * @param uuid
     */
    public abstract getTagById(uuid: string): Promise<Tag | null>

    /**
     * Create tag cache
     * @param tag
     */
    public abstract createTagCache(tag: Partial<TagCache>): Promise<TagCache>;

    /**
     * Update tag cache
     * @param row
     */
    public abstract updateTagCache(row: TagCache): Promise<TagCache>

    /**
     * Get VP mint information
     * @param vpDocument VP
     * @returns Serials and amount
     */
    public abstract getVPMintInformation(
        vpDocument: VpDocument
    ): Promise<
        [
            serials: { serial: number; tokenId: string }[],
            amount: number,
            error: string,
            wasTransferNeeded: boolean,
            transferSerials: number[],
            transferAmount: number,
            tokenIds: string[],
            target: string,
        ]
    >

    /**
     * Set MultiSign Status by user
     * @param uuid
     * @param documentId
     * @param user
     * @param status
     * @param document
     *
     * @virtual
     */
    public abstract setMultiSigDocument(
        uuid: string,
        policyId: string,
        documentId: string,
        user: { id: string, did: string, group: string, username: string },
        status: string,
        document: IVC
    ): Promise<MultiDocuments>

    /**
     * Get Active External Topic
     * @param policyId
     * @param blockId
     *
     * @virtual
     */
    public abstract getActiveExternalTopics(
        policyId: string,
        blockId: string
    ): Promise<ExternalDocument[]>

    /**
     * Create External Topic
     * @param row
     *
     * @virtual
     */
    public abstract createExternalTopic(row: unknown): Promise<ExternalDocument>

    /**
     * Update External Topic
     * @param item
     *
     * @virtual
     */
    public abstract updateExternalTopic(item: ExternalDocument): Promise<ExternalDocument>

    /**
     * get document aggregation filters for analytics
     * @param nameFilterMap
     * @param nameFilterAttributes
     * @param existingAttributes
     *
     * @returns Result
     */
    public abstract getAttributesAggregationFilters(nameFilterMap: string, nameFilterAttributes: string, existingAttributes: string[] | []): unknown[]

    /**
     * get tasks aggregation filters
     * @param nameFilter
     * @param processTimeout
     *
     * @returns Result
     */
    public abstract getTasksAggregationFilters(nameFilter: string, processTimeout: number): unknown[]

    /**
     * get document aggregation filters
     * @param props
     *
     * @returns Result
     */
    public abstract getDocumentAggregationFilters(props: IGetDocumentAggregationFilters): void

    /**
     * get document aggregation filters for analytics
     * @param nameFilter
     * @param uuid
     *
     * @returns Result
     */
    public abstract getAnalyticsDocAggregationFilters(nameFilter: string, uuid: string): unknown[]

    /**
     * Create Virtual User
     * @param policyId
     * @param username
     * @param did
     * @param hederaAccountId
     * @param hederaAccountKey
     * @param active
     *
     * @virtual
     */
    public abstract createVirtualUser(username: string, did: string, hederaAccountId: string, hederaAccountKey: string, active: boolean): Promise<void>

    /**
     * Save mint transaction
     * @param transaction Transaction
     * @returns Saved transaction
     */
    public abstract saveMintTransaction(transaction: Partial<MintTransaction>): Promise<MintTransaction>

    /**
     * Get mint transactions
     * @param filters Filters
     * @param options Options
     * @returns Mint transactions
     */
    public abstract getMintTransactions(filters: Partial<MintTransaction>, options?: unknown): Promise<MintTransaction[]>

    /**
     * Get mint transactions
     * @param filters Filters
     * @returns Mint transaction
     */
    public abstract getMintTransaction(filters: Partial<MintTransaction>): Promise<MintTransaction>

    /**
     * Get transactions serials count
     * @param mintRequestId Mint request identifier
     * @param transferStatus Transfer status
     *
     * @returns Serials count
     */
    public abstract getTransactionsSerialsCount(mintRequestId: string, transferStatus?: MintTransactionStatus | unknown): Promise<number>

    /**
     * Get transactions count
     * @param filters Mint request identifier
     * @returns Transactions count
     */
    public abstract getTransactionsCount(filters: Partial<MintTransaction>): Promise<number>

    /**
     * Get mint request minted serials
     * @param mintRequestId Mint request identifier
     * @returns Serials
     */
    public abstract getMintRequestSerials(mintRequestId: string): Promise<number[]>

    /**
     * Get transactions serials
     * @param mintRequestId Mint request identifier
     * @param transferStatus Transfer status
     *
     * @returns Serials
     */
    public abstract getTransactionsSerials(mintRequestId: string, transferStatus?: MintTransactionStatus | unknown): Promise<number[]>

    /**
     * Create mint transactions
     * @param transaction Transaction
     * @param amount Amount
     */
    public abstract createMintTransactions(transaction: Partial<MintTransaction>, amount: number): Promise<void>

    /**
     * Get mint request transfer serials
     * @param mintRequestId Mint request identifier
     * @returns Serials
     */
    public abstract getMintRequestTransferSerials(mintRequestId: string): Promise<number[]>

    /**
     * Overriding the create method
     * @param entityClass
     * @param filters
     */
    public abstract deleteEntity<T extends BaseEntity>(entityClass: new () => T, filters: Partial<T> | unknown): Promise<number>
}
