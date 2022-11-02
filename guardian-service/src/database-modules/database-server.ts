import { BlockState } from '@entity/block-state';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { VpDocument as VpDocumentCollection } from '@entity/vp-document';
import { DidDocument as DidDocumentCollection } from '@entity/did-document';
import { Schema as SchemaCollection } from '@entity/schema';
import { DocumentState } from '@entity/document-state';
import { Policy } from '@entity/policy';
import { AggregateVC } from '@entity/aggregate-documents';
import { ApprovalDocument as ApprovalDocumentCollection } from '@entity/approval-document';
import { Token as TokenCollection } from '@entity/token';
import { Topic as TopicCollection } from '@entity/topic';
import { DryRun } from '@entity/dry-run';
import { PolicyRoles as PolicyRolesCollection } from '@entity/policy-roles';
import { DocumentStatus, IVC, SchemaEntity, TopicType } from '@guardian/interfaces';
import { BaseEntity, DataBaseHelper } from '@guardian/common';
import { PolicyInvitations } from '@entity/policy-invitations';
import { MultiDocuments } from '@entity/multi-documents';
import { Artifact as ArtifactCollection } from '@entity/artifact';
import { ArtifactChunk as ArtifactChunkCollection } from '@entity/artifact-chunk';
import { Binary } from 'bson';
import { SplitDocuments } from '@entity/split-documents';

/**
 * Database server
 */
export class DatabaseServer {
    /**
     * Dry-run
     * @private
     */
    private dryRun: string = null;

    /**
     * Dry-run
     * @private
     */
    private readonly classMap: Map<any, string> = new Map();

    /**
     * Max Document Size ~ 16 MB
     */
    private static readonly MAX_DOCUMENT_SIZE = 16000000;

    constructor(dryRun: string = null) {
        this.dryRun = dryRun || null;

        this.classMap.set(BlockState, 'BlockState');
        this.classMap.set(VcDocumentCollection, 'VcDocumentCollection');
        this.classMap.set(VpDocumentCollection, 'VpDocumentCollection');
        this.classMap.set(DidDocumentCollection, 'DidDocumentCollection');
        this.classMap.set(SchemaCollection, 'SchemaCollection');
        this.classMap.set(DocumentState, 'DocumentState');
        this.classMap.set(Policy, 'Policy');
        this.classMap.set(AggregateVC, 'AggregateVC');
        this.classMap.set(ApprovalDocumentCollection, 'ApprovalDocumentCollection');
        this.classMap.set(TokenCollection, 'TokenCollection');
        this.classMap.set(TopicCollection, 'TopicCollection');
        this.classMap.set(DryRun, 'DryRun');
        this.classMap.set(PolicyRolesCollection, 'PolicyRolesCollection');
        this.classMap.set(PolicyInvitations, 'PolicyInvitations');
        this.classMap.set(MultiDocuments, 'MultiDocuments');
        this.classMap.set(SplitDocuments, 'SplitDocuments');
    }

    /**
     * Set Dry Run id
     * @param id
     */
    public setDryRun(id: string): void {
        this.dryRun = id;
    }

    /**
     * Get Dry Run id
     * @returns Dry Run id
     */
    public getDryRun(): string {
        return this.dryRun;
    }

    /**
     * Clear Dry Run table
     */
    public async clearDryRun(): Promise<void> {
        const item = await new DataBaseHelper(DryRun).find({ dryRunId: this.dryRun });
        await new DataBaseHelper(DryRun).remove(item);
    }

    /**
     * Clear Dry Run table
     */
    public static async clearDryRun(dryRunId: string): Promise<void> {
        const item = await new DataBaseHelper(DryRun).find({ dryRunId });
        await new DataBaseHelper(DryRun).remove(item);
    }

    /**
     * Overriding the findOne method
     * @param entityClass
     * @param filters
     */
    private async findOne<T extends BaseEntity>(entityClass: new () => T, filters: any): Promise<T> {
        if (this.dryRun) {
            if (typeof filters === 'string') {
                return (await new DataBaseHelper(DryRun).findOne(filters)) as any;
            }
            const _filters: any = { ...filters };
            if (_filters.where) {
                _filters.where.dryRunId = this.dryRun;
                _filters.where.dryRunClass = this.classMap.get(entityClass);
            } else {
                _filters.dryRunId = this.dryRun;
                _filters.dryRunClass = this.classMap.get(entityClass);
            }
            return (await new DataBaseHelper(DryRun).findOne(_filters)) as any;
        } else {
            return await new DataBaseHelper(entityClass).findOne(filters);
        }
    }

    /**
     * Overriding the count method
     * @param entityClass
     * @param filters
     * @param options
     */
    private async count<T extends BaseEntity>(entityClass: new () => T, filters: any, options?: any): Promise<number> {
        if (this.dryRun) {
            const _filters: any = { ...filters };
            if (_filters.where) {
                _filters.where.dryRunId = this.dryRun;
                _filters.where.dryRunClass = this.classMap.get(entityClass);
            } else {
                _filters.dryRunId = this.dryRun;
                _filters.dryRunClass = this.classMap.get(entityClass);
            }
            return await new DataBaseHelper(DryRun).count(_filters, options);
        } else {
            return await new DataBaseHelper(entityClass).count(filters, options);
        }
    }

    /**
     * Overriding the find method
     * @param entityClass
     * @param filters
     * @param options
     */
    private async find<T extends BaseEntity>(entityClass: new () => T, filters: any, options?: any): Promise<T[]> {
        if (this.dryRun) {
            const _filters: any = { ...filters };
            if (_filters.where) {
                _filters.where.dryRunId = this.dryRun;
                _filters.where.dryRunClass = this.classMap.get(entityClass);
            } else {
                _filters.dryRunId = this.dryRun;
                _filters.dryRunClass = this.classMap.get(entityClass);
            }
            return (await new DataBaseHelper(DryRun).find(_filters, options)) as any;
        } else {
            return await new DataBaseHelper(entityClass).find(filters, options);
        }
    }

