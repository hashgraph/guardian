import { PolicyUtils } from './helpers/utils.js';
import { PolicyComponentsUtils } from './policy-components-utils.js';
import { PolicyUser } from './policy-user.js';
import { AnyBlockType, IPolicyDocument } from './policy-engine.interface.js';
import {
    DocumentStatus,
    IVC,
    Schema,
    SchemaEntity
} from '@guardian/interfaces';
import { PolicyActionsUtils } from './policy-actions/utils.js';
import { VcDocument } from '@guardian/common/dist/hedera-modules/vcjs/vc-document.js';
import {
    VCMessage,
    MessageAction,
    Message,
    MessageMemo,
    DatabaseServer,
    TopicConfig,
} from '@guardian/common';

export class PolicyVcDocumentsUtils {
    public static async getAllVersionVcDocuments(
        documentId: any
    ): Promise<any[]> {
        const docs: any[] = [];

        const db = new DatabaseServer();
        const firstVCDocument = await db.getVcDocument({
            id: documentId,
        });

        if (!firstVCDocument) {
            return docs;
        }

        docs.push(firstVCDocument);

        if (firstVCDocument?.oldVersion) {
            const conditions = [];
            if (firstVCDocument.id) {
                conditions.push({ initId: firstVCDocument.id });
            }

            if (firstVCDocument.messageId) {
                conditions.push({ initId: firstVCDocument.messageId });
            }

            if (firstVCDocument.initId) {
                conditions.push({ initId: firstVCDocument.initId });
            }

            const vcDocuments = await db.getVcDocuments({
                $or: conditions,
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
            policyId,
            owner: user.did,
        });

        if (!documentRef) {
            throw new Error('Document not found.');
        }

        const relayerAccount = await PolicyVcDocumentsUtils.getRelayerAccount(
            ref,
            user.did,
            documentRef,
            user.userId
        );

        const oldVCDoc = documentRef.document;
        let newCredentialSubject = null;
        if (Array.isArray(oldVCDoc.credentialSubject)) {
            newCredentialSubject = structuredClone(
                oldVCDoc.credentialSubject[0]
            );
        } else {
            newCredentialSubject = structuredClone(oldVCDoc.credentialSubject);
        }

        const schema = await PolicyVcDocumentsUtils.getSchema(db, newCredentialSubject);
        const updatableFields = schema.searchFields(
            (f) => f.isUpdatable === true
        );

        //mapping Updatable Fields for new values
        updatableFields.forEach((field) => {
            const path = field.path;
            const value = PolicyVcDocumentsUtils.getNestedValue(document, path);

            if (value !== undefined && value !== null) {
                const normalizedValue =
                    Array.isArray(value) && value.length === 1
                        ? value[0]
                        : value;
                PolicyVcDocumentsUtils.setNestedValue(
                    newCredentialSubject,
                    path,
                    normalizedValue
                );
            }
        });

        let newDoc = await PolicyVcDocumentsUtils.createVerifiableCredential(
            ref,
            oldVCDoc,
            user,
            newCredentialSubject,
            relayerAccount
        );

        PolicyVcDocumentsUtils.mapFilteredFields(documentRef, newDoc);
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
        const vcMessage = PolicyVcDocumentsUtils.createMessage(vc, newDoc, user, ref);

        if (documentRef.messageId) {
            newDoc.hash = vc.toCredentialHash();
            newDoc.messageHash = vcMessage.toHash();
            newDoc = await PolicyVcDocumentsUtils.sendToHedera(
                newDoc,
                vcMessage,
                ref,
                user.userId,
                documentRef.topicId
            );
        }

        await PolicyVcDocumentsUtils.saveVC(ref, newDoc, user.userId);
        documentRef.oldVersion = true;
        await PolicyVcDocumentsUtils.updateVC(ref, documentRef, user.userId);

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
            '#' + newCredentialSubject.type
        );
        const schema = new Schema(_schema);
        return schema;
    }

