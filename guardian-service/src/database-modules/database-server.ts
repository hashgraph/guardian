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

import { DocumentSignature, DocumentStatus, SchemaEntity, TopicType } from '@guardian/interfaces';
import { VcDocument as HVcDocument } from '@hedera-modules';
import { BaseEntity, DataBaseHelper } from '@guardian/common';

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
    }

    /**
     * Set Dry Run id
     * @param id
     */
    public setDryRun(id: string): void {
        this.dryRun = id;
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
        const item = await getMongoRepository(DryRun).find({ dryRunId });
        await getMongoRepository(DryRun).remove(item);
    }

    /**
     * Overriding the findOne method
     * @param entityClass
     * @param filters
     */
    private async findOne<T extends BaseEntity>(entityClass: new() => T, filters: any): Promise<T> {
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
            return (await new DataBaseHelper(DryRun).findOne(filters)) as any;
        } else {
            return await new DataBaseHelper(entityClass).findOne(filters);
        }
    }

    /**
     * Overriding the find method
     * @param entityClass
     * @param filters
     */
    private async find<T extends BaseEntity>(entityClass: new() => T, filters: any, options?: any): Promise<T[]> {
        if (this.dryRun) {
            const _filters: any = { ...filters };
            if (_filters.where) {
                _filters.where.dryRunId = this.dryRun;
                _filters.where.dryRunClass = this.classMap.get(entityClass);
            } else {
                _filters.dryRunId = this.dryRun;
                _filters.dryRunClass = this.classMap.get(entityClass);
            }
            return (await new DataBaseHelper(DryRun).find(filters, options)) as any;
        } else {
            return await new DataBaseHelper(entityClass).find(filters, options);
        }
    }

    /**
     * Overriding the create method
     * @param entityClass
     * @param item
     */
    private create<T extends BaseEntity>(entityClass: new() => T, item: any): T {
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
    private async save<T extends BaseEntity>(entityClass: new() => T, item: any): Promise<T> {
        if (this.dryRun) {
            const _item: any = { ...item };
            _item.dryRunId = this.dryRun;
            _item.dryRunClass = this.classMap.get(entityClass);
            return await new DataBaseHelper(DryRun).save(_item) as any;
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
    private async update<T extends BaseEntity>(entityClass: new() => T, criteria: any, row: T): Promise<void> {
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
    private async remove<T extends BaseEntity>(entityClass: new() => T, entities: T[]): Promise<void> {
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
     * Create VC record
     * @param policyId
     * @param tag
     * @param type
     * @param newVc
     * @param oldDoc
     */
    public createVCRecord(
        policyId: string,
        tag: string,
        type: string,
        newVc: HVcDocument,
        oldDoc: any = null,
        refDoc: any = null
    ): VcDocumentCollection {
        if (!oldDoc) {
            oldDoc = {};
        }

        const item = {
            policyId,
            tag: tag || oldDoc.tag || null,
            type: type || oldDoc.type || null,
            hash: newVc.toCredentialHash(),
            document: newVc.toJsonTree(),
            owner: oldDoc.owner || null,
            assignedTo: oldDoc.assignedTo || null,
            option: oldDoc.option || null,
            schema: oldDoc.schema || null,
            hederaStatus: oldDoc.hederaStatus || DocumentStatus.NEW,
            signature: oldDoc.signature || DocumentSignature.NEW,
            messageId: oldDoc.messageId || null,
            topicId: oldDoc.topicId || null,
            relationships: oldDoc.relationships || null,
            comment: oldDoc.comment || null,
            accounts: oldDoc.accounts || null,
        };

        if (!item.relationships || !item.relationships.length) {
            item.relationships = null;
        }

        if (refDoc && refDoc.messageId) {
            item.relationships = [refDoc.messageId];
        }

        if (refDoc && refDoc.accounts) {
            item.accounts = Object.assign({}, refDoc.accounts, item.accounts);
        }

        return item as VcDocumentCollection;
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
            item.assignedTo = row.assignedTo;
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
     *
     * @virtual
     */
    public async getAggregateDocuments(policyId: string, blockId: string, owner?: string): Promise<AggregateVC[]> {
        if (owner) {
            return await this.find(AggregateVC, { policyId, blockId, owner });
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
     * @param filters
     *
     * @virtual
     */
    public async getVcDocuments(filters: any, options?: any): Promise<VcDocumentCollection[]> {
        return await this.find(VcDocumentCollection, filters, options);
    }

    /**
     * Get Vp Documents
     * @param filters
     *
     * @virtual
     */
    public async getVpDocuments(filters: any, options?: any): Promise<VpDocumentCollection[]> {
        return await this.find(VpDocumentCollection, filters, options);
    }

    /**
     * Get Did Documents
     * @param filters
     *
     * @virtual
     */
    public async getDidDocuments(filters: any, options?: any): Promise<DidDocumentCollection[]> {
        return await this.find(DidDocumentCollection, filters, options);
    }

    /**
     * Get Approval Documents
     * @param filters
     *
     * @virtual
     */
    public async getApprovalDocuments(filters: any, options?: any): Promise<ApprovalDocumentCollection[]> {
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
     *
     * @virtual
     */
    public async getTokenById(tokenId: string): Promise<TokenCollection> {
        return await new DataBaseHelper(TokenCollection).findOne({ tokenId });
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
     * Get user role in policy
     * @param policyId
     * @param did
     *
     * @virtual
     */
    public async getUserRole(policyId: string, did: string): Promise<string> {
        if (!did) {
            return null;
        }
        const role = await this.findOne(PolicyRolesCollection, { policyId, did });
        if (role) {
            return role.role;
        }
        return null;
    }

    /**
     * Set user role in policy
     * @param policyId
     * @param did
     *
     * @virtual
     */
    public async setUserRole(policyId: string, did: string, role: string): Promise<void> {
        if (!did) {
            return;
        }
        const doc = this.create(PolicyRolesCollection, { policyId, did, role });
        await this.save(PolicyRolesCollection, doc);
    }

    /**
     * Get all policy users
     * @param policyId
     *
     * @virtual
     */
    public async getAllPolicyUsers(policyId: string): Promise<PolicyRolesCollection[]> {
        return await this.find(PolicyRolesCollection, { policyId });
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
    public static async getSchemas(filters?: any): Promise<SchemaCollection[]> {
        return await new DataBaseHelper(SchemaCollection).find(filters);
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
        return await new DataBaseHelper(SchemaCollection).find({ id: { $in: ids} });
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
     *
     * @virtual
     */
    public static async getUserRole(policyId: string, did: string): Promise<string> {
        if (!did) {
            return null;
        }
        const role = await new DataBaseHelper(PolicyRolesCollection).findOne({ policyId, did });
        if (role) {
            return role.role;
        }
        return null;
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
     *
     * @virtual
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
        })) as any;
    }

    /**
     * Set Current Virtual User
     * @param policyId
     * @param did
     *
     * @virtual
     */
    public static async setVirtualUser(policyId: string, did: string): Promise<any> {
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
        } else if (type === 'ipfs') {
            filters.where.dryRunClass = { $eq: 'Files' };
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
     * Save Virtual Fil
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
}