    /**
     * Find data by aggregation
     * @param entityClass Entity class
     * @param aggregation Aggragation filter
     * @returns
     */
    private async aggregate<T extends BaseEntity>(entityClass: new () => T, aggregation: any[]): Promise<T[]> {
        if (this.dryRun) {
            if (Array.isArray(aggregation)) {
                aggregation.push({
                    $match: {
                        dryRunId: this.dryRun,
                        dryRunClass: this.classMap.get(entityClass)
                    }
                })
            }
            return await new DataBaseHelper(DryRun).aggregate(aggregation);
        } else {
            return await new DataBaseHelper(entityClass).aggregate(aggregation);
        }
    }

    /**
     * Overriding the create method
     * @param entityClass
     * @param item
     */
    private create<T extends BaseEntity>(entityClass: new () => T, item: any): T {
        if (this.dryRun) {
            return (new DataBaseHelper(DryRun).create(item)) as any;
        } else {
            return new DataBaseHelper(entityClass).create(item);
        }
    }

    /**
     * Overriding the save method
     * @param entityClass
     * @param item
     */
    private async save<T extends BaseEntity>(entityClass: new () => T, item: any): Promise<T> {
        if (this.dryRun) {
            if (Array.isArray(item)) {
                for (const i of item) {
                    i.dryRunId = this.dryRun;
                    i.dryRunClass = this.classMap.get(entityClass);
                }
            } else {
                item.dryRunId = this.dryRun;
                item.dryRunClass = this.classMap.get(entityClass);
            }
            return await new DataBaseHelper(DryRun).save(item) as any;
        } else {
            return await new DataBaseHelper(entityClass).save(item);
        }
    }

    /**
     * Overriding the update method
     * @param entityClass
     * @param criteria
     * @param row
     */
    private async update<T extends BaseEntity>(entityClass: new () => T, criteria: any, row: T): Promise<void> {
        if (this.dryRun) {
            await new DataBaseHelper(DryRun).update(row, criteria);
        } else {
            await new DataBaseHelper(entityClass).update(row, criteria);
        }
    }

    /**
     * Overriding the remove method
     * @param entityClass
     * @param entities
     */
    private async remove<T extends BaseEntity>(entityClass: new () => T, entities: T | T[]): Promise<void> {
        if (this.dryRun) {
            await new DataBaseHelper(DryRun).remove(entities as any);
        } else {
            await new DataBaseHelper(entityClass).remove(entities);
        }
    }