    private static getNestedValue(obj: any, path: string): any {
        const keys = path.split('.');

        const traverse = (current: any, keyIndex: number): any[] => {
            if (current === undefined || current === null) {
                return [];
            }

            const currentKey = keys[keyIndex];
            const isLastKey = keyIndex === keys.length - 1;

            if (Array.isArray(current)) {
                const allValues: any[] = [];

                current.forEach((item) => {
                    if (item && typeof item === 'object') {
                        if (isLastKey) {
                            if (item[currentKey] !== undefined) {
                                allValues.push(item[currentKey]);
                            }
                        } else {
                            const nestedValues = traverse(
                                item[currentKey],
                                keyIndex + 1
                            );
                            allValues.push(...nestedValues);
                        }
                    }
                });

                return allValues;
            } else if (current && typeof current === 'object') {
                if (isLastKey) {
                    return current[currentKey] !== undefined
                        ? [current[currentKey]]
                        : [];
                } else {
                    return traverse(current[currentKey], keyIndex + 1);
                }
            } else {
                return [];
            }
        };

        const values = traverse(obj, 0);
        return values.length > 0 ? values : undefined;
    }

    private static setNestedValue(obj: any, path: string, value: any): void {
        const keys = path.split('.');

        const traverseAndSet = (
            current: any,
            keyIndex: number,
            valueToSet: any
        ): void => {
            if (current === undefined || current === null) {
                return;
            }

            const currentKey = keys[keyIndex];
            const isLastKey = keyIndex === keys.length - 1;
            const isSecondLastKey = keyIndex === keys.length - 2;

            if (Array.isArray(current)) {
                if (isLastKey) {
                    if (Array.isArray(valueToSet)) {
                        current.forEach((item, index) => {
                            if (
                                item &&
                                typeof item === 'object' &&
                                index < valueToSet.length
                            ) {
                                item[currentKey] = valueToSet[index];
                            }
                        });
                    } else {
                        current.forEach((item) => {
                            if (item && typeof item === 'object') {
                                item[currentKey] = valueToSet;
                            }
                        });
                    }
                } else {
                    current.forEach((item, index) => {
                        if (item && typeof item === 'object') {
                            if (item[currentKey] === undefined) {
                                item[currentKey] = isSecondLastKey ? [] : {};
                            } else if (item[currentKey] === null) {
                                item[currentKey] = isSecondLastKey ? [] : {};
                            }
                            const nextValue =
                                Array.isArray(valueToSet) &&
                                index < valueToSet.length
                                    ? valueToSet[index]
                                    : valueToSet;

                            traverseAndSet(
                                item[currentKey],
                                keyIndex + 1,
                                nextValue
                            );
                        }
                    });
                }
            } else if (current && typeof current === 'object') {
                if (isLastKey) {
                    current[currentKey] = valueToSet;
                } else {
                    if (current[currentKey] === undefined) {
                        current[currentKey] = isSecondLastKey ? [] : {};
                    } else if (current[currentKey] === null) {
                        current[currentKey] = isSecondLastKey ? [] : {};
                    }

                    traverseAndSet(
                        current[currentKey],
                        keyIndex + 1,
                        valueToSet
                    );
                }
            }
        };

        traverseAndSet(obj, 0, value);
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
        const groupId = typeof issuer === 'object' ? issuer?.group : null;
        if (groupId) {
            const groupSchema = await PolicyUtils.loadSchemaByType(
                ref,
                SchemaEntity.ISSUER
            );
            groupContext = {
                groupId,
                context: groupSchema.contextURL,
                type: groupSchema.name,
            };
        }

        const uuid = oldVCDoc.id.split(':')[2];
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
            'hash',
            'signature',
            'hederaStatus',
            'messageHash',
            'messageId',
            'encryptedDocument',
            'encryptedDocumentFileId',
            'document',
            'relationships',
        ]);

        for (const key in source) {
            if (
                Object.prototype.hasOwnProperty.call(source, key) &&
                !excludeKeys.has(key) &&
                !key.startsWith('_')
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
                null,
                document
            );
            message.setMemo(memo);
            const topic = await PolicyVcDocumentsUtils.getTopic({
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
                topicId,
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
