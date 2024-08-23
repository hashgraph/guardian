//entities
import { BaseEntity } from '../models/index.js';
import { IAuthUser, IGetDocumentAggregationFilters, IOrmConnection } from './index.js';
import {
    AggregateVC,
    ApprovalDocument as ApprovalDocumentCollection,
    Artifact as ArtifactCollection,
    ArtifactChunk as ArtifactChunkCollection,
    BlockCache,
    BlockState,
    Contract as ContractCollection,
    DidDocument as DidDocumentCollection,
    DocumentState,
    DryRun,
    DryRunFiles,
    ExternalDocument,
    MintRequest,
    MintTransaction,
    MultiDocuments,
    MultiPolicy,
    MultiPolicyTransaction,
    Policy,
    PolicyCategory,
    PolicyInvitations,
    PolicyModule,
    PolicyRoles as PolicyRolesCollection,
    Record,
    Schema as SchemaCollection,
    SplitDocuments,
    SuggestionsConfig,
    Tag,
    TagCache,
    Token as TokenCollection,
    Topic as TopicCollection,
    VcDocument as VcDocumentCollection,
    VpDocument,
    VpDocument as VpDocumentCollection,
    PolicyCache,
    PolicyCacheData,
    RetirePool,
    AssignEntity,
    PolicyTest,
    Artifact, Message, PolicyProperty, DataBaseHelper, PolicyTool,
} from '../index.js';
import { IVC, SchemaEntity, TopicType } from '@guardian/interfaces';
import { TopicId } from '@hashgraph/sdk';

export interface IAddDryRunIdItem {
    dryRunId: string,
    dryRunClass: string,
    systemMode: boolean
}

/**
 * Abstract database server
 */
export abstract class AbstractDatabaseServer {
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
    public abstract update<T extends BaseEntity>(entityClass: new () => T, criteria: Partial<T>, row: unknown): Promise<T>;

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
    public abstract count<T extends BaseEntity>(entityClass: new () => T, filters:  Partial<T>, options?: unknown): Promise<number>;

    /**
     * Overriding the findAndCount method
     * @param entityClass
     * @param filters
     * @param options
     */
    public abstract findAndCount<T extends BaseEntity>(entityClass: new () => T, filters:  Partial<T> | unknown, options?: unknown): Promise<[T[], number]>;

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
     * Set MongoDriver
     * @param db
     */
    public static connectBD(db: IOrmConnection): void {
        throw new Error('Method not implemented.');
    }

    /**
     * Clear Dry Run table
     * @param all
     */
    public abstract clear(all: boolean): Promise<void>;

    /**
     * Clear Dry Run table
     * @param dryRunId
     * @param all
     */
    public static clearDryRun(dryRunId: string, all: boolean): Promise<void> {
        throw new Error('Method not implemented.');
    }

    /**
     * Save Block State
     * @param policyId
     * @param uuid
     * @param state
     *
     * @virtual
     */
    public abstract saveBlockState(policyId: string, uuid: string, state: unknown): Promise<void>;

    /**
     * Get Block State
     * @param policyId
     * @param uuid
     *
     * @virtual
     */
    public abstract getBlockState(policyId: string, uuid: string): Promise<BlockState | null>;

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
     * Get Current Virtual User
     * @param policyId
     *
     * @virtual
     */
    public static async getVirtualUser(policyId: string): Promise<DryRun | null> {
        throw new Error('Method not implemented.');
    }

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
     * Get Publish Policies
     *
     * @virtual
     */
    public static getPublishPolicies(): Promise<Policy[]> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get Policy Categories
     *
     * @virtual
     */
    public static getPolicyCategories(): Promise<PolicyCategory[]> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get Policy Properties
     *
     * @virtual
     */
    public static getPolicyProperties(): Promise<PolicyProperty[]> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get Policies By Category and Name
     * @param {string[]} categoryIds - category ids
     * @param {string} text - part of category name
     *
     * @returns {Policy[]} - found policies
     */
    public static getFilteredPolicies(categoryIds: string[], text: string): Promise<Policy[]> {
        throw new Error('Method not implemented.');
    }

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

    public abstract getTopic(filters: { policyId?: string, type?: TopicType, name?: string, owner?: string, topicId?: string }): Promise<TopicCollection | null>;
    public abstract getTopics(filters: { policyId?: string, type?: TopicType, name?: string, owner?: string, topicId?: string }): Promise<TopicCollection[]>;
    public abstract getTopicById(topicId: string): Promise<TopicCollection | null>;
    public abstract getToken(tokenId: string, dryRun?: string): Promise<TokenCollection | null>;
    public abstract saveTopic(topic: TopicCollection): Promise<TopicCollection>;

    public abstract getSchemaByIRI(iri: string, topicId?: string): Promise<SchemaCollection | null>;
    public abstract getSchemaByType(topicId: string, entity: SchemaEntity): Promise<SchemaCollection | null>;

