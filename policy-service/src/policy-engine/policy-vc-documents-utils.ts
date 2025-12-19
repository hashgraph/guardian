import { PolicyUtils } from "./helpers/utils.js";
import { PolicyComponentsUtils } from "./policy-components-utils.js";
import { PolicyUser } from "./policy-user.js";
import { AnyBlockType, IPolicyDocument } from "./policy-engine.interface.js";
import {
    DocumentStatus,
    IVC,
    Schema,
    SchemaEntity,
    TopicType,
} from "@guardian/interfaces";
import { PolicyActionsUtils } from "./policy-actions/utils.js";
import { VcDocument } from "@guardian/common/dist/hedera-modules/vcjs/vc-document.js";
import {
    VCMessage,
    MessageAction,
    Message,
    MessageMemo,
    DatabaseServer,
    TopicConfig,
} from "@guardian/common";

export class PolicyVcDocumentsUtils {
    public static async getAllVersionVcDocuments(
        documentId: any
    ): Promise<any[]> {
        let docs: any[] = [];

        const db = new DatabaseServer();
        const firstVCDocument = await db.getVcDocument({
            id: documentId,
        });

        if (!firstVCDocument) {
            return docs;
        }

        docs.push(firstVCDocument);

        if (firstVCDocument?.oldVersion) {
            const vcDocuments = await db.getVcDocuments({
                $or: [
                    { initId: firstVCDocument.id },
                    { initId: firstVCDocument.messageId },
                ],
            });

            if (Array.isArray(vcDocuments)) {
                docs.push(...vcDocuments);
            } else if (vcDocuments) {
                docs.push(vcDocuments);
            }
        }

        docs.sort(
            (a, b) =>
                new Date(b.createDate).getTime() -
                new Date(a.createDate).getTime()
        );
        return docs;
    }

    public static async createNewVersionVcDocuments(
        user: PolicyUser,
        policyId: string,
        data: any
    ): Promise<any> {
        const documentId = data.documentId;
        const document = data.document;

        const ref = PolicyComponentsUtils.GetPolicyInstance(policyId) as any;
        const db =
            PolicyComponentsUtils.GetPolicyInstance(policyId).components
                .databaseServer;

        const documentRef = await db.getVcDocument({
            id: documentId,
            policyId: policyId,
            owner: user.did,
        });

        if (!documentRef) {
            throw new Error("Document not found.");
        }

        const relayerAccount = await this.getRelayerAccount(
            ref,
            user.did,
            documentRef,
            user.userId
        );

        let oldVCDoc = documentRef.document;
        let newCredentialSubject = null;
        if (Array.isArray(oldVCDoc.credentialSubject)) {
            newCredentialSubject = structuredClone(
                oldVCDoc.credentialSubject[0]
            );
        } else {
            newCredentialSubject = structuredClone(oldVCDoc.credentialSubject);
        }

        const schema = await this.getSchema(db, newCredentialSubject);
        let updatableFields = schema.searchFields(
            (f) => f.isUpdatable === true
        );

        //mapping Updatable Fields for new values
        updatableFields.forEach((field) => {
            const path = field.path;
            const value = this.getNestedValue(document, path);

            if (value !== undefined && value !== null) {
                this.setNestedValue(newCredentialSubject, path, value);
            }
        });

        let newDoc = await this.createVerifiableCredential(
            ref,
            oldVCDoc,
            user,
            newCredentialSubject,
            relayerAccount
        );

        this.mapFilteredFields(documentRef, newDoc);
        if (Array.isArray(documentRef.relationships)) {
            newDoc.relationships = [...documentRef.relationships];
        } else {
            newDoc.relationships = [];
        }

        if (documentRef.messageId) {
            newDoc.relationships.push(documentRef.messageId);
        }

        newDoc.tag = documentRef.tag;
        newDoc.oldVersion = false;
        newDoc.initId =
            documentRef.initId || documentRef.messageId || documentRef.id;

        const vc = VcDocument.fromJsonTree(newDoc.document);
        const vcMessage = this.createMessage(vc, newDoc, user, ref);

        if (documentRef.messageId) {
            newDoc.hash = vc.toCredentialHash();
            newDoc.messageHash = vcMessage.toHash();
            newDoc = await this.sendToHedera(
                newDoc,
                vcMessage,
                ref,
                user.userId,
                documentRef.topicId
            );
        }

        await this.saveVC(ref, newDoc, user.userId);
        documentRef.oldVersion = true;
        await this.updateVC(ref, documentRef, user.userId);

        PolicyComponentsUtils.backup(policyId);
    }

    private static async getRelayerAccount(
        ref: AnyBlockType,
        did: string,
        documentRef: IPolicyDocument,
        userId: string | null
    ) {
        let account: string;
        if (documentRef) {
            account = await PolicyUtils.getDocumentRelayerAccount(
                ref,
                documentRef,
                userId
            );
        } else {
            account = await PolicyUtils.getUserRelayerAccount(
                ref,
                did,
                null,
                userId
            );
        }
        return account;
    }

