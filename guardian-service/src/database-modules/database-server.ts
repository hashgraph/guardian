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
    private readonly dryRun: boolean = false;

    /**
     * Dry-run
     * @private
     */
    private readonly classMap: Map<any, string> = new Map();

    /**
     * Policy id
     */
    public policyId: string;

    constructor(dryRun: boolean = false, policyId: string = null) {
        this.dryRun = dryRun || false;
        this.policyId = policyId || null;

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
     * Set policy id
     * @param id
     */
    public setPolicyId(id: string): void {
        this.policyId = id;
    }

    public async clearDryRun(): Promise<void> {
        const item = await getMongoRepository(DryRun).find({ dryRunId: this.policyId });
        await getMongoRepository(DryRun).remove(item);
    }

    private async findOne<T>(entityClass: EntityTarget<T>, filters: any): Promise<T> {
        if (this.dryRun) {
            const _filters: any = { ...filters };
            if(_filters.where) {
                _filters.where.dryRunId = this.policyId;
                _filters.where.dryRunClass = this.classMap.get(entityClass);
            } else {
                _filters.dryRunId = this.policyId;
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
            if(_filters.where) {
                _filters.where.dryRunId = this.policyId;
                _filters.where.dryRunClass = this.classMap.get(entityClass);
            } else {
                _filters.dryRunId = this.policyId;
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
            _item.dryRunId = this.policyId;
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

    public async getBlockState(policyId: string, uuid: string): Promise<BlockState> {
        return await this.findOne(BlockState, {
            policyId: policyId,
            blockId: uuid
        });
    }

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
     */
    public async updateVCRecordById(row: VcDocumentCollection): Promise<VcDocumentCollection> {
        await this.update(VcDocumentCollection, row.id, row);
        return row;
    }

    /**
     * Update did record
     * @param row
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
     */
    public async updateVPRecord(row: VpDocumentCollection): Promise<VpDocumentCollection> {
        const doc = this.create(VpDocumentCollection, row);
        return await this.save(VpDocumentCollection, doc);
    }

    /**
     * Update Approval record
     * @param row
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
     */
    public async saveVC(row: DeepPartial<VcDocumentCollection>): Promise<VcDocumentCollection> {
        const doc = this.create(VcDocumentCollection, row);
        return await this.save(VcDocumentCollection, doc);
    }

    /**
     * Save VP
     * @param row
     */
    public async saveVP(row: DeepPartial<VpDocumentCollection>): Promise<VpDocumentCollection> {
        const doc = this.create(VpDocumentCollection, row);
        return await this.save(VpDocumentCollection, doc);
    }

    public async saveDid(row: DeepPartial<DidDocumentCollection>): Promise<DidDocumentCollection> {
        const doc = this.create(DidDocumentCollection, row);
        return await this.save(DidDocumentCollection, doc);
    }

    public async getPolicy(policyId: string): Promise<Policy> {
        return await this.findOne(Policy, policyId);
    }

    public async getAggregateDocuments(policyId: string, blockId: string, owner?: string): Promise<AggregateVC[]> {
        if (owner) {
            return await this.find(AggregateVC, { policyId, blockId, owner });
        } else {
            return await this.find(AggregateVC, { policyId, blockId });
        }
    }

    public async removeAggregateDocuments(removeMsp: AggregateVC[]): Promise<void> {
        await this.remove(AggregateVC, removeMsp);
    }

    public async createAggregateDocuments(item: VcDocumentCollection, blockId: string): Promise<void> {
        (item as any).blockId = blockId;
        const newVC = this.create(AggregateVC, item);
        await this.save(AggregateVC, newVC);
    }

    public async getVcDocument(filters: any): Promise<VcDocumentCollection> {
        return await this.findOne(VcDocumentCollection, filters);
    }

    public async getVpDocument(filters: any): Promise<VpDocumentCollection> {
        return await this.findOne(VpDocumentCollection, filters);
    }

    public async getApprovalDocument(filters: any): Promise<ApprovalDocumentCollection> {
        return await this.findOne(ApprovalDocumentCollection, filters);
    }

    public async getVcDocuments(filters: any): Promise<VcDocumentCollection[]> {
        return await this.find(VcDocumentCollection, filters);
    }

    public async getVpDocuments(filters: any): Promise<VpDocumentCollection[]> {
        return await this.find(VpDocumentCollection, filters);
    }

    public async getDidDocuments(filters: any): Promise<DidDocumentCollection[]> {
        return await this.find(DidDocumentCollection, filters);
    }

    public async getApprovalDocuments(filters: any): Promise<ApprovalDocumentCollection[]> {
        return await this.find(ApprovalDocumentCollection, filters);
    }

    public async getDocumentStates(filters: any): Promise<DocumentState[]> {
        return await this.find(DocumentState, filters);
    }

    /**
     * Get Topic
     * @param filters
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
}