    public abstract setUserInGroup(group: unknown): Promise<PolicyRolesCollection>;
    public abstract setActiveGroup(policyId: string, did: string, uuid: string): Promise<void>;
    public abstract getGroupByID(policyId: string, uuid: string): Promise<PolicyRolesCollection | null>;
    public abstract getGlobalGroup(policyId: string, groupName: string): Promise<PolicyRolesCollection | null>;
    public abstract getUserInGroup(policyId: string, did: string, uuid: string): Promise<PolicyRolesCollection | null>;
    public abstract checkUserInGroup(group: { policyId: string, did: string, owner: string, uuid: string }): Promise<PolicyRolesCollection | null>;
    public abstract getGroupsByUser(policyId: string, did: string, options?: unknown): Promise<PolicyRolesCollection[]>;
    public abstract getActiveGroupByUser(policyId: string, did: string): Promise<PolicyRolesCollection | null>;
    public abstract getAllMembersByGroup(group: PolicyRolesCollection): Promise<PolicyRolesCollection[]>;
    public abstract getAllPolicyUsers(policyId: string): Promise<PolicyRolesCollection[]>;
    public abstract getAllUsersByRole(policyId: string, uuid: string, role: string): Promise<PolicyRolesCollection[]>;
    public abstract getUsersByRole(policyId: string, role: string): Promise<PolicyRolesCollection[]>;
    public abstract getUserRoles(policyId: string, did: string): Promise<PolicyRolesCollection[]>;
    public abstract deleteGroup(group: PolicyRolesCollection): Promise<void>;
    public abstract createInviteToken(policyId: string, uuid: string, owner: string, role: string): Promise<string>;
    public abstract parseInviteToken(policyId: string, invitationId: string): Promise<PolicyInvitations | null>;

    public abstract getMultiSignStatus(uuid: string, documentId: string, userId: string): Promise<MultiDocuments>;

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
    public abstract getResidue(
        policyId: string,
        blockId: string,
        userId: string
    ): Promise<SplitDocuments[]>;

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
     * Create tag cache
     * @param tag
     */
    public abstract createTagCache(tag: Partial<TagCache>): Promise<TagCache>;

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
            tokenIds: string[]
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
        throw new Error('Method not implemented.');
    }

    /**
     * Save Virtual Message
     * @param dryRun
     * @param message
     *
     * @virtual
     */
    public static async saveVirtualMessage<T>(dryRun: string, message: Message): Promise<void> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get Virtual Messages
     * @param dryRun
     * @param topicId
     *
     * @virtual
     */
    public static async getVirtualMessages(dryRun: string, topicId: string | TopicId): Promise<DryRun[]> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get Virtual Message
     * @param dryRun
     * @param messageId
     *
     * @virtual
     */
    public static async getVirtualMessage(dryRun: string, messageId: string): Promise<DryRun | null> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get tokens
     * @param filters Filters
     * @returns Tokens
     */
    public static async getTokens(filters?: Partial<TokenCollection>): Promise<TokenCollection[]> {
        throw new Error('Method not implemented.');
    }

    /**
     * Save Artifact
     * @param artifact Artifact
     * @returns Saved Artifact
     */
    public static async saveArtifact(artifact: ArtifactCollection): Promise<ArtifactCollection> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get Artifact
     * @param filters Filters
     * @returns Artifact
     */
    public static async getArtifact(filters?: Partial<ArtifactCollection>): Promise<ArtifactCollection | null> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get Artifacts
     * @param filters Filters
     * @param options Options
     * @returns Artifacts
     */
    public static async getArtifacts(filters?: Partial<ArtifactCollection>, options?: unknown): Promise<ArtifactCollection[]> {
        throw new Error('Method not implemented.');
    }

    /**
     * Remove Artifact
     * @param artifact Artifact
     */
    public static async removeArtifact(artifact?: ArtifactCollection): Promise<void> {
        throw new Error('Method not implemented.');
    }

    /**
     * Save Artifact File
     * @param uuid File UUID
     * @param data Data
     */
    public static async saveArtifactFile(uuid: string, data: Buffer): Promise<void> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get Artifact File By UUID
     * @param uuid File UUID
     * @returns Buffer
     */
    public static async getArtifactFileByUUID(uuid: string): Promise<Buffer> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get Module By ID
     * @param id
     */
    public static async getModuleById(id: string): Promise<PolicyModule | null> {
        throw new Error('Method not implemented.');
    }

    /**
     * Get Tool By ID
     * @param id
     */
    public static async getToolById(id: string): Promise<PolicyTool | null> {
        throw new Error('Method not implemented.');
    }

    /**
     * Save mint transaction
     * @param transaction Transaction
     * @returns Saved transaction
     */
    public abstract saveMintTransaction(transaction: Partial<MintTransaction>): Promise<MintTransaction>

    /**
     * Update MultiPolicyTransaction
     * @param item
     */
    public static async updateMultiPolicyTransactions(item: MultiPolicyTransaction): Promise<void> {
        throw new Error('Method not implemented.');
    }
}