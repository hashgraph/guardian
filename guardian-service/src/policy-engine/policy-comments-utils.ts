import { DatabaseServer, IAuthUser, Policy, PolicyDiscussion, VcDocument, VcHelper, Schema as SchemaCollection, MessageServer, NewNotifier, Users, TopicConfig, TopicHelper, Wallet, KeyType, EncryptVcHelper } from '@guardian/common';
import { EntityOwner, GenerateUUIDv4, PolicyStatus, Schema, SchemaEntity, SchemaHelper, TopicType } from '@guardian/interfaces';
import { publishSystemSchema } from '../helpers/import-helpers/index.js';
import { PrivateKey } from '@hashgraph/sdk';
import * as crypto from 'crypto';

/**
 * Policy component utils
 */
export class PolicyCommentsUtils {
    public static isDryRun(policy: Policy) {
        if (policy.status === PolicyStatus.DRY_RUN || policy.status === PolicyStatus.DEMO) {
            return policy.id?.toString();
        } else {
            return undefined;
        }
    }

    public static generateKey(): string {
        return PrivateKey.generate().toString();
    }

    public static saveKey(
        did: string,
        discussionId: string,
        key: string,
    ): Promise<void> {
        const wallet = new Wallet();
        return wallet.setUserKey(
            did,
            KeyType.DISCUSSION,
            discussionId,
            key,
            null
        )
    }

    public static getKey(
        did: string,
        discussionId: string,
    ): Promise<string> {
        const wallet = new Wallet();
        return wallet.getUserKey(
            did,
            KeyType.DISCUSSION,
            discussionId,
            null
        )
    }

    public static async getTopic(policy: Policy): Promise<TopicConfig> {
        let topicConfig: TopicConfig;
        if (policy.commentsTopicId) {
            const topic = await DatabaseServer.getTopicById(policy.commentsTopicId);
            topicConfig = await TopicConfig.fromObject(topic, true, null);
        }
        if (!topicConfig) {
            const users = new Users();
            const user = await users.getUserById(policy.owner, null);
            const root = await users.getHederaAccount(policy.owner, user?.id);
            const topicHelper = new TopicHelper(
                root.hederaAccountId,
                root.hederaAccountKey,
                root.signOptions
            );
            const rootTopic = await DatabaseServer.getTopicById(policy.instanceTopicId);
            const rootTopicConfig = await TopicConfig.fromObject(rootTopic, true, user?.id);
            topicConfig = await topicHelper.create({
                type: TopicType.CommentsTopic,
                name: TopicType.CommentsTopic,
                description: TopicType.CommentsTopic,
                owner: policy.owner,
                policyId: policy.id,
                policyUUID: policy.uuid
            }, user.id, { admin: true, submit: false });
            await topicConfig.saveKeys(user.id);
            await DatabaseServer.saveTopic(topicConfig.toObject());
            await topicHelper.twoWayLink(topicConfig, rootTopicConfig, null, user.id);

            policy.commentsTopicId = topicConfig.topicId;
            await DatabaseServer.updatePolicy(policy);
        }
        return topicConfig;
    }

    public static async getSchema(
        entity: SchemaEntity,
        policy: Policy,
    ): Promise<SchemaCollection> {
        const dataBaseServer = new DatabaseServer();
        let schema: SchemaCollection;
        if (policy.topicId) {
            schema = await dataBaseServer.findOne(SchemaCollection, {
                entity,
                readonly: true,
                topicId: policy.topicId
            });
        }
        if (schema) {
            return schema;
        } else {
            schema = await dataBaseServer.findOne(SchemaCollection, {
                entity,
                system: true,
                active: true,
            });
            if (schema) {
                const users = new Users();
                const user = await users.getUserById(policy.owner, null);
                const owner = new EntityOwner(user);
                const root = await users.getHederaAccount(policy.owner, owner?.id);
                const topic = await DatabaseServer.getTopicById(policy.topicId);
                const topicConfig = await TopicConfig.fromObject(topic, true, user?.id);
                const messageServer = new MessageServer({
                    operatorId: root.hederaAccountId,
                    operatorKey: root.hederaAccountKey,
                    signOptions: root.signOptions
                }).setTopicObject(topicConfig);
                const item = await publishSystemSchema(schema, owner, messageServer, NewNotifier.empty());
                const result = await dataBaseServer.save(SchemaCollection, item);
                return result;
            } else {
                throw new Error(`Schema (${entity}) not found`);
            }
        }
    }