    private static async getSchema(
        db: DatabaseServer,
        newCredentialSubject: any
    ) {
        const _schema = await db.getSchemaByIRI(
            "#" + newCredentialSubject.type
        );
        const schema = new Schema(_schema);
        return schema;
    }

    private static setNestedValue(obj, path, value) {
        const keys = path.split(".");
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
    }

    private static getNestedValue(obj, path) {
        return path.split(".").reduce((current, key) => {
            return current && current[key] !== undefined
                ? current[key]
                : undefined;
        }, obj);
    }

    private static async createVerifiableCredential(
        ref: any,
        oldVCDoc: IVC,
        user: PolicyUser,
        newCredentialSubject: any,
        relayerAccount: any
    ) {
        let groupContext = null;
        const issuer = oldVCDoc.issuer;
        const groupId = typeof issuer === "object" ? issuer?.group : null;
        if (groupId) {
            const groupSchema = await PolicyUtils.loadSchemaByType(
                ref,
                SchemaEntity.ISSUER
            );
            groupContext = {
                groupId: groupId,
                context: groupSchema.contextURL,
                type: groupSchema.name,
            };
        }

        const uuid = oldVCDoc.id.split(":")[2];
        const newVc = await PolicyActionsUtils.signVC({
            ref,
            subject: newCredentialSubject,
            issuer: user.did,
            relayerAccount,
            options: { uuid, group: groupContext },
            userId: user.userId,
        });

        return PolicyUtils.createVC(ref, user, newVc);
    }

    private static mapFilteredFields(source: any, target: any): void {
        const excludeKeys = new Set([
            "hash",
            "signature",
            "hederaStatus",
            "messageHash",
            "messageId",
            "encryptedDocument",
            "encryptedDocumentFileId",
            "document",
            "relationships",
        ]);

        for (const key in source) {
            if (
                Object.prototype.hasOwnProperty.call(source, key) &&
                !excludeKeys.has(key) &&
                !key.startsWith("_")
            ) {
                target[key] = structuredClone(source[key]);
            }
        }
    }

    private static createMessage(
        vc: VcDocument,
        item: IPolicyDocument,
        user: PolicyUser,
        ref: any
    ) {
        const vcMessage = new VCMessage(MessageAction.CreateVC);
        vcMessage.setDocument(vc);
        vcMessage.setDocumentStatus(item.option?.status || DocumentStatus.NEW);
        vcMessage.setRelationships(item.relationships);
        vcMessage.setTag(ref);
        vcMessage.setEntityType(ref);
        vcMessage.setOption(item, ref);
        vcMessage.setRef(item.startMessageId);
        vcMessage.setUser(user.roleMessage);
        vcMessage.setOwnerAccount(user.hederaAccountId);
        vcMessage.setInitId(item.initId);
        return vcMessage;
    }

    private static async sendToHedera(
        document: IPolicyDocument,
        message: Message,
        ref: AnyBlockType,
        userId: string | null,
        topicId: string | null
    ): Promise<IPolicyDocument> {
        try {
            const memo = MessageMemo.parseMemo(
                true,
                null, //ref.options.memo,
                document
            );
            message.setMemo(memo);
            const topic = await this.getTopic({
                ref,
                userId,
                topicId,
            });

            const vcMessageResult = await PolicyActionsUtils.sendMessage({
                ref,
                topic,
                message,
                owner: document.owner,
                relayerAccount: document.relayerAccount,
                updateIpfs: true,
                userId,
            });

            document.hederaStatus = DocumentStatus.ISSUE;
            document.messageId = vcMessageResult.getId();
            document.topicId = vcMessageResult.getTopicId();
            document.startMessageId =
                document.startMessageId || document.messageId;

            return document;
        } catch (error) {
            throw new Error(PolicyUtils.getErrorMessage(error));
        }
    }

    public static async getTopic(options: {
        ref: AnyBlockType;
        userId: string | null;
        topicId: string | null;
    }): Promise<TopicConfig> {
        const { ref, topicId, userId } = options;
        const needKey = PolicyActionsUtils.needKey(
            ref.policyStatus,
            ref.policyAvailability
        );
        const topic = await TopicConfig.fromObject(
            await ref.components.databaseServer.getTopic({
                policyId: ref.policyId,
                topicId: topicId,
            }),
            needKey,
            userId
        );
        return topic;
    }

    private static async saveVC(
        ref: AnyBlockType,
        document: IPolicyDocument,
        userId: string | null
    ): Promise<IPolicyDocument> {
        await PolicyUtils.encryptVC(ref, document, userId);
        return await ref.components.databaseServer.saveVC(document);
    }

    public static async updateVC(
        ref: AnyBlockType,
        document: any,
        userId: string | null
    ): Promise<IPolicyDocument> {
        await PolicyUtils.encryptVC(ref, document, userId);
        return await ref.components.databaseServer.updateVC(document);
    }
}
