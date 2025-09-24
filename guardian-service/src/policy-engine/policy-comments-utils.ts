import { DatabaseServer, IAuthUser, Policy, PolicyDiscussion, VcDocument, VcHelper, Schema as SchemaCollection, MessageServer, NewNotifier, Users, TopicConfig, TopicHelper, Wallet, KeyType } from "@guardian/common";
import { EntityOwner, GenerateUUIDv4, IOwner, Schema, SchemaEntity, SchemaHelper, TopicType } from "@guardian/interfaces";
import { publishSystemSchema } from '../helpers/import-helpers/index.js';
import { PrivateKey } from "@hashgraph/sdk";

/**
 * Policy component utils
 */
export class PolicyCommentsUtils {
    public static generateKey(
        did: string,
        discussionId: string,
    ): Promise<void> {
        const key = PrivateKey.generate().toString();
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

    public static async getTopic(
        policy: Policy,
        user: IAuthUser | IOwner
    ): Promise<TopicConfig> {
        let topicConfig: TopicConfig;
        if (policy.commentsTopicId) {
            const topic = await DatabaseServer.getTopicById(policy.commentsTopicId);
            topicConfig = await TopicConfig.fromObject(topic, true, user?.id);
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
            topicConfig = await topicHelper.create({
                type: TopicType.CommentsTopic,
                name: TopicType.CommentsTopic,
                description: TopicType.CommentsTopic,
                owner: policy.owner,
                policyId: policy.id,
                policyUUID: policy.uuid
            }, user.id);
            await topicConfig.saveKeys(user.id);
            await DatabaseServer.saveTopic(topicConfig.toObject());
            await topicHelper.twoWayLink(topicConfig, null, null, user.id);

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
        let schema: SchemaCollection
        if (policy.commentsTopicId) {
            schema = await dataBaseServer.findOne(SchemaCollection, {
                entity,
                readonly: true,
                topicId: policy.commentsTopicId
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
                const topic = await PolicyCommentsUtils.getTopic(policy, owner);
                const messageServer = new MessageServer({
                    operatorId: root.hederaAccountId,
                    operatorKey: root.hederaAccountKey,
                    signOptions: root.signOptions
                }).setTopicObject(topic);
                const item = await publishSystemSchema(schema, owner, messageServer, NewNotifier.empty());
                const result = await dataBaseServer.save(SchemaCollection, item);
                return result;
            } else {
                throw new Error(`Schema (${entity}) not found`);
            }
        }
    }

    public static async getCommonDiscussion(
        policy: Policy,
        document: VcDocument,
    ) {
        try {
            const commonDiscussion = await DatabaseServer.getPolicyDiscussion({
                policyId: policy.id,
                documentId: document.id,
                system: true
            })
            if (commonDiscussion) {
                return commonDiscussion;
            }

            const users = new Users();
            const user = await users.getUserById(document.owner, null);
            const discussion = await PolicyCommentsUtils.createDiscussion(user, policy, document, {
                name: 'Common',
                privacy: 'public',
                relationships: [document.id]
            });

            return await DatabaseServer.createPolicyDiscussion(discussion);
        } catch (error) {
            return await DatabaseServer.getPolicyDiscussion({
                policyId: policy.id,
                documentId: document.id,
                system: true
            })
        }
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
            for (const messageId of vc.relationships) {
                await PolicyCommentsUtils.findRelationships(vc.policyId, messageId, map);
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
        }
    ) {
        const name = data?.name || String(Date.now());
        const parent = data?.parent;
        const field = data?.field;
        const fieldName = data?.fieldName;
        const privacy = data?.privacy || 'public';
        const roles = privacy === 'roles' && Array.isArray(data?.roles) ? data?.roles : [];
        const users = privacy === 'users' && Array.isArray(data?.users) ? data?.users : [];

        const documentIds = data?.relationships || [];
        if (!documentIds.includes(document.id)) {
            documentIds.push(document.id);
        }
        const documents = await DatabaseServer.getVCs({
            _id: { $in: documentIds.map((e) => DatabaseServer.dbID(e)) },
            messageId: { $exists: true }
        })
        const relationships = documents.map((d) => d.messageId);

        const vcObject = await PolicyCommentsUtils.createDiscussionVC(user, policy, document, data);

        const discussion = {
            uuid: GenerateUUIDv4(),
            owner: user.did,
            creator: user.did,
            policyId: policy.id,
            documentId: document.id,
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
            documentIds,
            document: vcObject.getDocument()
        };

        return discussion;
    }

    public static async createDiscussionVC(
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
        if (data.relationships?.length) {
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
                size: number;
                link: string;
                cid: string;
            }[];
        }
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
            discussionId: discussion.id,
            isDocumentOwner: user.did === document.owner,
            text: data.text,
            document: vcObject.getDocument()
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
            credentialSubject.files = data.files;
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