    public static async getRelationships(
        document: VcDocument,
        relationships?: string[]
    ): Promise<VcDocument[]> {
        const ids = new Set<string>();
        ids.add(document.id?.toString());
        if (relationships) {
            for (const relationship of relationships) {
                ids.add(relationship);
            }
        }
        const _ids = Array.from(ids).map((e) => DatabaseServer.dbID(e));
        const documents = await DatabaseServer.getVCs({
            policyId: document.policyId,
            _id: { $in: _ids },
        });
        return documents;
    }

    public static async getTargets(
        policyId: string,
        documentId: string
    ): Promise<string[]> {
        const target = await DatabaseServer.getVCById(documentId);
        if (!target || target.policyId !== policyId) {
            throw new Error('Document not found.');
        }

        const ids = new Set<string>();
        ids.add(target.id?.toString());

        if (target.startMessageId) {
            const documents = await DatabaseServer.getVCs({
                policyId,
                startMessageId: target.startMessageId
            }, { fields: ['_id', 'id', 'messageId'] } as any);
            for (const item of documents) {
                ids.add(item.id?.toString());
            }
        }

        return Array.from(ids);
    }

    /**
     * Check access
     * @param discussion
     * @param userDID
     * @param userRole
     */
    public static accessDiscussion(
        discussion: PolicyDiscussion,
        userDID: string,
        userRole: string
    ): boolean {
        if (!discussion) {
            return false;
        }
        if (discussion.owner === userDID) {
            return true;
        }
        if (discussion.system) {
            return true;
        }
        if (discussion.privacy === 'public') {
            return true;
        }
        if (
            discussion.privacy === 'users' &&
            Array.isArray(discussion.users) &&
            discussion.users.includes(userDID)
        ) {
            return true;
        }
        if (
            discussion.privacy === 'roles' &&
            Array.isArray(discussion.roles) &&
            discussion.roles.includes(userRole)
        ) {
            return true;
        }
        return false;
    }

    public static async findDocumentSchemas(vc: VcDocument) {
        const schemaIds = new Set<string>();
        if (vc?.document?.credentialSubject) {
            if (Array.isArray(vc.document.credentialSubject)) {
                for (const subject of vc.document.credentialSubject) {
                    const schemaId = `#${subject.type}`;
                    schemaIds.add(schemaId)
                }
            } else {
                const subject: any = vc.document.credentialSubject;
                const schemaId = `#${subject.type}`;
                schemaIds.add(schemaId)
            }
        }
        const schemas = await DatabaseServer.getSchemas({
            iri: Array.from(schemaIds)
        });
        return schemas;
    }

    public static async findDocumentRelationships(vc: VcDocument) {
        const map = new Map<string, string>();
        if (vc.messageId) {
            map.set(vc.messageId, null);
        }
        if (Array.isArray(vc.relationships)) {
            for (const messageId of vc.relationships) {
                await PolicyCommentsUtils.findRelationships(vc.policyId, messageId, map);
            }
        }
        map.delete(vc.messageId);

        const relationships: any[] = [];
        for (const [messageId, schemaIRI] of map.entries()) {
            const schema = await DatabaseServer.getSchema({ iri: schemaIRI });
            if (schema) {
                relationships.push({
                    label: schema.name,
                    value: messageId
                })
            }
        }
        return relationships;
    }