    /**
     * Get Virtual User
     * @param did
     *
     * @virtual
     */
    public async getVirtualUser(did: string): Promise<any> {
        return (await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'VirtualUsers',
            did
        })) as any;
    }

    /**
     * Get Key from Virtual User
     * @param did
     * @param keyName
     *
     * @virtual
     */
    public async getVirtualKey(did: string, keyName: string): Promise<string> {
        const item = (await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'VirtualKey',
            did,
            type: keyName
        })) as any;
        return item?.hederaAccountKey;
    }

    /**
     * Set Key from Virtual User
     * @param did
     * @param keyName
     * @param key
     *
     * @virtual
     */
    public async setVirtualKey(did: string, keyName: string, key: string): Promise<void> {
        await new DataBaseHelper(DryRun).save({
            dryRunId: this.dryRun,
            dryRunClass: 'VirtualKey',
            did,
            type: keyName,
            hederaAccountKey: key
        });
    }

    /**
     * Get Virtual Hedera Account
     * @param hederaAccountId
     *
     * @virtual
     */
    public async getVirtualHederaAccountInfo(hederaAccountId: string): Promise<any> {
        const item = (await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        })) as any;
        return item?.tokenMap || {};
    }

    /**
     * Virtual Associate Token
     * @param hederaAccountId
     * @param token
     *
     * @virtual
     */
    public async virtualAssociate(hederaAccountId: string, token: TokenCollection): Promise<boolean> {
        const item = await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        });
        if (item) {
            if (item.tokenMap[token.tokenId]) {
                throw new Error('Token already associated')
            } else {
                item.tokenMap[token.tokenId] = {
                    frozen: token.freezeKey ? false : null,
                    kyc: token.kycKey ? false : null
                };
                await new DataBaseHelper(DryRun).update(item);
            }
        } else {
            const tokenMap = {};
            tokenMap[token.tokenId] = {
                frozen: token.freezeKey ? false : null,
                kyc: token.kycKey ? false : null
            };
            await new DataBaseHelper(DryRun).save({
                dryRunId: this.dryRun,
                dryRunClass: 'HederaAccountInfo',
                hederaAccountId,
                tokenMap
            });
        }
        return true;
    }

    /**
     * Virtual Dissociate Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public async virtualDissociate(hederaAccountId: string, tokenId: string): Promise<boolean> {
        const item = await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        });
        if (!item || !item.tokenMap[tokenId]) {
            throw new Error('Token is not associated');
        }
        delete item.tokenMap[tokenId];
        await new DataBaseHelper(DryRun).update(item);
        return true;
    }

    /**
     * Virtual Freeze Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public async virtualFreeze(hederaAccountId: string, tokenId: string): Promise<boolean> {
        const item = await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        });
        if (!item || !item.tokenMap[tokenId]) {
            throw new Error('Token is not associated')
        }
        if (item.tokenMap[tokenId].frozen === null) {
            throw new Error('Can not be frozen');
        }
        if (item.tokenMap[tokenId].frozen === true) {
            throw new Error('Token already frozen');
        }
        item.tokenMap[tokenId].frozen = true;
        await new DataBaseHelper(DryRun).update(item);
        return true;
    }

    /**
     * Virtual Unfreeze Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public async virtualUnfreeze(hederaAccountId: string, tokenId: string): Promise<boolean> {
        const item = await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        });
        if (!item || !item.tokenMap[tokenId]) {
            throw new Error('Token is not associated')
        }
        if (item.tokenMap[tokenId].frozen === null) {
            throw new Error('Can not be unfrozen');
        }
        if (item.tokenMap[tokenId].frozen === false) {
            throw new Error('Token already unfrozen');
        }
        item.tokenMap[tokenId].frozen = false;
        await new DataBaseHelper(DryRun).update(item);
        return true;
    }

    /**
     * Virtual GrantKyc Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public async virtualGrantKyc(hederaAccountId: string, tokenId: string): Promise<boolean> {
        const item = await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        });
        if (!item || !item.tokenMap[tokenId]) {
            throw new Error('Token is not associated')
        }
        if (item.tokenMap[tokenId].kyc === null) {
            throw new Error('Can not be granted kyc');
        }
        if (item.tokenMap[tokenId].kyc === true) {
            throw new Error('Token already granted kyc');
        }
        item.tokenMap[tokenId].kyc = true;
        await new DataBaseHelper(DryRun).update(item);
        return true;
    }

    /**
     * Virtual RevokeKyc Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public async virtualRevokeKyc(hederaAccountId: string, tokenId: string): Promise<boolean> {
        const item = await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        });
        if (!item || !item.tokenMap[tokenId]) {
            throw new Error('Token is not associated')
        }
        if (item.tokenMap[tokenId].kyc === null) {
            throw new Error('Can not be revoked kyc');
        }
        if (item.tokenMap[tokenId].kyc === false) {
            throw new Error('Token already revoked kyc');
        }
        item.tokenMap[tokenId].kyc = false;
        await new DataBaseHelper(DryRun).update(item);
        return true;
    }

    /**
     * Save Block State
     * @param policyId
     * @param uuid
     * @param state
     *
     * @virtual
     */
    public async saveBlockState(policyId: string, uuid: string, state: any): Promise<void> {
        let stateEntity = await this.findOne(BlockState, {
            policyId,
            blockId: uuid
        });
        if (!stateEntity) {
            stateEntity = this.create(BlockState, {
                policyId,
                blockId: uuid,
            })
        }
        stateEntity.blockState = JSON.stringify(state);
        await this.save(BlockState, stateEntity);
    }

    /**
     * Get Block State
     * @param policyId
     * @param uuid
     *
     * @virtual
     */
    public async getBlockState(policyId: string, uuid: string): Promise<BlockState> {
        return await this.findOne(BlockState, {
            policyId,
            blockId: uuid
        });
    }

    /**
     * Save Document State
     * @param documentId
     * @param status
     *
     * @virtual
     */
    public async saveDocumentState(documentId: string, status: any): Promise<DocumentState> {
        const item = this.create(DocumentState, { documentId, status });
        return await this.save(DocumentState, item);
    }

    /**
     * Update Approval record
     * @param row
     *
     * @virtual
     */
    public async updateApprovalRecord(row: ApprovalDocumentCollection): Promise<ApprovalDocumentCollection> {
        let item: ApprovalDocumentCollection;
        if (row.id) {
            item = await this.findOne(ApprovalDocumentCollection, row.id);
        }
        if (item) {
            item.owner = row.owner;
            item.group = row.group;
            item.option = row.option;
            item.schema = row.schema;
            item.document = row.document;
            item.tag = row.tag;
            item.type = row.type;
        } else {
            item = this.create(ApprovalDocumentCollection, row as ApprovalDocumentCollection);
        }
        return await this.save(ApprovalDocumentCollection, item);
    }

    /**
     * Update did record
     * @param row
     *
     * @virtual
     */
    public async updateDIDRecord(row: DidDocumentCollection): Promise<DidDocumentCollection> {
        let item = await this.findOne(DidDocumentCollection, { did: row.did });
        if (item) {
            item.document = row.document;
            item.status = row.status;
            await this.update(DidDocumentCollection, item.id, item);
            return item;
        } else {
            item = this.create(DidDocumentCollection, row as DidDocumentCollection);
            return await this.save(DidDocumentCollection, item);
        }
    }

    /**
     * Update VC record
     * @param row
     *
     * @virtual
     */
    public async updateVCRecord(row: VcDocumentCollection): Promise<VcDocumentCollection> {
        let item = await this.findOne(VcDocumentCollection, {
            where: {
                hash: { $eq: row.hash },
                hederaStatus: { $not: { $eq: DocumentStatus.REVOKE } }
            }
        });
        let updateStatus = false;
        if (item) {
            if (row.option?.status) {
                updateStatus = item.option?.status !== row.option.status
            }
            item.owner = row.owner;
            item.group = row.group;
            item.assignedTo = row.assignedTo;
            item.assignedToGroup = row.assignedToGroup;
            item.option = row.option;
            item.schema = row.schema;
            item.hederaStatus = row.hederaStatus;
            item.signature = row.signature;
            item.type = row.type;
            item.tag = row.tag;
            item.document = row.document;
            item.messageId = row.messageId || item.messageId;
            item.topicId = row.topicId || item.topicId;
            item.comment = row.comment;
            item.relationships = row.relationships;
            item.tokens = row.tokens;

            await this.update(VcDocumentCollection, item.id, item);
        } else {
            item = this.create(VcDocumentCollection, row);
            updateStatus = !!item.option?.status;

            await this.save(VcDocumentCollection, item);
        }
        if (updateStatus) {
            await this.save(DocumentState, this.create(DocumentState, {
                documentId: item.id,
                status: item.option.status,
                reason: item.comment
            }));
        }
        return item;
    }

    /**
     * Create Token
     * @param token
     * @returns
     */
    public async createToken(token: any): Promise<TokenCollection> {
        const newToken = this.create(TokenCollection, token);
        return await this.save(TokenCollection, newToken);
    }

    /**
     * Update VC record
     * @param row
     *
     * @virtual
     */
    public async updateVCRecordById(row: VcDocumentCollection): Promise<VcDocumentCollection> {
        await this.update(VcDocumentCollection, row.id, row);
        return row;
    }

    /**
     * Update VP record
     * @param row
     *
     * @virtual
     */
    public async updateVPRecord(row: VpDocumentCollection): Promise<VpDocumentCollection> {
        const doc = this.create(VpDocumentCollection, row);
        return await this.save(VpDocumentCollection, doc);
    }

    /**
     * Save VC
     * @param row
     *
     * @virtual
     */
    public async saveVC(row: Partial<VcDocumentCollection>): Promise<VcDocumentCollection> {
        const doc = this.create(VcDocumentCollection, row);
        return await this.save(VcDocumentCollection, doc);
    }

    /**
     * Save VP
     * @param row
     *
     * @virtual
     */
    public async saveVP(row: Partial<VpDocumentCollection>): Promise<VpDocumentCollection> {
        const doc = this.create(VpDocumentCollection, row);
        return await this.save(VpDocumentCollection, doc);
    }

    /**
     * Save Did
     * @param row
     *
     * @virtual
     */
    public async saveDid(row: Partial<DidDocumentCollection>): Promise<DidDocumentCollection> {
        const doc = this.create(DidDocumentCollection, row);
        return await this.save(DidDocumentCollection, doc);
    }

    /**
     * Get Policy
     * @param policyId
     *
     * @virtual
     */
    public async getPolicy(policyId: string): Promise<Policy> {
        return await this.findOne(Policy, policyId);
    }

    /**
     * Get Aggregate Documents
     * @param policyId
     * @param blockId
     * @param owner
     * @param owner
     *
     * @virtual
     */
    public async getAggregateDocuments(
        policyId: string,
        blockId: string,
        owner?: string,
        group?: string
    ): Promise<AggregateVC[]> {
        if (owner) {
            if (group) {
                return await this.find(AggregateVC, { policyId, blockId, owner, group });
            } else {
                return await this.find(AggregateVC, { policyId, blockId, owner });
            }
        } else {
            return await this.find(AggregateVC, { policyId, blockId });
        }
    }

    /**
     * Remove Aggregate Documents
     * @param removeMsp
     *
     * @virtual
     */
    public async removeAggregateDocuments(removeMsp: AggregateVC[]): Promise<void> {
        await this.remove(AggregateVC, removeMsp);
    }

    /**
     * Remove Aggregate Document
     * @param hash
     * @param blockId
     *
     * @virtual
     */
    public async removeAggregateDocument(hash: string, blockId: string): Promise<void> {
        const item = await this.find(AggregateVC, { blockId, hash });
        await this.remove(AggregateVC, item);
    }

    /**
     * Create Aggregate Documents
     * @param item
     * @param blockId
     *
     * @virtual
     */
    public async createAggregateDocuments(item: VcDocumentCollection, blockId: string): Promise<void> {
        (item as any).blockId = blockId;
        const newVC = this.create(AggregateVC, item);
        await this.save(AggregateVC, newVC);
    }

    /**
     * Get Vc Document
     * @param filters
     *
     * @virtual
     */
    public async getVcDocument(filters: any): Promise<VcDocumentCollection> {
        return await this.findOne(VcDocumentCollection, filters);
    }

    /**
     * Get Vp Document
     * @param filters
     *
     * @virtual
     */
    public async getVpDocument(filters: any): Promise<VpDocumentCollection> {
        return await this.findOne(VpDocumentCollection, filters);
    }

    /**
     * Get Approval Document
     * @param filters
     *
     * @virtual
     */
    public async getApprovalDocument(filters: any): Promise<ApprovalDocumentCollection> {
        return await this.findOne(ApprovalDocumentCollection, filters);
    }

    /**
     * Get Vc Documents
     * @param aggregation
     * @virtual
     */
    public async getVcDocumentsByAggregation(aggregation: any[]): Promise<VcDocumentCollection[]> {
        return await this.aggregate(VcDocumentCollection, aggregation);
    }

    /**
     * Get Vp Documents
     * @param aggregation
     * @virtual
     */
    public async getVpDocumentsByAggregation(aggregation: any[]): Promise<VpDocumentCollection[]> {
        return await this.aggregate(VpDocumentCollection, aggregation);
    }

    /**
     * Get Did Documents
     * @param aggregation
     * @virtual
     */
    public async getDidDocumentsByAggregation(aggregation: any[]): Promise<DidDocumentCollection[]> {
        return await this.aggregate(DidDocumentCollection, aggregation);
    }

    /**
     * Get Approval Documents
     * @param aggregation
     * @virtual
     */
    public async getApprovalDocumentsByAggregation(aggregation: any[]): Promise<ApprovalDocumentCollection[]> {
        return await this.aggregate(ApprovalDocumentCollection, aggregation);
    }

    /**
     * Get Vc Documents
     * @param filters
     * @param options
     * @param countResult
     * @virtual
     */
    public async getVcDocuments(filters: any, options?: any, countResult?: boolean): Promise<VcDocumentCollection[] | number> {
        if (countResult) {
            return await this.count(VcDocumentCollection, filters, options);
        }
        return await this.find(VcDocumentCollection, filters, options);
    }

    /**
     * Get Vp Documents
     * @param filters
     *
     * @param options
     * @param countResult
     * @virtual
     */
    public async getVpDocuments(filters: any, options?: any, countResult?: boolean): Promise<VpDocumentCollection[] | number> {
        if (countResult) {
            return await this.count(VpDocumentCollection, filters, options);
        }
        return await this.find(VpDocumentCollection, filters, options);
    }

    /**
     * Get Did Documents
     * @param filters
     *
     * @param options
     * @param countResult
     * @virtual
     */
    public async getDidDocuments(filters: any, options?: any, countResult?: boolean): Promise<DidDocumentCollection[] | number> {
        if (countResult) {
            return await this.count(DidDocumentCollection, filters, options);
        }
        return await this.find(DidDocumentCollection, filters, options);
    }

    /**
     * Get Approval Documents
     * @param filters
     * @param options
     * @param countResult
     * @virtual
     */
    public async getApprovalDocuments(filters: any, options?: any, countResult?: boolean): Promise<ApprovalDocumentCollection[] | number> {
        if (countResult) {
            return await this.count(ApprovalDocumentCollection, filters, options);
        }
        return await this.find(ApprovalDocumentCollection, filters, options);
    }

    /**
     * Get Document States
     * @param filters
     *
     * @virtual
     */
    public async getDocumentStates(filters: any, options?: any): Promise<DocumentState[]> {
        return await this.find(DocumentState, filters, options);
    }

    /**
     * Get Topic
     * @param filters
     *
     * @virtual
     */
    public async getTopic(
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
        }
    ): Promise<TopicCollection> {
        return await this.findOne(TopicCollection, filters);
    }

    /**
     * Get Topics
     * @param filters
     *
     * @virtual
     */
    public async getTopics(
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
        }
    ): Promise<TopicCollection[]> {
        return await this.find(TopicCollection, filters);
    }

    /**
     * Get Token
     * @param tokenId
     */
    public async getTokenById(tokenId: string, dryRun: any = null): Promise<TokenCollection> {
        if (dryRun) {
            return this.findOne(TokenCollection, { tokenId });
        } else {
            return await new DataBaseHelper(TokenCollection).findOne({ tokenId });
        }
    }

    /**
     * Save Topic
     * @param topic
     *
     * @virtual
     */
    public async saveTopic(topic: TopicCollection): Promise<TopicCollection> {
        const topicObject = this.create(TopicCollection, topic);
        return await this.save(TopicCollection, topicObject);
    }

    /**
     * Get schema
     * @param iri
     * @param topicId
     */
    public async getSchemaByIRI(iri: string, topicId?: string): Promise<SchemaCollection> {
        if (topicId) {
            return await new DataBaseHelper(SchemaCollection).findOne({ iri, topicId });
        } else {
            return await new DataBaseHelper(SchemaCollection).findOne({ iri });
        }
    }

    /**
     * Get schema
     * @param topicId
     * @param entity
     */
    public async getSchemaByType(topicId: string, entity: SchemaEntity): Promise<SchemaCollection> {
        return await new DataBaseHelper(SchemaCollection).findOne({
            entity,
            readonly: true,
            topicId
        });
    }

    /**
     * Set user in group
     *
     * @param group
     *
     * @virtual
     */
    public async setUserInGroup(group: any): Promise<PolicyRolesCollection> {
        const doc = this.create(PolicyRolesCollection, group);
        await this.save(PolicyRolesCollection, doc);
        return doc;
    }

    /**
     * Set Active Group
     *
     * @param policyId
     * @param did
     * @param uuid
     *
     * @virtual
     */
    public async setActiveGroup(policyId: string, did: string, uuid: string): Promise<void> {
        const groups = await this.find(PolicyRolesCollection, { policyId, did });
        for (const group of groups) {
            group.active = group.uuid === uuid;
        }
        await this.save(PolicyRolesCollection, groups);
    }

    /**
     * Get Group By UUID
     * @param policyId
     * @param uuid
     *
     * @virtual
     */
    public async getGroupByID(policyId: string, uuid: string): Promise<PolicyRolesCollection> {
        return await this.findOne(PolicyRolesCollection, { policyId, uuid });
    }

    /**
     * Get Group By Name
     * @param policyId
     * @param groupName
     *
     * @virtual
     */
    public async getGlobalGroup(policyId: string, groupName: string): Promise<PolicyRolesCollection> {
        return await this.findOne(PolicyRolesCollection, { policyId, groupName });
    }

    /**
     * Get User In Group
     * @param policyId
     * @param did
     * @param uuid
     *
     * @virtual
     */
    public async getUserInGroup(policyId: string, did: string, uuid: string): Promise<PolicyRolesCollection> {
        if (!did && !uuid) {
            return null;
        }
        return await this.findOne(PolicyRolesCollection, { policyId, did, uuid });
    }

    /**
     * Check User In Group
     * @param group
     *
     * @virtual
     */
    public async checkUserInGroup(group: any): Promise<PolicyRolesCollection> {
        return await this.findOne(PolicyRolesCollection, {
            policyId: group.policyId,
            did: group.did,
            owner: group.owner,
            uuid: group.uuid
        });
    }

    /**
     * Get Groups By User
     * @param policyId
     * @param did
     * @param options
     *
     * @virtual
     */
    public async getGroupsByUser(policyId: string, did: string, options?: any): Promise<PolicyRolesCollection[]> {
        if (!did) {
            return [];
        }
        return await this.find(PolicyRolesCollection, { policyId, did }, options);
    }

    /**
     * Get Active Group By User
     * @param policyId
     * @param did
     *
     * @virtual
     */
    public async getActiveGroupByUser(policyId: string, did: string): Promise<PolicyRolesCollection> {
        if (!did) {
            return null;
        }
        return await this.findOne(PolicyRolesCollection, { policyId, did, active: true });
    }

    /**
     * Get members
     *
     * @param group
     *
     * @virtual
     */
    public async getAllMembersByGroup(group: PolicyRolesCollection): Promise<PolicyRolesCollection[]> {
        if (!group.uuid) {
            return [];
        }
        return await this.find(PolicyRolesCollection, {
            policyId: group.policyId,
            uuid: group.uuid
        });
    }

    /**
     * Get all policy users
     * @param policyId
     *
     * @virtual
     */
    public async getAllPolicyUsers(policyId: string): Promise<PolicyRolesCollection[]> {
        return await this.find(PolicyRolesCollection, { policyId, active: true });
    }

    /**
     * Get all policy users
     * @param policyId
     *
     * @virtual
     */
    public async getAllUsersByRole(policyId: string, uuid: string, role: string): Promise<PolicyRolesCollection[]> {
        return await this.find(PolicyRolesCollection, { policyId, uuid, role });
    }

    /**
     * Delete user
     * @param group
     *
     * @virtual
     */
    public async deleteGroup(group: PolicyRolesCollection): Promise<void> {
        return await this.remove(PolicyRolesCollection, group);
    }

    /**
     * Create invite token
     * @param policyId
     * @param uuid
     * @param owner
     *
     * @virtual
     */
    public async createInviteToken(policyId: string, uuid: string, owner: string, role: string): Promise<string> {
        const doc = this.create(PolicyInvitations, {
            uuid,
            policyId,
            owner,
            role,
            active: true
        });
        await this.save(PolicyInvitations, doc);
        return doc.id.toString();
    }

    /**
     * Parse invite token
     * @param invitationId
     *
     * @virtual
     */
    public async parseInviteToken(policyId: string, invitationId: string): Promise<PolicyInvitations> {
        const invitation = await this.findOne(PolicyInvitations, invitationId);
        if (invitation && invitation.policyId === policyId && invitation.active === true) {
            invitation.active = false;
            await this.save(PolicyInvitations, invitation);
            return invitation;
        } else {
            return null;
        }
    }

    /**
     * Get MultiSign Status by document or user
     * @param uuid
     * @param documentId
     * @param userId
     *
     * @virtual
     */
    public async getMultiSignStatus(uuid: string, documentId: string, userId: string = 'Group'): Promise<MultiDocuments> {
        return await this.findOne(MultiDocuments, { uuid, documentId, userId });
    }

    /**
     * Get MultiSign Statuses
     * @param uuid
     * @param documentId
     * @param group
     *
     * @virtual
     */
    public async getMultiSignDocuments(uuid: string, documentId: string, group: string): Promise<MultiDocuments[]> {
        return await this.find(MultiDocuments, {
            where: {
                uuid: { $eq: uuid },
                documentId: { $eq: documentId },
                group: { $eq: group },
                userId: { $ne: 'Group' }
            }
        });
    }

    /**
     * Get MultiSign Statuses by group
     * @param uuid
     * @param group
     *
     * @virtual
     */
    public async getMultiSignDocumentsByGroup(uuid: string, group: string): Promise<MultiDocuments[]> {
        return await this.find(MultiDocuments, {
            where: {
                uuid: { $eq: uuid },
                group: { $eq: group },
                userId: { $eq: 'Group' },
                status: { $eq: 'NEW' }
            }
        });
    }

    /**
     * Set MultiSign Status by document
     * @param uuid
     * @param documentId
     * @param group
     * @param status
     *
     * @virtual
     */
    public async setMultiSigStatus(
        uuid: string,
        documentId: string,
        group: string,
        status: string
    ): Promise<MultiDocuments> {
        let item = await this.findOne(MultiDocuments, {
            where: {
                uuid: { $eq: uuid },
                documentId: { $eq: documentId },
                group: { $eq: group },
                userId: { $eq: 'Group' }
            }
        });
        if (item) {
            item.status = status;
            await this.update(MultiDocuments, item.id, item);
        } else {
            item = this.create(MultiDocuments, {
                uuid,
                documentId,
                status,
                document: null,
                userId: 'Group',
                did: null,
                group,
                username: null
            });
            await this.save(MultiDocuments, item);
        }
        return item;
    }

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
    public async setMultiSigDocument(
        uuid: string,
        documentId: string,
        user: any,
        status: string,
        document: IVC
    ): Promise<MultiDocuments> {
        const doc = this.create(MultiDocuments, {
            uuid,
            documentId,
            status,
            document,
            userId: user.id,
            did: user.did,
            group: user.group,
            username: user.username
        });
        await this.save(MultiDocuments, doc);
        return doc;
    }

    /**
     * Get Residue objects
     * @param policyId
     * @param blockId
     * @param userId
     */
    public async getResidue(
        policyId: string,
        blockId: string,
        userId: string
    ): Promise<SplitDocuments[]> {
        return await this.find(SplitDocuments, {
            where: {
                policyId: { $eq: policyId },
                blockId: { $eq: blockId },
                userId: { $eq: userId }
            }
        });
    }

    /**
     * Set Residue objects
     * @param residue
     */
    public async setResidue(residue: SplitDocuments[]): Promise<void> {
        await this.save(SplitDocuments, residue);
    }

    /**
     * Remove Residue objects
     * @param residue
     */
    public async removeResidue(residue: SplitDocuments[]): Promise<void> {
        await this.remove(SplitDocuments, residue);
    }

    /**
     * Create Residue object
     * @param policyId
     * @param blockId
     * @param userId
     * @param value
     * @param document
     */
    public createResidue(
        policyId: string,
        blockId: string,
        userId: string,
        value: any,
        document: any
    ): SplitDocuments {
        return this.create(SplitDocuments, {
            policyId,
            blockId,
            userId,
            value,
            document
        });
    }

    //Static

    /**
     * Get schema
     * @param topicId
     * @param entity
     */
    public static async getSchemaByType(topicId: string, entity: SchemaEntity): Promise<SchemaCollection> {
        return await new DataBaseHelper(SchemaCollection).findOne({
            entity,
            readonly: true,
            topicId
        });
    }

    /**
     * Get system schema
     * @param entity
     */
    public static async getSystemSchema(entity: SchemaEntity): Promise<SchemaCollection> {
        return await new DataBaseHelper(SchemaCollection).findOne({
            entity,
            system: true,
            active: true
        });
    }

    /**
     * Get schemas
     * @param filters
     */
    public static async getSchemas(filters?: any, options?: any): Promise<SchemaCollection[]> {
        return await new DataBaseHelper(SchemaCollection).find(filters, options);
    }

    /**
     * Delete schemas
     * @param id
     */
    public static async deleteSchemas(id: any): Promise<void> {
        await new DataBaseHelper(SchemaCollection).delete({ id });
    }

    /**
     * Update schema
     * @param id
     * @param item
     */
    public static async updateSchema(id: any, item: SchemaCollection): Promise<void> {
        await new DataBaseHelper(SchemaCollection).update(item, { id });
    }

    /**
     * Update schemas
     * @param items Schemas
     */
    public static async updateSchemas(items: SchemaCollection[]): Promise<void> {
        await new DataBaseHelper(SchemaCollection).update(items);
    }

    /**
     * Get schemas
     * @param filters
     */
    public static async getSchema(filters?: any): Promise<SchemaCollection> {
        return await new DataBaseHelper(SchemaCollection).findOne(filters);
    }

    /**
     * Get schema
     * @param item
     */
    public static createSchema(item: Partial<SchemaCollection>): SchemaCollection {
        return new DataBaseHelper(SchemaCollection).create(item);
    }

    /**
     * Get schema
     * @param item
     */
    public static async saveSchema(item: SchemaCollection): Promise<SchemaCollection> {
        return await new DataBaseHelper(SchemaCollection).save(item);
    }

    /**
     * Get schema
     * @param item
     */
    public static async saveSchemas(item: SchemaCollection[]): Promise<SchemaCollection[]> {
        const result = [];
        for await (const schema of item) {
            result.push(await new DataBaseHelper(SchemaCollection).save(schema));
        }
        return result;
    }

    /**
     * Get schema
     * @param item
     */
    public static async createAndSaveSchema(item: Partial<SchemaCollection>): Promise<SchemaCollection> {
        return await new DataBaseHelper(SchemaCollection).save(item);
    }

    /**
     * Get schema
     * @param filters
     */
    public static async getSchemasAndCount(filters?: any, options?: any): Promise<[SchemaCollection[], number]> {
        return await new DataBaseHelper(SchemaCollection).findAndCount(filters, options);
    }

    /**
     * Get schema
     * @param ids
     */
    public static async getSchemasByIds(ids: string[]): Promise<SchemaCollection[]> {
        return await new DataBaseHelper(SchemaCollection).find({ id: { $in: ids } });
    }

    /**
     * Get schema
     * @param filters
     */
    public static async getSchemasCount(filters?: any): Promise<number> {
        return await new DataBaseHelper(SchemaCollection).count(filters);
    }

    /**
     * Get user role in policy
     * @param policyId
     * @param did
     */
    public static async getUserRole(policyId: string, did: string): Promise<PolicyRolesCollection[]> {
        if (!did) {
            return null;
        }
        return await new DataBaseHelper(PolicyRolesCollection).find({ policyId, did });
    }

    /**
     * Get policy
     * @param filters
     */
    public static async getPolicy(filters: any): Promise<Policy> {
        return await new DataBaseHelper(Policy).findOne(filters);
    }

    /**
     * Get policies
     * @param filters
     */
    public static async getPolicies(filters?: any): Promise<Policy[]> {
        return await new DataBaseHelper(Policy).find(filters);
    }

    /**
     * Get policies
     * @param filters
     */
    public static async getListOfPolicies(filters?: any): Promise<Policy[]> {
        const options: any = {
            fields: [
                'id',
                'uuid',
                'name',
                'version',
                'previousVersion',
                'description',
                'status',
                'creator',
                'owner',
                'topicId',
                'policyTag',
                'messageId',
                'codeVersion',
                'createDate'
            ],
            limit: 100
        }
        return await new DataBaseHelper(Policy).find(filters, options);
    }

    /**
     * Get policy by id
     * @param policyId
     */
    public static async getPolicyById(policyId: string): Promise<Policy> {
        return await new DataBaseHelper(Policy).findOne(policyId);
    }

    /**
     * Get policy by uuid
     * @param uuid
     */
    public static async getPolicyByUUID(uuid: string): Promise<Policy> {
        return await new DataBaseHelper(Policy).findOne({ uuid });
    }

    /**
     * Get policy by tag
     * @param policyTag
     */
    public static async getPolicyByTag(policyTag: string): Promise<Policy> {
        return await new DataBaseHelper(Policy).findOne({ policyTag });
    }

    /**
     * Get policy
     * @param model
     */
    public static async updatePolicy(model: Policy): Promise<Policy> {
        return await new DataBaseHelper(Policy).save(model);
    }

    /**
     * Get policies and count
     * @param filters
     */
    public static async getPoliciesAndCount(filters: any, options?: any): Promise<[Policy[], number]> {
        return await new DataBaseHelper(Policy).findAndCount(filters, options);
    }

    /**
     * Get policy count
     * @param filters
     */
    public static async getPolicyCount(filters: any): Promise<number> {
        return await new DataBaseHelper(Policy).count(filters);
    }

    /**
     * Create policy
     * @param data
     */
    public static createPolicy(data: Partial<Policy>): Policy {
        if (!data.config) {
            data.config = {
                'blockType': 'interfaceContainerBlock',
                'permissions': [
                    'ANY_ROLE'
                ]
            }
        }
        const model = new DataBaseHelper(Policy).create(data);
        return model;
    }

    /**
     * Delete policy
     * @param id Policy ID
     */
    public static async deletePolicy(id: any): Promise<void> {
        await new DataBaseHelper(Policy).delete({ id });
    }

    /**
     * Get topic by id
     * @param topicId
     */
    public static async getTopicById(topicId: string): Promise<TopicCollection> {
        return await new DataBaseHelper(TopicCollection).findOne({ topicId });
    }

    /**
     * Get topic by type
     * @param owner
     * @param type
     */
    public static async getTopicByType(owner: string, type: TopicType): Promise<TopicCollection> {
        return await new DataBaseHelper(TopicCollection).findOne({ owner, type });
    }

    /**
     * Save topic
     * @param row
     */
    public static async saveTopic(row: Partial<TopicCollection>): Promise<TopicCollection> {
        return await new DataBaseHelper(TopicCollection).save(row);
    }

    /**
     * Update topic
     * @param row
     */
    public static async updateTopic(row: TopicCollection): Promise<void> {
        await new DataBaseHelper(TopicCollection).update(row);
    }

    /**
     * Save VC
     * @param row
     */
    public static async saveVC(row: Partial<VcDocumentCollection>): Promise<VcDocumentCollection> {
        return await new DataBaseHelper(VcDocumentCollection).save(row);
    }

    /**
     * Update policy
     * @param policyId
     * @param data
     */
    public static async updatePolicyConfig(policyId: any, data: Policy): Promise<Policy> {
        const model = await new DataBaseHelper(Policy).findOne(policyId);
        model.config = data.config;
        model.name = data.name;
        model.version = data.version;
        model.description = data.description;
        model.topicDescription = data.topicDescription;
        model.policyRoles = data.policyRoles;
        model.policyTopics = data.policyTopics;
        model.policyTokens = data.policyTokens;
        model.policyGroups = data.policyGroups;
        return await new DataBaseHelper(Policy).save(model);
    }

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
    public static async createVirtualUser(
        policyId: string,
        username: string,
        did: string,
        hederaAccountId: string,
        hederaAccountKey: string,
        active: boolean = false
    ): Promise<void> {
        await new DataBaseHelper(DryRun).save({
            dryRunId: policyId,
            dryRunClass: 'VirtualUsers',
            did,
            username,
            hederaAccountId,
            active
        });

        await new DataBaseHelper(DryRun).save({
            dryRunId: policyId,
            dryRunClass: 'VirtualKey',
            did,
            type: did,
            hederaAccountKey
        });
    }

    /**
     * Get Current Virtual User
     * @param policyId
     *
     * @virtual
     */
    public static async getVirtualUser(policyId: string): Promise<any> {
        return await new DataBaseHelper(DryRun).findOne({
            dryRunId: policyId,
            dryRunClass: 'VirtualUsers',
            active: true
        }, {
            fields: [
                'id',
                'did',
                'username',
                'hederaAccountId',
                'active'
            ]
        });
    }

    /**
     * Get All Virtual Users
     * @param policyId
     *
     * @virtual
     */
    public static async getVirtualUsers(policyId: string): Promise<any[]> {
        return (await new DataBaseHelper(DryRun).find({
            dryRunId: policyId,
            dryRunClass: 'VirtualUsers'
        }, {
            fields: [
                'id',
                'did',
                'username',
                'hederaAccountId',
                'active'
            ]
        })) as any;
    }

    /**
     * Set Current Virtual User
     * @param policyId
     * @param did
     *
     * @virtual
     */
    public static async setVirtualUser(policyId: string, did: string): Promise<void> {
        const items = (await new DataBaseHelper(DryRun).find({
            dryRunId: policyId,
            dryRunClass: 'VirtualUsers',
        }));
        for (const item of items) {
            item.active = item.did === did;
            await new DataBaseHelper(DryRun).save(item);
        }
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
    public static async getVirtualDocuments(
        policyId: string,
        type: string,
        pageIndex?: string,
        pageSize?: string
    ): Promise<[any[], number]> {
        const filters: any = {
            where: {
                dryRunId: policyId,
                dryRunClass: null
            }
        }
        const otherOptions: any = {};
        const _pageSize = parseInt(pageSize, 10);
        const _pageIndex = parseInt(pageIndex, 10);
        if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
            otherOptions.orderBy = { createDate: 'DESC' };
            otherOptions.limit = _pageSize;
            otherOptions.offset = _pageIndex * _pageSize;
        }
        if (type === 'artifacts') {
            filters.where.dryRunClass = {
                $in: [
                    'VcDocumentCollection',
                    'VpDocumentCollection',
                    'DidDocumentCollection',
                    'ApprovalDocumentCollection'
                ]
            };
        } else if (type === 'transactions') {
            filters.where.dryRunClass = { $eq: 'Transactions' };
            otherOptions.fields = [
                'id',
                'createDate',
                'type',
                'hederaAccountId'
            ];
        } else if (type === 'ipfs') {
            filters.where.dryRunClass = { $eq: 'Files' };
            otherOptions.fields = [
                'id',
                'createDate',
                'document',
                'documentURL'
            ];
        }
        return await new DataBaseHelper(DryRun).findAndCount(filters, otherOptions);
    }

    /**
     * Save Virtual Transaction
     * @param policyId
     * @param type
     * @param operatorId
     *
     * @virtual
     */
    public static async setVirtualTransaction(
        policyId: string,
        type: string,
        operatorId?: string
    ): Promise<any> {
        await new DataBaseHelper(DryRun).save({
            dryRunId: policyId,
            dryRunClass: 'Transactions',
            type,
            hederaAccountId: operatorId
        });
    }

    /**
     * Save Virtual File
     * @param policyId
     * @param file
     * @param url
     *
     * @virtual
     */
    public static async setVirtualFile(
        policyId: string,
        file: ArrayBuffer,
        url: any
    ): Promise<any> {
        await new DataBaseHelper(DryRun).save({
            dryRunId: policyId,
            dryRunClass: 'Files',
            document: {
                size: file?.byteLength
            },
            documentURL: url?.url
        });
    }

    /**
     * Get Virtual Messages
     * @param dryRun
     * @param topicId
     *
     * @virtual
     */
    public static async getVirtualMessages(dryRun: string, topicId: any): Promise<any> {
        return (await new DataBaseHelper(DryRun).find({
            dryRunId: dryRun,
            dryRunClass: 'Message',
            topicId
        })) as any;
    }

    /**
     * Get Virtual Message
     * @param dryRun
     * @param messageId
     *
     * @virtual
     */
    public static async getVirtualMessage(dryRun: string, messageId: string): Promise<any> {
        return (await new DataBaseHelper(DryRun).findOne({
            dryRunId: dryRun,
            dryRunClass: 'Message',
            messageId
        })) as any;
    }

    /**
     * Save Virtual Message
     * @param dryRun
     * @param message
     *
     * @virtual
     */
    public static async saveVirtualMessage<T>(dryRun: string, message: any): Promise<void> {
        const document = message.toMessage();
        const messageId = message.getId();
        const topicId = message.getTopicId();

        await new DataBaseHelper(DryRun).save({
            dryRunId: dryRun,
            dryRunClass: 'Message',
            document,
            topicId,
            messageId
        });
    }

    /**
     * Get tokens
     * @param filters Filters
     * @returns Tokens
     */
    public static async getTokens(filters?: any): Promise<TokenCollection[]> {
        return await new DataBaseHelper(TokenCollection).find(filters);
    }

    /**
     * Save Artifact
     * @param artifact Artifact
     * @returns Saved Artifact
     */
    public static async saveArtifact(artifact: ArtifactCollection): Promise<ArtifactCollection> {
        return await new DataBaseHelper(ArtifactCollection).save(artifact);
    }

    /**
     * Get Artifact
     * @param filters Filters
     * @returns Artifact
     */
    public static async getArtifact(filters?: any): Promise<ArtifactCollection> {
        return await new DataBaseHelper(ArtifactCollection).findOne(filters);
    }

    /**
     * Get Artifacts
     * @param filters Filters
     * @param options Options
     * @returns Artifacts
     */
    public static async getArtifacts(filters?: any, options?: any): Promise<ArtifactCollection[]> {
        return await new DataBaseHelper(ArtifactCollection).find(filters, options);
    }

    /**
     * Get Artifacts
     * @param filters Filters
     * @param options Options
     * @returns Artifacts
     */
    public static async getArtifactsAndCount(filters?: any, options?: any): Promise<[ArtifactCollection[], number]> {
        return await new DataBaseHelper(ArtifactCollection).findAndCount(filters, options);
    }

    /**
     * Remove Artifact
     * @param artifact Artifact
     */
    public static async removeArtifact(artifact?: ArtifactCollection): Promise<void> {
        await new DataBaseHelper(ArtifactCollection).remove(artifact)
        await new DataBaseHelper(ArtifactChunkCollection).delete({
            uuid: artifact.uuid
        });
    }

    /**
     * Save Artifact File
     * @param uuid File UUID
     * @param data Data
     */
    public static async saveArtifactFile(uuid: string, data: Buffer): Promise<void> {
        let offset = 0;
        let fileNumber = 1;
        while (offset < data.length) {
            await new DataBaseHelper(ArtifactChunkCollection).save({
                uuid,
                number: fileNumber,
                data: new Binary(data.subarray(offset, offset + DatabaseServer.MAX_DOCUMENT_SIZE > data.length ? data.length : offset + DatabaseServer.MAX_DOCUMENT_SIZE))
            });
            offset = offset + DatabaseServer.MAX_DOCUMENT_SIZE;
            fileNumber++;
        }
    }

    /**
     * Get Artifact File By UUID
     * @param uuid File UUID
     * @returns Buffer
     */
    public static async getArtifactFileByUUID(uuid: string): Promise<Buffer> {
        const artifactChunks = (await new DataBaseHelper(ArtifactChunkCollection).find({
            uuid
        }, {
            orderBy: {
                number: 'ASC'
            }
        })).map(item => item.data.buffer);
        return artifactChunks.length > 0 ? Buffer.concat(artifactChunks) : Buffer.from('');
    }
}
