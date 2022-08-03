import { DeepPartial, EntityTarget, getMongoRepository } from 'typeorm';

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

    public async clearDryRun(): Promise<void> {
        const item = await getMongoRepository(DryRun).find({ dryRunId: this.dryRun });
        await getMongoRepository(DryRun).remove(item);
    }

    private async findOne<T>(entityClass: EntityTarget<T>, filters: any): Promise<T> {
        if (this.dryRun) {
            if (typeof filters === 'string') {
                return (await getMongoRepository(DryRun).findOne(filters)) as any;
            }
            const _filters: any = { ...filters };
            if (_filters.where) {
                _filters.where.dryRunId = this.dryRun;
                _filters.where.dryRunClass = this.classMap.get(entityClass);
            } else {
                _filters.dryRunId = this.dryRun;
                _filters.dryRunClass = this.classMap.get(entityClass);
            }
            return (await getMongoRepository(DryRun).findOne(filters)) as any;
        } else {
            return await getMongoRepository(entityClass).findOne(filters);
        }
    }

    private async find<T>(entityClass: EntityTarget<T>, filters: any): Promise<T[]> {
        if (this.dryRun) {
            const _filters: any = { ...filters };
            if (_filters.where) {
                _filters.where.dryRunId = this.dryRun;
                _filters.where.dryRunClass = this.classMap.get(entityClass);
            } else {
                _filters.dryRunId = this.dryRun;
                _filters.dryRunClass = this.classMap.get(entityClass);
            }
            return (await getMongoRepository(DryRun).find(filters)) as any;
        } else {
            return await getMongoRepository(entityClass).find(filters);
        }
    }

    private create<T>(entityClass: EntityTarget<T>, item: DeepPartial<T>): T {
        if (this.dryRun) {
            return (getMongoRepository(DryRun).create(item)) as any;
        } else {
            return getMongoRepository(entityClass).create(item);
        }
    }

    private async save<T>(entityClass: EntityTarget<T>, item: DeepPartial<T>): Promise<T> {
        if (this.dryRun) {
            const _item: any = { ...item };
            _item.dryRunId = this.dryRun;
            _item.dryRunClass = this.classMap.get(entityClass);
            return await getMongoRepository(DryRun).save(_item);
        } else {
            return await getMongoRepository(entityClass).save(item);
        }
    }

    private async update<T>(entityClass: EntityTarget<T>, criteria: any, row: T): Promise<void> {
        if (this.dryRun) {
            await getMongoRepository(DryRun).update(criteria, row);
        } else {
            await getMongoRepository(entityClass).update(criteria, row);
        }
    }

    private async remove<T>(entityClass: EntityTarget<T>, entities: T[]): Promise<void> {
        if (this.dryRun) {
            await getMongoRepository(DryRun).remove(entities as any);
        } else {
            await getMongoRepository(entityClass).remove(entities);
        }
    }

    /**
     * 
     * @param did
     * 
     * @virtual
     */
    public async getVirtualUser(did: string): Promise<any> {
        return (await getMongoRepository(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'VirtualUsers',
            did: did
        })) as any;
    }

    /**
    * 
    * @param did
    * 
    * @virtual
    */
    public async getVirtualKey(did: string, keyName: string): Promise<string> {
        const item = (await getMongoRepository(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'VirtualKey',
            did: did,
            type: keyName
        })) as any;
        return item?.hederaAccountKey;
    }

    /**
    * 
    * @param did
    * 
    * @virtual
    */
    public async setVirtualKey(did: string, keyName: string, key: string): Promise<void> {
        const item = getMongoRepository(DryRun).create({
            dryRunId: this.dryRun,
            dryRunClass: 'VirtualKey',
            did: did,
            type: keyName,
            hederaAccountKey: key
        });
        await getMongoRepository(DryRun).save(item);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async saveBlockState(policyId: string, uuid: string, state: any): Promise<void> {
        let stateEntity = await this.findOne(BlockState, {
            policyId: policyId,
            blockId: uuid
        });
        if (!stateEntity) {
            stateEntity = this.create(BlockState, {
                policyId: policyId,
                blockId: uuid,
            })
        }
        stateEntity.blockState = JSON.stringify(state);
        await this.save(BlockState, stateEntity);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async getBlockState(policyId: string, uuid: string): Promise<BlockState> {
        return await this.findOne(BlockState, {
            policyId: policyId,
            blockId: uuid
        });
    }

    /**
     * 
     * @param filters
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
            assign: oldDoc.assign || null,
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
            item.assign = row.assign;
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
    public async saveVC(row: DeepPartial<VcDocumentCollection>): Promise<VcDocumentCollection> {
        const doc = this.create(VcDocumentCollection, row);
        return await this.save(VcDocumentCollection, doc);
    }

    /**
     * Save VP
     * @param row
     * 
     * @virtual
     */
    public async saveVP(row: DeepPartial<VpDocumentCollection>): Promise<VpDocumentCollection> {
        const doc = this.create(VpDocumentCollection, row);
        return await this.save(VpDocumentCollection, doc);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async saveDid(row: DeepPartial<DidDocumentCollection>): Promise<DidDocumentCollection> {
        const doc = this.create(DidDocumentCollection, row);
        return await this.save(DidDocumentCollection, doc);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async getPolicy(policyId: string): Promise<Policy> {
        return await this.findOne(Policy, policyId);
    }

    /**
     * 
     * @param filters
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
     * 
     * @param filters
     * 
     * @virtual
     */
    public async removeAggregateDocuments(removeMsp: AggregateVC[]): Promise<void> {
        await this.remove(AggregateVC, removeMsp);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async createAggregateDocuments(item: VcDocumentCollection, blockId: string): Promise<void> {
        (item as any).blockId = blockId;
        const newVC = this.create(AggregateVC, item);
        await this.save(AggregateVC, newVC);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async getVcDocument(filters: any): Promise<VcDocumentCollection> {
        return await this.findOne(VcDocumentCollection, filters);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async getVpDocument(filters: any): Promise<VpDocumentCollection> {
        return await this.findOne(VpDocumentCollection, filters);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async getApprovalDocument(filters: any): Promise<ApprovalDocumentCollection> {
        return await this.findOne(ApprovalDocumentCollection, filters);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async getVcDocuments(filters: any): Promise<VcDocumentCollection[]> {
        return await this.find(VcDocumentCollection, filters);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async getVpDocuments(filters: any): Promise<VpDocumentCollection[]> {
        return await this.find(VpDocumentCollection, filters);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async getDidDocuments(filters: any): Promise<DidDocumentCollection[]> {
        return await this.find(DidDocumentCollection, filters);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async getApprovalDocuments(filters: any): Promise<ApprovalDocumentCollection[]> {
        return await this.find(ApprovalDocumentCollection, filters);
    }

    /**
     * 
     * @param filters
     * 
     * @virtual
     */
    public async getDocumentStates(filters: any): Promise<DocumentState[]> {
        return await this.find(DocumentState, filters);
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

    public async getTokenById(tokenId: string): Promise<TokenCollection> {
        return await getMongoRepository(TokenCollection).findOne({ tokenId });
    }

    /**
     * Get Topics
     * @param topic
     * 
     * @virtual
     */
    public async saveTopic(topic: TopicCollection): Promise<TopicCollection> {
        const topicObject = this.create(TopicCollection, topic);
        return await this.save(TopicCollection, topicObject);
    }

    public async getSchemaByIRI(iri: string, topicId?: string): Promise<SchemaCollection> {
        if (topicId) {
            return await getMongoRepository(SchemaCollection).findOne({ iri, topicId });
        } else {
            return await getMongoRepository(SchemaCollection).findOne({ iri });
        }
    }

    /**
     * Get schema
     * @param topicId
     * @param entity
     */
    public async getSchemaByType(topicId: string, entity: SchemaEntity): Promise<SchemaCollection> {
        return await getMongoRepository(SchemaCollection).findOne({
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
     * Get user role in policy
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
        return await getMongoRepository(SchemaCollection).findOne({
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
        return await getMongoRepository(SchemaCollection).findOne({
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
        return await getMongoRepository(SchemaCollection).find(filters);
    }

    /**
     * Delete schemas
     * @param id
     */
    public static async deleteSchemas(id: any): Promise<void> {
        await getMongoRepository(SchemaCollection).delete(id);
    }

    /**
     * Update schema
     * @param id
     * @param item
     */
    public static async updateSchema(id: any, item: SchemaCollection): Promise<void> {
        await getMongoRepository(SchemaCollection).update(id, item);
    }


    /**
     * Get schemas
     * @param filters
     */
    public static async getSchema(filters?: any): Promise<SchemaCollection> {
        return await getMongoRepository(SchemaCollection).findOne(filters);
    }

    /**
     * Get schema
     * @param item
     */
    public static createSchema(item: DeepPartial<SchemaCollection>): SchemaCollection {
        return getMongoRepository(SchemaCollection).create(item);
    }

    /**
     * Get schema
     * @param item
     */
    public static async saveSchema(item: SchemaCollection): Promise<SchemaCollection> {
        return await getMongoRepository(SchemaCollection).save(item);
    }

    /**
     * Get schema
     * @param item
     */
    public static async saveSchemas(item: SchemaCollection[]): Promise<SchemaCollection[]> {
        return await getMongoRepository(SchemaCollection).save(item);
    }

    /**
     * Get schema
     * @param item
     */
    public static async createAndSaveSchema(item: DeepPartial<SchemaCollection>): Promise<SchemaCollection> {
        const newItem = getMongoRepository(SchemaCollection).create(item);
        return await getMongoRepository(SchemaCollection).save(newItem);
    }

    /**
     * Get schema
     * @param filters
     */
    public static async getSchemasAndCount(filters?: any): Promise<[SchemaCollection[], number]> {
        return await getMongoRepository(SchemaCollection).findAndCount(filters);
    }

    /**
     * Get schema
     * @param ids
     */
    public static async getSchemasByIds(ids: string[]): Promise<SchemaCollection[]> {
        return await getMongoRepository(SchemaCollection).findByIds(ids);
    }

    /**
     * Get schema
     * @param filters
     */
    public static async getSchemasCount(filters?: any): Promise<number> {
        return await getMongoRepository(SchemaCollection).count(filters);
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
        const role = await getMongoRepository(PolicyRolesCollection).findOne({ policyId, did });
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
        return await getMongoRepository(Policy).findOne(filters);
    }

    /**
     * Get policies
     * @param filters
     */
    public static async getPolicies(filters: any): Promise<Policy[]> {
        return await getMongoRepository(Policy).find(filters);
    }

    /**
     * Get policy by id
     * @param policyId
     */
    public static async getPolicyById(policyId: string): Promise<Policy> {
        return await getMongoRepository(Policy).findOne(policyId);
    }

    /**
     * Get policy by uuid
     * @param uuid
     */
    public static async getPolicyByUUID(uuid: string): Promise<Policy> {
        return await getMongoRepository(Policy).findOne({ uuid });
    }

    /**
     * Get policy by tag
     * @param policyTag
     */
    public static async getPolicyByTag(policyTag: string): Promise<Policy> {
        return await getMongoRepository(Policy).findOne({ policyTag });
    }


    /**
     * Get policy
     * @param model
     */
    public static async updatePolicy(model: Policy): Promise<Policy> {
        return await getMongoRepository(Policy).save(model);
    }

    /**
     * Get policies and count
     * @param filters
     */
    public static async getPoliciesAndCount(filters: any): Promise<[Policy[], number]> {
        return await getMongoRepository(Policy).findAndCount(filters);
    }

    /**
     * Get policy count
     * @param filters
     */
    public static async getPolicyCount(filters: any): Promise<number> {
        return await getMongoRepository(Policy).count(filters);
    }

    /**
     * Create policy
     * @param data
     */
    public static createPolicy(data: DeepPartial<Policy>): Policy {
        if (!data.config) {
            data.config = {
                'blockType': 'interfaceContainerBlock',
                'permissions': [
                    'ANY_ROLE'
                ]
            }
        }
        const model = getMongoRepository(Policy).create(data);
        return model;
    }

    /**
     * Get topic by id
     * @param topicId
     */
    public static async getTopicById(topicId: string): Promise<TopicCollection> {
        return await getMongoRepository(TopicCollection).findOne({ topicId });
    }

    /**
     * Get topic by type
     * @param owner
     * @param type
     */
    public static async getTopicByType(owner: string, type: TopicType): Promise<TopicCollection> {
        return await getMongoRepository(TopicCollection).findOne({ owner, type });
    }

    /**
     * Save topic
     * @param row
     */
    public static async saveTopic(row: DeepPartial<TopicCollection>): Promise<TopicCollection> {
        const doc = getMongoRepository(TopicCollection).create(row);
        return await getMongoRepository(TopicCollection).save(doc);
    }

    /**
     * Update topic
     * @param row
     */
    public static async updateTopic(row: TopicCollection): Promise<void> {
        await getMongoRepository(TopicCollection).update(row.id, row);
    }

    /**
     * Save VC
     * @param row
     * 
     * @virtual
     */
    public static async saveVC(row: DeepPartial<VcDocumentCollection>): Promise<VcDocumentCollection> {
        const doc = getMongoRepository(VcDocumentCollection).create(row);
        return await getMongoRepository(VcDocumentCollection).save(doc);
    }

    /**
     * Update policy
     * @param policyId
     * @param data
     * @private
     */
    public static async updatePolicyConfig(policyId: any, data: Policy): Promise<Policy> {
        const model = await getMongoRepository(Policy).findOne(policyId);
        model.config = data.config;
        model.name = data.name;
        model.version = data.version;
        model.description = data.description;
        model.topicDescription = data.topicDescription;
        model.policyRoles = data.policyRoles;
        model.policyTopics = data.policyTopics;
        return await getMongoRepository(Policy).save(model);
    }

    public static async createVirtualUser(
        policyId: string,
        username: string,
        did: string,
        hederaAccountId: string,
        hederaAccountKey: string,
        active: boolean = false
    ): Promise<void> {
        const user = getMongoRepository(DryRun).create({
            dryRunId: policyId,
            dryRunClass: 'VirtualUsers',
            did,
            username: username,
            hederaAccountId: hederaAccountId,
            active
        });

        await getMongoRepository(DryRun).save(user);

        const key = getMongoRepository(DryRun).create({
            dryRunId: policyId,
            dryRunClass: 'VirtualKey',
            did: did,
            type: did,
            hederaAccountKey: hederaAccountKey
        });

        await getMongoRepository(DryRun).save(key);
    }

    public static async getVirtualUser(policyId: string): Promise<any> {
        return await getMongoRepository(DryRun).findOne({
            dryRunId: policyId,
            dryRunClass: 'VirtualUsers',
            active: true
        });
    }

    public static async getVirtualUsers(policyId: string): Promise<any[]> {
        return (await getMongoRepository(DryRun).find({
            dryRunId: policyId,
            dryRunClass: 'VirtualUsers'
        })) as any;
    }

    public static async setVirtualUser(policyId: string, did: string): Promise<any> {
        const items = (await getMongoRepository(DryRun).find({
            dryRunId: policyId,
            dryRunClass: 'VirtualUsers',
        }));
        for (const item of items) {
            item.active = item.did === did;
        }
        await getMongoRepository(DryRun).save(items);
    }

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
        const _pageSize = parseInt(pageSize, 10);
        const _pageIndex = parseInt(pageIndex, 10);
        if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
            filters.order = { createDate: 'DESC' };
            filters.take = _pageSize;
            filters.skip = _pageIndex * _pageSize;
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
        return await getMongoRepository(DryRun).findAndCount(filters);
    }

    public static async setVirtualTransaction(
        policyId: string,
        type: string,
        operatorId?: string
    ): Promise<any> {
        const user = getMongoRepository(DryRun).create({
            dryRunId: policyId,
            dryRunClass: 'Transactions',
            type,
            hederaAccountId: operatorId
        });
        await getMongoRepository(DryRun).save(user);
    }

    public static async setVirtualFile(
        policyId: string,
        file: ArrayBuffer,
        url: any
    ): Promise<any> {
        const user = getMongoRepository(DryRun).create({
            dryRunId: policyId,
            dryRunClass: 'Files',
            document: {
                size: file?.byteLength
            },
            documentURL: url?.url
        });
        await getMongoRepository(DryRun).save(user);
    }
}