    private static async findRelationships(policyId: string, messageId: string, map: Map<string, string>) {
        if (map.has(messageId)) {
            return;
        }
        const vc = await DatabaseServer.getVC({ policyId, messageId }, {
            fields: [
                'id',
                'policyId',
                'messageId',
                'relationships',
                'schema'
            ] as any
        });
        if (!vc) {
            return;
        }

        map.set(messageId, vc.schema);
        if (Array.isArray(vc.relationships)) {
            for (const id of vc.relationships) {
                await PolicyCommentsUtils.findRelationships(vc.policyId, id, map);
            }
        }
    }

    public static async createDiscussion(
        user: IAuthUser,
        policy: Policy,
        document: VcDocument,
        data: {
            name?: string,
            parent?: string,
            field?: string,
            fieldName?: string,
            privacy?: string,
            roles?: string[],
            users?: string[],
            relationships?: string[]
        },
        messageKey: string
    ) {
        const name = data?.name || String(Date.now());
        const parent = data?.parent;
        const field = data?.field;
        const fieldName = data?.fieldName;
        const privacy = data?.privacy || 'public';
        const roles = privacy === 'roles' && Array.isArray(data?.roles) ? data?.roles : [];
        const users = privacy === 'users' && Array.isArray(data?.users) ? data?.users : [];
        const documents = await PolicyCommentsUtils.getRelationships(document, data?.relationships);

        const relationshipIds = documents.map((d) => d.id);
        const relationships = documents
            .filter((d) => d.messageId)
            .map((d) => d.messageId);

        const vcObject = await PolicyCommentsUtils.createDiscussionVC(user, policy, document, relationships, data);
        const vcDocument = vcObject.getDocument();
        const documentHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(vcDocument))
            .digest('base64')
            .toString();

        const encryptedDocument = await EncryptVcHelper.encrypt(JSON.stringify(vcDocument), messageKey);

        const discussion = {
            uuid: GenerateUUIDv4(),
            owner: user.did,
            creator: user.did,
            policyId: policy.id,
            target: document.messageId,
            targetId: document.id,
            system: false,
            count: 0,
            name,
            parent,
            field,
            fieldName,
            privacy,
            roles,
            users,
            relationships,
            relationshipIds,
            document: vcDocument,
            encryptedDocument,
            hash: documentHash
        };

