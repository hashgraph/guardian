import {
    DatabaseServer,
    KeyType,
    MessageAction,
    MessageServer,
    TopicConfig,
    Users,
    VCMessage,
    VPMessage,
    VcDocument,
    VcDocumentDefinition,
    VcHelper,
    VpDocument,
    VpDocumentDefinition,
    Wallet,
} from '@guardian/common';
import {
    DocumentStatus,
    MigrationConfig,
    Schema,
    SchemaCategory,
    SchemaHelper,
} from '@guardian/interfaces';
import { INotifier } from '@helpers/notifier';

export class PolicyDataMigrator {
    constructor(
        private readonly _users: Users,
        private readonly _wallet: Wallet,
        private readonly _notifier?: INotifier
    ) { }

    async migratePolicyData(owner: string, migrationConfig: MigrationConfig) {
        if (!owner) {
            throw new Error('Invalid owner');
        }
        if (!migrationConfig) {
            throw new Error('Invalid migration config');
        }

        const { policies, vcs, vps, schemas, groups, roles } = migrationConfig;
        const { src, dst } = policies;

        const srcModel = await DatabaseServer.getPolicy({
            id: src,
            owner,
        });
        if (!srcModel) {
            throw new Error(`Can't find source policy`);
        }

        const dstModel = await DatabaseServer.getPolicy({
            id: dst,
            owner,
        });
        if (!dstModel) {
            throw new Error(`Can't find destination policy`);
        }

        const srcSystemSchemas = await DatabaseServer.getSchemas({
            category: SchemaCategory.SYSTEM,
            topicId: srcModel.topicId,
        });
        const dstSystemSchemas = await DatabaseServer.getSchemas({
            category: SchemaCategory.SYSTEM,
            topicId: dstModel.topicId,
        });
        for (const schema of srcSystemSchemas) {
            const dstSchema = dstSystemSchemas.find(
                (item) => item.entity === schema.entity
            );
            if (dstSchema) {
                schemas[schema.iri] = dstSchema.iri;
            }
        }

        const srcVCs = await DatabaseServer.getVCs({
            policyId: src,
            id: { $in: vcs },
        });
        const srcVPs = await DatabaseServer.getVPs({
            policyId: src,
            id: { $in: vps },
        });
        const publishedDocuments = new Map<string, VcDocument | VpDocument>();
        const errors = [];

        const republishDocument = async (
            doc: VcDocument | (VpDocument & { group?: string })
        ) => {
            if (!doc) {
                return doc;
            }
            doc.relationships = doc.relationships || [];
            for (let i = 0; i < doc.relationships.length; i++) {
                const relationship = doc.relationships[i];
                let republishedDocument = publishedDocuments.get(relationship);
                if (!republishedDocument) {
                    const rs = srcVCs.find(
                        (item) => item.messageId === relationship
                    );
                    if (!rs) {
                        if (doc instanceof VcDocument) {
                            doc.relationships.splice(i, 1);
                            i--;
                        }
                        continue;
                    }
                    republishedDocument = await republishDocument(rs);
                }
                if (republishedDocument) {
                    doc.relationships[i] = republishedDocument.messageId;
                } else {
                    if (doc instanceof VcDocument) {
                        doc.relationships.splice(i, 1);
                        i--;
                    }
                    continue;
                }
            }

            if (publishedDocuments.has(doc.messageId)) {
                return doc;
            }

            if (doc.messageId) {
                publishedDocuments.set(doc.messageId, doc);
            }

            const root = await this._users.getUserById(owner);
            const rootKey = await this._wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
            );
            const topic = await TopicConfig.fromObject(
                await DatabaseServer.getTopicById(dstModel.instanceTopicId),
                true
            );

            let userRole;
            if (doc.group) {
                const srcGroup = await DatabaseServer.getGroupByID(
                    src,
                    doc.group
                );
                const dstUserGroup = await DatabaseServer.getGroupsByUser(
                    dst,
                    doc.owner
                );
                userRole = dstUserGroup.find(
                    (item) =>
                        item.groupName === groups[srcGroup.groupName] ||
                        item.role === roles[srcGroup.role]
                );
                doc.group = userRole ? userRole.uuid : null;
            }

            if (doc instanceof VcDocument) {
                let vc: VcDocumentDefinition;
                const schema = await DatabaseServer.getSchema({
                    topicId: dstModel.topicId,
                    iri: schemas[doc.schema],
                });
                if (doc.schema !== schema.iri) {
                    this._notifier?.info(`Resigning VC ${doc.id}`);

                    const _vcHelper = new VcHelper();
                    const didDocument = await _vcHelper.loadDidDocument(root.did);
                    const credentialSubject = SchemaHelper.updateObjectContext(
                        new Schema(schema),
                        doc.document.credentialSubject[0]
                    );
                    const res = await _vcHelper.verifySubject(
                        credentialSubject
                    );
                    if (!res.ok) {
                        errors.push({
                            error: res.error.type,
                            id: doc.id,
                        });
                        return;
                    }
                    vc = await _vcHelper.createVerifiableCredential(
                        credentialSubject,
                        didDocument,
                        null,
                        { uuid: doc.document.id }
                    );
                    doc.hash = vc.toCredentialHash();
                    doc.document = vc.toJsonTree();
                    doc.schema = schema.iri;
                } else {
                    vc = VcDocumentDefinition.fromJsonTree(doc.document);
                }
                doc.policyId = dst;

                if (doc.messageId) {
                    this._notifier?.info(`Publishing VC ${doc.id}`);

                    const messageServer = new MessageServer(
                        root.hederaAccountId,
                        rootKey
                    );
                    const vcMessage = new VCMessage(MessageAction.MigrateVC);
                    vcMessage.setDocument(vc);
                    vcMessage.setDocumentStatus(
                        doc.option?.status || DocumentStatus.NEW
                    );
                    vcMessage.setRelationships([
                        ...doc.relationships,
                        doc.messageId,
                    ]);
                    if (userRole && schema.category === SchemaCategory.POLICY) {
                        vcMessage.setUser(userRole.messageId);
                    }
                    const message = vcMessage;
                    const vcMessageResult = await messageServer
                        .setTopicObject(topic)
                        .sendMessage(message, true);
                    doc.messageId = vcMessageResult.getId();
                    doc.topicId = vcMessageResult.getTopicId();
                    doc.messageHash = vcMessageResult.toHash();
                }
            }

            if (doc instanceof VpDocument) {
                // tslint:disable-next-line:no-shadowed-variable
                const vcs = doc.document.verifiableCredential.map((item) =>
                    VcDocumentDefinition.fromJsonTree(item)
                );
                let vpChanged = false;
                // tslint:disable-next-line:prefer-for-of
                for (let i = 0; i < doc.relationships.length; i++) {
                    const relationship = doc.relationships[i];
                    // tslint:disable-next-line:no-shadowed-variable
                    const vc = publishedDocuments.get(relationship);
                    if (vc && vc instanceof VcDocument) {
                        for (let j = 0; j < vcs.length; j++) {
                            const element = vcs[j];
                            const vcDef = VcDocumentDefinition.fromJsonTree(
                                vc.document
                            );
                            if (
                                element.getId() === vcDef.getId() &&
                                element.toCredentialHash() !==
                                vcDef.toCredentialHash()
                            ) {
                                vpChanged = true;
                                vcs[j] = vcDef;
                            }
                        }
                    }
                }

                let vp;
                if (vpChanged) {
                    this._notifier?.info(`Resigning VP ${doc.id}`);
                    const _vcHelper = new VcHelper();
                    const didDocument = await _vcHelper.loadDidDocument(root.did);
                    vp = await _vcHelper.createVerifiablePresentation(
                        vcs,
                        didDocument,
                        null,
                        { uuid: doc.document.id }
                    );
                    doc.hash = vp.toCredentialHash();
                    doc.document = vp.toJsonTree() as any;
                } else {
                    vp = VpDocumentDefinition.fromJsonTree(doc.document);
                }

                doc.policyId = dst;
                if (doc.messageId) {
                    this._notifier?.info(`Publishing VP ${doc.id}`);
                    const messageServer = new MessageServer(
                        root.hederaAccountId,
                        rootKey
                    );
                    const vpMessage = new VPMessage(MessageAction.MigrateVP);
                    vpMessage.setDocument(vp);
                    vpMessage.setRelationships([
                        ...doc.relationships,
                        doc.messageId,
                    ]);
                    const vpMessageResult = await messageServer
                        .setTopicObject(topic)
                        .sendMessage(vpMessage);
                    const vpMessageId = vpMessageResult.getId();
                    doc.messageId = vpMessageId;
                    doc.topicId = vpMessageResult.getTopicId();
                    doc.messageHash = vpMessageResult.toHash();
                }
            }

            if (doc.messageId) {
                publishedDocuments.set(doc.messageId, doc);
            }

            return doc;
        };

        this._notifier?.start(`Migrate ${srcVCs.length} VC documents`);
        for (const vc of srcVCs as VcDocument[]) {
            const doc = await republishDocument(vc);
            if (doc) {
                delete doc.id;
                delete doc._id;
            }
        }
        this._notifier?.completedAndStart(`Save migrated VC documents`);
        await DatabaseServer.saveVCs(srcVCs);

        this._notifier?.completedAndStart(
            `Migrate ${srcVPs.length} VP documents`
        );
        for (const vp of srcVPs as VpDocument[]) {
            const doc = await republishDocument(vp);
            delete doc.id;
            delete doc._id;
        }
        this._notifier?.completedAndStart(`Save migrated VP documents`);
        await DatabaseServer.saveVPs(srcVPs);

        return errors;
    }
}
