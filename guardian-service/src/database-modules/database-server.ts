import { getMongoRepository } from 'typeorm';

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

    constructor(dryRun: boolean) {
        this.dryRun = dryRun || false;
    }

    public async saveBlockState(policyId: string, uuid: string, state: any): Promise<void> {
        const repo = getMongoRepository(BlockState);
        let stateEntity = await repo.findOne({
            policyId: policyId,
            blockId: uuid
        });
        if (!stateEntity) {
            stateEntity = repo.create({
                policyId: policyId,
                blockId: uuid,
            })
        }

        stateEntity.blockState = JSON.stringify(state);

        await repo.save(stateEntity);
    }

    public async getBlockState(policyId: string, uuid: string): Promise<BlockState> {
        return await getMongoRepository(BlockState).findOne({
            policyId: policyId,
            blockId: uuid
        });
    }

    public async saveDocumentState(documentId: string, status: any): Promise<DocumentState> {
        return await getMongoRepository(DocumentState).save({ documentId, status });
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
        let item = await getMongoRepository(VcDocumentCollection).findOne({
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
            await getMongoRepository(VcDocumentCollection).update(item.id, item);
        } else {
            item = getMongoRepository(VcDocumentCollection).create(row);
            updateStatus = !!item.option?.status;
            await getMongoRepository(VcDocumentCollection).save(item);
        }
        if (updateStatus) {
            getMongoRepository(DocumentState).save({
                documentId: item.id,
                status: item.option.status,
                reason: item.comment
            });
        }
        return item;
    }

    /**
     * Update VC record
     * @param row
     */
    public async updateVCRecordById(row: VcDocumentCollection): Promise<VcDocumentCollection> {
        await getMongoRepository(VcDocumentCollection).update(row.id, row);
        return row;
    }

    /**
     * Update did record
     * @param row
     */
    public async updateDIDRecord(row: DidDocumentCollection): Promise<DidDocumentCollection> {
        let item = await getMongoRepository(DidDocumentCollection).findOne({ did: row.did });
        if (item) {
            item.document = row.document;
            item.status = row.status;
            await getMongoRepository(DidDocumentCollection).update(item.id, item);
            return item;
        } else {
            item = getMongoRepository(DidDocumentCollection).create(row as DidDocumentCollection);
            return await getMongoRepository(DidDocumentCollection).save(item);
        }
    }

    /**
     * Update VP record
     * @param row
     */
    public async updateVPRecord(row: VpDocumentCollection): Promise<VpDocumentCollection> {
        return await getMongoRepository(VpDocumentCollection).save(row);
    }

    /**
     * Update Approval record
     * @param row
     */
    public async updateApprovalRecord(row: ApprovalDocumentCollection): Promise<ApprovalDocumentCollection> {
        let item: ApprovalDocumentCollection;
        if (row.id) {
            item = await getMongoRepository(ApprovalDocumentCollection).findOne(row.id);
        }
        if (item) {
            item.owner = row.owner;
            item.option = row.option;
            item.schema = row.schema;
            item.document = row.document;
            item.tag = row.tag;
            item.type = row.type;
        } else {
            item = getMongoRepository(ApprovalDocumentCollection).create(row as ApprovalDocumentCollection);
        }
        return await getMongoRepository(ApprovalDocumentCollection).save(item);
    }

    /**
     * Save VP
     * @param row
     */
    public async saveVP(row: VpDocumentCollection): Promise<VpDocumentCollection> {
        const doc = getMongoRepository(VpDocumentCollection).create(row);
        return await getMongoRepository(VpDocumentCollection).save(doc);
    }

    public async saveDid(row: DidDocumentCollection): Promise<DidDocumentCollection> {
        const doc = getMongoRepository(DidDocumentCollection).create(row);
        return await getMongoRepository(DidDocumentCollection).save(doc);
    }

    public async getPolicy(policyId: string): Promise<Policy> {
        return await getMongoRepository(Policy).findOne(policyId);
    }

    public async getSchemaByIRI(iri: string, topicId?: string): Promise<SchemaCollection> {
        if (topicId) {
            return await getMongoRepository(SchemaCollection).findOne({ iri, topicId });
        } else {
            return await getMongoRepository(SchemaCollection).findOne({ iri });
        }
    }

    public async getAggregateDocuments(policyId: string, blockId: string, owner?: string): Promise<AggregateVC[]> {
        if (owner) {
            return await getMongoRepository(AggregateVC).find({ policyId, blockId, owner });
        } else {
            return await getMongoRepository(AggregateVC).find({ policyId, blockId });
        }
    }

    public async removeAggregateDocuments(removeMsp: AggregateVC[]): Promise<void> {
        await getMongoRepository(AggregateVC).remove(removeMsp);
    }

    public async createAggregateDocuments(item: VcDocumentCollection, blockId: string): Promise<void> {
        (item as any).blockId = blockId;
        const newVC = getMongoRepository(AggregateVC).create(item);
        await getMongoRepository(AggregateVC).save(newVC);
    }

    public async getVcDocument(filters: any): Promise<VcDocumentCollection> {
        return await getMongoRepository(VcDocumentCollection).findOne(filters);
    }

    public async getVpDocument(filters: any): Promise<VpDocumentCollection> {
        return await getMongoRepository(VpDocumentCollection).findOne(filters);
    }

    public async getApprovalDocument(filters: any): Promise<ApprovalDocumentCollection> {
        return await getMongoRepository(ApprovalDocumentCollection).findOne(filters);
    }

    public async getVcDocuments(filters: any): Promise<VcDocumentCollection[]> {
        return await getMongoRepository(VcDocumentCollection).find(filters);
    }

    public async getVpDocuments(filters: any): Promise<VpDocumentCollection[]> {
        return await getMongoRepository(VpDocumentCollection).find(filters);
    }

    public async getDidDocuments(filters: any): Promise<DidDocumentCollection[]> {
        return await getMongoRepository(DidDocumentCollection).find(filters);
    }

    public async getApprovalDocuments(filters: any): Promise<ApprovalDocumentCollection[]> {
        return await getMongoRepository(ApprovalDocumentCollection).find(filters);
    }

    public async getDocumentStates(filters: any): Promise<DocumentState[]> {
        return await getMongoRepository(DocumentState).find(filters);
    }

    public async getTokenById(tokenId: string): Promise<TokenCollection> {
        return await getMongoRepository(TokenCollection).findOne({ tokenId });
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
        return await getMongoRepository(TopicCollection).findOne(filters);
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
        return await getMongoRepository(TopicCollection).find(filters);
    }

    /**
     * Get Topics
     * @param topic
     */
    public async createTopic(topic: TopicCollection): Promise<TopicCollection> {
        const topicObject = getMongoRepository(TopicCollection).create(topic);
        return await getMongoRepository(TopicCollection).save(topicObject);
    }
}