        return discussion;
    }

    public static async createDiscussionVC(
        user: IAuthUser,
        policy: Policy,
        document: VcDocument,
        relationships: string[],
        data: {
            name?: string,
            parent?: string,
            field?: string,
            fieldName?: string,
            privacy?: string,
            roles?: string[],
            users?: string[],
            relationships?: string[]
        }
    ) {
        let credentialSubject: any = {};
        credentialSubject.id = GenerateUUIDv4();
        if (policy.instanceTopicId) {
            credentialSubject.policy = policy.instanceTopicId;
        }
        if (document.messageId) {
            credentialSubject.document = document.messageId;
        }
        if (data.name) {
            credentialSubject.name = data.name;
        }
        if (data.parent) {
            credentialSubject.parent = data.parent;
        }
        if (data.field) {
            credentialSubject.field = data.field;
        }
        if (data.privacy) {
            credentialSubject.privacy = data.privacy;
        }
        if (data.roles?.length) {
            credentialSubject.roles = data.roles;
        }
        if (data.users?.length) {
            credentialSubject.users = data.users;
        }
        if (relationships?.length) {
            credentialSubject.relationships = data.relationships;
        }
        const schema = await PolicyCommentsUtils.getSchema(SchemaEntity.POLICY_DISCUSSION, policy);
        if (schema) {
            const schemaObject = new Schema(schema);
            credentialSubject = SchemaHelper.updateObjectContext(schemaObject, credentialSubject);
        }
        const vcHelper = new VcHelper();
        const didDocument = await vcHelper.loadDidDocument(user.did, user.id);
        const vcObject = await vcHelper.createVerifiableCredential(credentialSubject, didDocument, null, null);
        return vcObject;
    }

    public static async createComment(
        user: IAuthUser,
        userRole: string,
        policy: Policy,
        document: VcDocument,
        discussion: PolicyDiscussion,
        data: {
            discussionId?: string;
            recipients?: string[];
            fields?: string[];
            text?: string;
            files?: {
                name: string;
                type: string;
                fileType: string;
                size: number;
                link: string;
                cid: string;
            }[];
        },
        messageKey: string
    ) {
        const fields = new Set<string>();
        if (Array.isArray(data.fields)) {
            for (const field of data.fields) {
                if (field) {
                    fields.add(field);
                }
            }
        }
        if (discussion.field) {
            fields.add(discussion.field);
        }

        const vcObject = await PolicyCommentsUtils.createCommentVC(
            user,
            userRole,
            policy,
            document,
            discussion,
            data
        );
        const vcDocument = vcObject.getDocument();
        const documentHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(vcDocument))
            .digest('base64')
            .toString();

        const encryptedDocument = await EncryptVcHelper.encrypt(JSON.stringify(vcDocument), messageKey);

        const comment = {
            timestamp: Date.now(),
            uuid: GenerateUUIDv4(),
            owner: user.did,
            creator: user.did,
            topicId: policy.commentsTopicId,
            policyId: policy.id,
            policyTopicId: policy.topicId,
            policyInstanceTopicId: policy.instanceTopicId,
            sender: user.did,
            senderRole: userRole,
            senderName: user.username,
            recipients: data.recipients,
            fields: Array.from(fields),
            field: discussion.field,
            target: document.messageId,
            targetId: document.id,
            relationships: discussion.relationships,
            relationshipIds: discussion.relationships,
            discussionId: discussion.id,
            discussionMessageId: discussion.messageId,
            isDocumentOwner: user.did === document.owner,
            text: data.text,
            document: vcDocument,
            encryptedDocument,
            hash: documentHash
        }

        return comment;
    }

    public static async createCommentVC(
        user: IAuthUser,
        userRole: string,
        policy: Policy,
        document: VcDocument,
        discussion: PolicyDiscussion,
        data: {
            discussionId?: string;
            recipients?: string[];
            fields?: string[];
            text?: string;
            files?: {
                name: string;
                type: string;
                fileType: string;
                size: number;
                link: string;
                cid: string;
            }[];
        }
    ) {
        let credentialSubject: any = {};
        credentialSubject.id = GenerateUUIDv4();
        if (discussion.messageId) {
            credentialSubject.discussion = discussion.messageId;
        }
        if (document.messageId) {
            credentialSubject.document = document.messageId;
        }
        if (policy.instanceTopicId) {
            credentialSubject.policy = policy.instanceTopicId;
        }
        if (data.text) {
            credentialSubject.text = data.text;
        }
        if (data.files?.length) {
            credentialSubject.files = [];
            for (const file of data.files) {
                credentialSubject.files.push({
                    name: file.name,
                    fileType: file.fileType || file.type,
                    size: file.size,
                    link: file.link,
                    cid: file.cid,
                })
            }
        }
        if (data.recipients?.length) {
            credentialSubject.users = data.recipients;
        }
        if (data.fields?.length) {
            credentialSubject.fields = data.fields;
        }
        if (user.did) {
            credentialSubject.sender = user.did;
        }
        if (userRole) {
            credentialSubject.senderRole = userRole;
        }
        if (user.username) {
            credentialSubject.senderName = user.username;
        }

        const schema = await PolicyCommentsUtils.getSchema(SchemaEntity.POLICY_COMMENT, policy);
        if (schema) {
            const schemaObject = new Schema(schema);
            credentialSubject = SchemaHelper.updateObjectContext(schemaObject, credentialSubject);
        }

        const vcHelper = new VcHelper();
        const didDocument = await vcHelper.loadDidDocument(user.did, user.id);
        const vcObject = await vcHelper.createVerifiableCredential(credentialSubject, didDocument, null, null);
        return vcObject;
    }
}