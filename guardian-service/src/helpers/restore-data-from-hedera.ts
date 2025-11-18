import {
    DidDocument as DidDocumentCollection,
    DIDMessage,
    KeyType,
    MessageServer,
    MessageType,
    Policy as PolicyCollection,
    Schema as SchemaCollection,
    Singleton,
    Token,
    Topic,
    TopicMessage,
    Users,
    VcDocument as VcDocumentCollection,
    VcDocumentDefinition as VcDocument,
    VCMessage,
    VpDocument as VpDocumentCollection,
    VpDocumentDefinition as VpDocument,
    VPMessage,
    Wallet,
    Workers,
    PolicyImportExport,
    HederaDid,
    CommonDidDocument,
    Message,
    RegistrationMessage,
    PolicyMessage,
    IAuthUser,
    TokenMessage,
    SchemaMessage,
    MessageAction,
    VcHelper,
    UrlType,
    RoleMessage,
    GuardianRoleMessage,
    UserPermissionsMessage, PinoLogger, DatabaseServer,
    SchemaPackageMessage,
    ToolMessage,
    ToolImportExport,
    TagMessage,
} from '@guardian/common';
import {
    DidDocumentStatus,
    DocumentStatus,
    EntityOwner,
    ISchema,
    MintTransactionStatus,
    ModuleStatus,
    PolicyStatus,
    SchemaCategory,
    SchemaEntity,
    SchemaStatus,
    TagType,
    TokenType,
    TopicType,
    UserRole,
    WorkerTaskType
} from '@guardian/interfaces';
import { PolicyEngine } from '../policy-engine/policy-engine.js';
import { importTag, updateToolConfig } from './import-helpers/index.js';

/**
 * Restore data from hedera class
 */
@Singleton
export class RestoreDataFromHedera {
    /**
     * Workers
     * @private
     */
    private readonly workers: Workers;

    /**
     * Hello world topic id
     * @private
     */
    private readonly MAIN_TOPIC_ID = process.env.INITIALIZATION_TOPIC_ID;
    /**
     * Users service
     * @private
     */
    private readonly users: Users;
    /**
     * Wallet service
     * @private
     */
    private readonly wallet: Wallet;

    /**
     * Main topic update interval
     * @private
     */
    private readonly UPDATE_INTERVAL = 2 * 60 * 1000;

    /**
     * Last update
     * @private
     */
    private mainTopicLastUpdate = 0;

    /**
     * MainTopicMessages
     * @private
     */
    private mainTopicMessages: Message[] = [];

    constructor() {
        this.workers = new Workers();
        this.users = new Users();
        this.wallet = new Wallet();
    }

    /**
     * Read topic
     * @param topicId
     * @param userId
     * @private
     */
    private async readTopicMessages(topicId: string, userId: string | null): Promise<Message[]> {
        if (typeof topicId !== 'string') {
            throw new Error('Bad topicId');
        }

        const messages = await this.workers.addRetryableTask(
            {
                type: WorkerTaskType.GET_TOPIC_MESSAGES,
                data: {
                    dryRun: false,
                    topic: topicId,
                    payload: { userId }
                },
            },
            {
                priority: 10
            }
        );
        const result = [];
        let errors = 0;
        for (const m of messages) {
            try {
                const r = MessageServer.fromMessage<Message>(m.message, userId);
                r.setPayer(m.payer_account_id);
                r.setTopicId(topicId);
                r.setId(m.id);
                result.push(r);
            } catch (e) {
                ++errors;
            }
        }
        if (errors) {
            console.error(`Error: ${errors}/${result.length}`);
        }
        return result;
    }

    private async readTokenMessages(topicId, userId) {
        if (typeof topicId !== 'string') {
            throw new Error('Bad topicId');
        }

        const fullTokenInfo = await this.workers.addRetryableTask(
            {
                type: WorkerTaskType.GET_TOKEN_INFO,
                data: { tokenId: topicId, payload: { userId } },
            },
            {
                priority: 10
            }
        );

        return fullTokenInfo;
    }

    /**
     * Load documents
     * @param topicId
     * @param loadIPFS
     * @private
     */
    private async loadIPFS<T extends Message>(message: T): Promise<T> {
        try {
            console.log(`Load file: ${message.type}.`);
            return await MessageServer.loadIPFS(message);
        } catch (error) {
            console.error('Error: ', error);
        }
    }

    /**
     * Restore schema
     * @param s
     * @private
     */
    private async restoreSchema(s: SchemaMessage): Promise<void> {
        const [schema, context] = s.documents;
        const schemaObj: Partial<ISchema> = {
            uuid: s.uuid,
            name: s.name,
            description: s.description,
            entity: s.entity as any,
            status: SchemaStatus.PUBLISHED,
            readonly: false,
            document: schema,
            context,
            version: s.version,
            creator: s.owner,
            owner: s.owner,
            topicId: s.topicId?.toString(),
            messageId: s.id,
            documentURL: s.getDocumentUrl(UrlType.url),
            contextURL: s.getContextUrl(UrlType.url),
            iri: `#${s.uuid}&${s.version}`, // restore iri
            isOwner: true,
            isCreator: true,
            system: false,
            active: true,
            category: SchemaCategory.POLICY,
            codeVersion: s.codeVersion
        };
        const dataBaseServer = new DatabaseServer();

        const result = dataBaseServer.create(SchemaCollection, schemaObj);
        await dataBaseServer.save(SchemaCollection, result);
    }

    /**
     * Restore schema
     * @param s
     * @private
     */
    private async restoreSchemaPackage(s: SchemaPackageMessage): Promise<void> {
        const [documents, contexts, metadata] = s.documents;
        const schemas = metadata?.schemas || [];

        const dataBaseServer = new DatabaseServer();
        for (const schema of schemas) {
            const document = documents[schema.id];
            const context = contexts;
            const schemaObj: Partial<ISchema> = {
                uuid: schema.uuid,
                name: schema.name,
                description: schema.description,
                entity: schema.entity as any,
                status: SchemaStatus.PUBLISHED,
                readonly: false,
                document,
                context,
                version: schema.version,
                creator: schema.owner,
                owner: schema.owner,
                topicId: s.topicId?.toString(),
                messageId: s.id,
                documentURL: s.getDocumentUrl(UrlType.url),
                contextURL: s.getContextUrl(UrlType.url),
                iri: schema.id, // restore iri
                isOwner: true,
                isCreator: true,
                system: false,
                active: true,
                category: SchemaCategory.POLICY,
                codeVersion: schema.codeVersion
            };
            const result = dataBaseServer.create(SchemaCollection, schemaObj);
            await dataBaseServer.save(SchemaCollection, result);
        }
    }

    /**
     * Restore policy documents
     * @param topicMessages
     * @param owner
     * @param policyId
     * @param user
     * @param hederaAccountKey
     * @private
     */
    private async restorePolicyDocuments(
        topicMessages: Message[],
        owner: string,
        policyId: string,
        uuid: string,
        user: IAuthUser,
        hederaAccountKey: string
    ): Promise<void> {
        const dataBaseServer = new DatabaseServer();

        const didDocumentObjects = []
        const vcDocumentObjects = []
        const vpDocumentObjects = []

        const revokeDocumentsMap = new Map<string, string>();

        for (const row of topicMessages) {
            if (row.isRevoked()) {
                const revokeRow: any = row;
                revokeDocumentsMap.set(revokeRow.getMessageId(), revokeRow.reason);
            }
        }

        for (const row of topicMessages) {
            if (row.isRevoked()) {
                continue;
            }

            await this.loadIPFS(row);

            switch (row.constructor) {
                case DIDMessage: {
                    const message = row as DIDMessage;

                    didDocumentObjects.push({
                        did: message.document.id,
                        document: message.document,
                        status: DidDocumentStatus.CREATE,
                        messageId: message.id,
                        topicId: message.topicId,
                    });

                    break;
                }

                case VCMessage: {
                    const message = row as VCMessage;
                    const vcDoc = VcDocument.fromJsonTree(message.document);

                    const documentFields = ['id', 'credentialSubject.id', 'credentialSubject.0.id'];

                    const documentOptions = message.option || {};
                    documentOptions.status = (message.documentStatus && message.documentStatus !== DocumentStatus.NEW) ? message.documentStatus : message.option?.status;

                    const vcDocumentHash = vcDoc.toCredentialHash();
                    const existingVcDocument = await dataBaseServer.findOne(VcDocumentCollection, { hash: vcDocumentHash });

                    if (existingVcDocument) {
                        existingVcDocument.option = documentOptions;
                        existingVcDocument.type = message.entityType || `#${vcDoc.getSubjectType()}`;
                        existingVcDocument.schema = `#${vcDoc.getSubjectType()}`;
                        existingVcDocument.tag = message.tag;
                        existingVcDocument.relationships = message.relationships;
                        existingVcDocument.document = vcDoc.toJsonTree();
                        existingVcDocument.documentFields = documentFields;

                        if (revokeDocumentsMap.has(row.getMessageId())) {
                            existingVcDocument.option = existingVcDocument.option || {};
                            existingVcDocument.option.status = 'Revoked';
                            existingVcDocument.comment = revokeDocumentsMap.get(row.getMessageId());
                        }

                        await dataBaseServer.update(VcDocumentCollection, { hash: vcDocumentHash }, existingVcDocument);
                    } else {
                        const vcDocument = {
                            hash: vcDocumentHash,
                            owner,
                            messageId: message.id,
                            policyId,
                            topicId: message.topicId,
                            document: vcDoc.toJsonTree(),
                            documentFields,
                            type: message.entityType || `#${vcDoc.getSubjectType()}`,
                            schema: `#${vcDoc.getSubjectType()}`,
                            tag: message.tag,
                            relationships: message.relationships,
                            option: documentOptions,
                            comment: undefined,
                        }

                        if (revokeDocumentsMap.has(row.getMessageId())) {
                            vcDocument.option = vcDocument.option || {};
                            vcDocument.option.status = 'Revoked';
                            vcDocument.comment = revokeDocumentsMap.get(row.getMessageId());
                        }

                        vcDocumentObjects.push(vcDocument);
                    }

                    break;
                }

                case VPMessage: {
                    const message = row as VPMessage;
                    const vpDoc = VpDocument.fromJsonTree(message.document);

                    const documentFields = ['id', 'credentialSubject.id', 'credentialSubject.0.id', 'verifiableCredential.1.credentialSubject.0.tokenId'];

                    const vpDocument = {
                        hash: vpDoc.toCredentialHash(),
                        policyId,
                        owner,
                        messageId: message.id,
                        topicId: message.topicId,
                        document: vpDoc.toJsonTree(),
                        documentFields,
                        type: undefined,
                        relationships: message.relationships,
                    };

                    vpDocumentObjects.push(vpDocument);

                    break;
                }

                case TopicMessage: {
                    const message = row as TopicMessage;
                    if (
                        message.messageType === 'DYNAMIC_TOPIC' &&
                        message.childId
                    ) {
                        const messages = await this.readTopicMessages(message.childId, user.id);

                        const childTopicMessage = messages[0] as TopicMessage;
                        await this.restoreTopic(
                            {
                                topicId: message.childId,
                                name: childTopicMessage.name,
                                description: childTopicMessage.description,
                                owner: childTopicMessage.owner,
                                type: TopicType.DynamicTopic,
                                policyId,
                                policyUUID: uuid,
                            },
                            user,
                            null,
                            null
                        );

                        await this.restorePolicyDocuments(
                            messages,
                            owner,
                            policyId,
                            uuid,
                            user,
                            hederaAccountKey
                        );
                    }
                    break;
                }

                case RoleMessage: {
                    //Skip message
                    break;
                }

                case GuardianRoleMessage: {
                    //Skip message
                    break;
                }

                case UserPermissionsMessage: {
                    //Skip message
                    break;
                }

                default:
                    console.error('Unknown message type', row);
            }
        }

        await dataBaseServer.saveMany(DidDocumentCollection, didDocumentObjects);

        await dataBaseServer.saveMany(VcDocumentCollection, vcDocumentObjects);

        await dataBaseServer.saveMany(VpDocumentCollection, vpDocumentObjects);
    }

    /**
     * Restore policy
     * @param policyTopicId
     * @param owner
     * @param user
     * @param hederaAccountID
     * @param hederaAccountKey
     * @param logger
     * @private
     */
    private async restorePolicy(
        policyTopicId: string,
        owner: string,
        user: IAuthUser,
        hederaAccountID: string,
        hederaAccountKey: string,
        logger: PinoLogger
    ): Promise<void> {
        try {
            const policyMessages = await this.readTopicMessages(policyTopicId, user.id);
            const policyTopicMessage = policyMessages[0] as TopicMessage;
            await this.restoreTopic(
                {
                    topicId: policyTopicId,
                    name: policyTopicMessage?.name,
                    description: policyTopicMessage?.description,
                    owner,
                    type: TopicType.PolicyTopic,
                    policyId: null,
                    policyUUID: null,
                },
                user,
                hederaAccountKey,
                hederaAccountKey
            );

            const dataBaseServer = new DatabaseServer();

            // Restore tokens
            for (const {
                tokenId,
                tokenName,
                tokenSymbol,
                tokenType,
                decimals,
            } of this.findMessagesByType<TokenMessage>(MessageType.Token, policyMessages)) {

                const token = await this.readTokenMessages(tokenId, user.id);

                if (!token) {
                    continue;
                }

                await dataBaseServer.save(Token, {
                    tokenId,
                    tokenName,
                    tokenSymbol,
                    tokenType,
                    decimals,
                    initialSupply: 0,
                    adminId: hederaAccountID,
                    changeSupply: token.supplyKey ? true : false,
                    enableAdmin: token.adminKey ? true : false,
                    enableKYC: token.kycKey ? true : false,
                    enableFreeze: token.freezeKey ? true : false,
                    enableWipe: token.wipeKey ? true : false,
                    owner,
                });

                const mintTransactions = await new Workers().addRetryableTask(
                    {
                        type: WorkerTaskType.GET_TRANSACTIONS,
                        data: {
                            accountId: token.treasury_account_id,
                            transactiontype: 'TOKENMINT',
                            filter: {
                                entity_id: tokenId,
                            },
                            payload: { userId: user.id }
                        },
                    },
                    {
                        priority: 1,
                        attempts: 10
                    }
                );

                const vpTransactionMap = new Map<string, any[]>();

                for (const transaction of mintTransactions) {
                    const vpTimestamp = atob(transaction.memo_base64).substring(0, 20);

                    const transactionSerials = transaction.nft_transfers.map((nft: any) => nft.serial_number);

                    const trans = vpTransactionMap.get(vpTimestamp) || [];
                    if (transactionSerials.length > 0) {
                        trans.push(...transactionSerials);
                    }
                    vpTransactionMap.set(vpTimestamp, trans);
                }

                for (const [vpMessageId, serials] of vpTransactionMap.entries()) {
                    const request = {
                        vpMessageId,
                        tokenId,
                        decimals,
                        target: token.treasury_account_id,
                        amount: serials.length > 0 ? serials.length : -1,
                        memo: vpMessageId,
                        tokenType: serials.length > 0 ? TokenType.NON_FUNGIBLE : TokenType.FUNGIBLE,
                        metadata: vpMessageId,
                        isTransferNeeded: false,
                        wasTransferNeeded: true,
                    };

                    const mintRequest = await dataBaseServer.saveMintRequest(
                        Object.assign(request, { isTransferNeeded: false, wasTransferNeeded: true })
                    );
                    const mintedSerialsLocal = await dataBaseServer.getMintRequestSerials(
                        mintRequest.id
                    );
                    const missedSerials = serials.filter(
                        (serial) => !mintedSerialsLocal.includes(serial)
                    );

                    await dataBaseServer.saveMintTransaction({
                        mintRequestId: mintRequest.id,
                        amount: serials.length > 0 ? serials.length : -1,
                        mintStatus: MintTransactionStatus.SUCCESS,
                        transferStatus: MintTransactionStatus.SUCCESS,
                        serials: missedSerials,
                    });
                }
            }

            const publishedSchemas = this.findMessagesByType<SchemaMessage>(MessageType.Schema, policyMessages)
                .filter((m) => m.action === MessageAction.PublishSchema);
            const publishedSchemaPackages = this.findMessagesByType<SchemaPackageMessage>(MessageType.SchemaPackage, policyMessages)
                .filter((m) => m.action === MessageAction.PublishSchemas);

            // Restore schemas
            for (const s of publishedSchemas) {
                await this.loadIPFS(s);
                await this.restoreSchema(s);
            }
            for (const p of publishedSchemaPackages) {
                await this.loadIPFS(p);
                await this.restoreSchemaPackage(p);
            }

            // Restore policy
            const publishedPolicies = this.findMessagesByType<PolicyMessage>(MessageType.InstancePolicy, policyMessages)
                .filter((m) => m.action === MessageAction.PublishPolicy);

            for (const policy of publishedPolicies) {
                await this.loadIPFS(policy);
                const parsedPolicyFile = await PolicyImportExport.parseZipFile(policy.document);
                const policyObject = parsedPolicyFile.policy;

                policyObject.instanceTopicId = policy.instanceTopicId;
                policyObject.synchronizationTopicId =
                    policy.synchronizationTopicId;
                policyObject.status = PolicyStatus.PUBLISH;
                policyObject.topicId = policyTopicId;

                if (!policyObject.instanceTopicId) {
                    const policyInstanceTopicMessage =
                        this.findMessagesByType<TopicMessage>(MessageType.Topic, policyMessages)
                            .find((m) => m.rationale === policy.id);
                    policyObject.instanceTopicId = policyInstanceTopicMessage.childId;
                }

                const policyInstanceMessages = await this.readTopicMessages(policyObject.instanceTopicId, user.id);
                const p = dataBaseServer.create(PolicyCollection, policyObject);
                const r = await dataBaseServer.save(PolicyCollection, p);

                const policyInstanceTopic = policyInstanceMessages[0] as TopicMessage;
                await this.restoreTopic(
                    {
                        topicId: policyObject.instanceTopicId,
                        name: policyInstanceTopic.name,
                        description: policyInstanceTopic.description,
                        owner,
                        type: TopicType.InstancePolicyTopic,
                        policyId: r.id.toString(),
                        policyUUID: r.uuid,
                    },
                    user,
                    hederaAccountKey,
                    hederaAccountKey
                );

                await this.restorePolicyDocuments(
                    policyInstanceMessages,
                    owner,
                    r.id.toString(),
                    r.uuid,
                    user,
                    hederaAccountKey
                );

                await new PolicyEngine(logger).generateModel(r.id.toString());
                // await new BlockTreeGenerator().generate(r.id.toString());
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Find message by type
     * @param type
     * @param messages
     * @private
     */
    private findMessageByType<T extends Message>(type: MessageType, messages: Message[]): T {
        return messages.find((m) => m.type === type) as T;
    }

    /**
     * Find messages by type
     * @param type
     * @param messages
     * @private
     */
    private findMessagesByType<T extends Message>(type: MessageType, messages: Message[]): T[] {
        return (messages?.filter((m) => m.type === type) || []) as T[];
    }

    /**
     * Restore topic
     * @param topic
     * @param user
     * @param topicAdminKey
     * @param topicSubmitKey
     * @private
     */
    private async restoreTopic(
        topic: any,
        user: IAuthUser,
        topicAdminKey: string,
        topicSubmitKey: string
    ): Promise<void> {
        const db = new DatabaseServer();

        const existing = await db.findOne(Topic, { topicId: topic.topicId });
        if (existing) {
            console.log(`Topic already exists: ${topic.topicId}.`);
            return;
        }
        await db.save(Topic, topic);

        await Promise.all([
            this.wallet.setKey(
                user.walletToken,
                KeyType.TOPIC_SUBMIT_KEY,
                topic.topicId,
                topicAdminKey
            ),
            this.wallet.setKey(
                user.walletToken,
                KeyType.TOPIC_ADMIN_KEY,
                topic.topicId,
                topicSubmitKey
            ),
        ]);
    }

    /**
     * Get main topic messages
     * @private
     */
    private async getMainTopicMessages(userId: string | null): Promise<Message[]> {
        const currentTime = Date.now();
        if (currentTime - this.mainTopicLastUpdate > this.UPDATE_INTERVAL) {
            this.mainTopicMessages = await this.readTopicMessages(this.MAIN_TOPIC_ID, userId);
            this.mainTopicLastUpdate = currentTime;
        }

        return this.mainTopicMessages;
    }

    /**
     * FindAllUserTopics
     * @param username
     * @param hederaAccountID
     * @param hederaAccountKey
     * @param did
     * @param userId
     */
    async findAllUserTopics(
        username: string,
        hederaAccountID: string,
        hederaAccountKey: string,
        did: string,
        userId: string | null
    ): Promise<any[]> {
        const mainTopicMessages = await this.getMainTopicMessages(userId);
        return mainTopicMessages
            .filter((m: Message) => m.type === MessageType.StandardRegistry)
            .filter((m: RegistrationMessage) => m.did?.includes(did))
            .map((m: RegistrationMessage) => {
                let registrantTopicId = m.registrantTopicId;
                if (!registrantTopicId && HederaDid.implement(m.did)) {
                    const { topicId } = HederaDid.parse(m.did);
                    registrantTopicId = topicId;
                }
                return {
                    did: m.did,
                    topicId: registrantTopicId,
                    timestamp: Math.floor(parseFloat(m.id) * 1000),
                };
            });
    }

    /**
     * Restore standard registry
     * @param username
     * @param hederaAccountID
     * @param hederaAccountKey
     * @param registrantTopicId
     * @param didDocument
     * @param logger
     * @param userId
     */
    async restoreRootAuthority(
        username: string,
        hederaAccountID: string,
        hederaAccountKey: string,
        registrantTopicId: string,
        didDocument: CommonDidDocument,
        logger: PinoLogger,
        userId: string | null
    ): Promise<void> {
        const did = didDocument.getDid();
        const user = await this.users.getUser(username, userId);

        if (user.role !== UserRole.STANDARD_REGISTRY) {
            throw new Error('User is not a Standard Registry.');
        }

        const mainTopicMessages = await this.getMainTopicMessages(user.id);
        const registrationMessage = mainTopicMessages
            .filter((m: Message) => m.type === MessageType.StandardRegistry)
            .filter((m: RegistrationMessage) => m.did === did)
            .find((m: RegistrationMessage) => {
                if (m.registrantTopicId) {
                    return m.registrantTopicId === registrantTopicId;
                } else if (HederaDid.implement(m.did)) {
                    const { topicId } = HederaDid.parse(m.did);
                    return topicId === registrantTopicId;
                } else {
                    return false;
                }
            });

        if (!registrationMessage) {
            throw new Error('User not found.');
        }

        const allMessages = await this.readTopicMessages(registrantTopicId, user.id);

        // Restore account
        const topicMessage = this.findMessageByType<TopicMessage>(MessageType.Topic, allMessages);
        const didDocumentMessage = this.findMessageByType<DIDMessage>(MessageType.DIDDocument, allMessages);
        const vcDocumentMessage = this.findMessageByType<VCMessage>(MessageType.VCDocument, allMessages);
        const allPolicies = this.findMessagesByType(MessageType.Policy, allMessages) as PolicyMessage[];

        const allTopics = this.findMessagesByType(MessageType.Topic, allMessages) as TopicMessage[];

        // Restore tools
        for (const topic of allTopics) {
            if (topic.messageType !== TopicType.ToolTopic || !topic.childId) {
                continue
            }
            await this.restoreTool(
                topic.childId,
                did,
                user,
                hederaAccountKey,
                logger
            );
        }

        if (!didDocumentMessage) {
            throw new Error('Couldn\'t find DID document.');
        }

        await this.loadIPFS(didDocumentMessage);

        const dataBaseServer = new DatabaseServer();

        const existingUser = await dataBaseServer.findOne(DidDocumentCollection, { did });

        if (existingUser) {
            throw new Error('The DID document already exists.');
        }

        if (!didDocument.compare(didDocumentMessage.document)) {
            throw new Error('The DID documents don\'t match.');
        }

        const vcHelper = new VcHelper();
        const didRow = await vcHelper.saveDidDocument(didDocument, user);
        didRow.status = DidDocumentStatus.CREATE;
        didRow.messageId = didDocumentMessage.id;
        didRow.topicId = didDocumentMessage.topicId.toString();
        await dataBaseServer.update(DidDocumentCollection, null, didRow);

        if (vcDocumentMessage) {
            await this.loadIPFS(vcDocumentMessage);
            const vcDoc = VcDocument.fromJsonTree(vcDocumentMessage.document);
            await dataBaseServer.save(VcDocumentCollection, {
                hash: vcDoc.toCredentialHash(),
                owner: did,
                document: vcDoc.toJsonTree(),
                type: 'STANDARD_REGISTRY',
            });
        }

        await this.users.updateCurrentUser(username, {
            did,
            parent: undefined,
            hederaAccountId: hederaAccountID,
        }, userId);

        await this.restoreUsers(allMessages, did, userId);
        await this.restorePermissions(allMessages, did, user, hederaAccountID, userId);

        await this.restoreTopic(
            {
                topicId: registrantTopicId,
                name: topicMessage?.name,
                description: topicMessage?.description,
                owner: did,
                type: TopicType.UserTopic,
                policyId: null,
                policyUUID: null,
                parent: registrationMessage.topicId
            },
            user,
            hederaAccountKey,
            hederaAccountKey
        );

        await this.wallet.setKey(
            user.walletToken,
            KeyType.KEY,
            did,
            hederaAccountKey
        );

        // Restore policies
        for (const policyMessage of allPolicies) {
            if (!policyMessage.policyTopicId) {
                continue
            }
            await this.restorePolicy(
                policyMessage.policyTopicId,
                did,
                user,
                hederaAccountID,
                hederaAccountKey,
                logger
            );
        }
    }

    /**
     * Restore tool
     * @param toolTopicId
     * @param owner
     * @param user
     * @param hederaAccountID
     * @param hederaAccountKey
     * @param logger
     * @private
     */
    private async restoreTool(
        toolTopicId: string,
        owner: string,
        user: IAuthUser,
        hederaAccountKey: string,
        logger: PinoLogger
    ): Promise<void> {
        try {
            const toolMessages = await this.readTopicMessages(toolTopicId, user.id);
            const toolTopicMessage = toolMessages[0] as TopicMessage;
            await this.restoreTopic(
                {
                    topicId: toolTopicId,
                    name: toolTopicMessage?.name,
                    description: toolTopicMessage?.description,
                    owner,
                    type: TopicType.ToolTopic,
                    targetId: null,
                    targetUUID: null,
                },
                user,
                hederaAccountKey,
                hederaAccountKey
            );

            const publishedSchemas = this.findMessagesByType<SchemaMessage>(MessageType.Schema, toolMessages)
                .filter((m) => m.action === MessageAction.PublishSchema);
            const publishedSchemaPackages = this.findMessagesByType<SchemaPackageMessage>(MessageType.SchemaPackage, toolMessages)
                .filter((m) => m.action === MessageAction.PublishSchemas);

            // Restore schemas
            for (const s of publishedSchemas) {
                await this.loadIPFS(s);
                await this.restoreSchema(s);
            }
            for (const p of publishedSchemaPackages) {
                await this.loadIPFS(p);
                await this.restoreSchemaPackage(p);
            }

            // Restore policy
            const publishedTools = this.findMessagesByType<ToolMessage>(MessageType.Tool, toolMessages)
                .filter((m) => m.action === MessageAction.PublishTool);

            for (const toolMessage of publishedTools) {
                await this.restoreToolMessage(toolMessage, toolMessages, hederaAccountKey);
            }
        } catch (e) {
            console.error(e);
        }
    }

    private async restoreToolMessage(
        toolMessage: ToolMessage,
        toolMessages: Message[],
        hederaAccountKey: string,
    ) {
        await this.loadIPFS(toolMessage);
        const parsedToolFile = await ToolImportExport.parseZipFile(toolMessage.document);

        const toolObject = parsedToolFile.tool;

        toolObject.hash = toolMessage.hash;
        toolObject.uuid = toolMessage.uuid;
        toolObject.creator = toolMessage.owner;
        toolObject.owner = toolMessage.owner;
        toolObject.topicId = toolMessage.topicId.toString();
        toolObject.messageId = toolMessage.id;
        toolObject.status = ModuleStatus.PUBLISHED;

        await updateToolConfig(toolObject);

        const result = await DatabaseServer.createTool(toolObject);

        if (Array.isArray(parsedToolFile.schemas)) {
            const schemaObjects = []

            for (const schema of parsedToolFile.schemas) {
                const schemaObject = DatabaseServer.createSchema(schema);
                parsedToolFile.tool.creator = toolMessage.owner;
                parsedToolFile.tool.owner = toolMessage.owner;
                parsedToolFile.tool.topicId = toolMessage.topicId.toString();
                schemaObject.status = SchemaStatus.PUBLISHED;
                schemaObject.category = SchemaCategory.TOOL;

                schemaObjects.push(schemaObject);
            }

            await DatabaseServer.saveSchemas(schemaObjects);
        }

        const toolTags = parsedToolFile.tags?.filter((t: any) => t.entity === TagType.Tool) || [];
        if (toolMessage.tagsTopicId) {
            const tagMessages = this.findMessagesByType<TagMessage>(MessageType.Tag, toolMessages)
                .filter((m) => m.action === MessageAction.PublishTag);

            for (const tag of tagMessages) {
                if (tag.entity === TagType.Tool && tag.target === toolMessage.id) { // check
                    toolTags.push({
                        uuid: tag.uuid,
                        name: tag.name,
                        description: tag.description,
                        owner: tag.owner,
                        entity: tag.entity,
                        target: tag.target,
                        status: 'History',
                        topicId: tag.topicId,
                        messageId: tag.id,
                        date: tag.date,
                        document: null,
                        uri: null,
                        id: null
                    } as any);
                }
            }
        }

        await importTag(toolTags, result.id.toString());
    }

    private async restoreUsers(messages: Message[], owner: string, userId: string | null) {
        const userDIDs = this.findMessagesByType<DIDMessage>(MessageType.DIDDocument, messages);
        userDIDs.shift();

        for (const message of userDIDs) {
            await this.loadIPFS(message);
            const did = message.document.id;
            await new DatabaseServer().save(DidDocumentCollection, {
                did,
                document: message.document,
                status: DidDocumentStatus.CREATE,
                messageId: message.id,
                topicId: message.topicId,
            });
            this.users.generateNewTemplate(UserRole.USER, did, owner, userId);
        }
    }

    private async restorePermissions(
        messages: Message[],
        parentDid: string,
        parent: IAuthUser,
        hederaAccountID: string,
        userId: string | null
    ) {
        const guardianRoles = this.findMessagesByType<GuardianRoleMessage>(MessageType.GuardianRole, messages);
        const _guardianRoles = new Map<string, GuardianRoleMessage>();
        for (const message of guardianRoles) {
            if (message.payer === hederaAccountID) {
                _guardianRoles.set(message.uuid, message);
            }
        }

        const _owner = EntityOwner.sr(parent.id?.toString(), parentDid);
        const _roleMap = new Map<string, any>();
        for (const message of _guardianRoles.values()) {
            await this.loadIPFS(message);
            const vcDoc = VcDocument.fromJsonTree(message.document);
            const uuid = vcDoc.getField<string>('uuid');
            const role = await this.users.createRole({
                uuid,
                name: vcDoc.getField<string>('name'),
                description: vcDoc.getField<string>('description'),
                permissions: vcDoc.getField<string[]>('permissions')
            }, _owner, true);
            await new DatabaseServer().save(VcDocumentCollection, {
                hash: vcDoc.toCredentialHash(),
                owner: parentDid,
                messageId: message.id,
                topicId: message.topicId,
                document: vcDoc.toJsonTree(),
                type: SchemaEntity.ROLE
            });
            _roleMap.set(uuid, role)
        }

        const permissions = this.findMessagesByType<UserPermissionsMessage>(MessageType.UserPermissions, messages);
        const _permissions = new Map<string, UserPermissionsMessage>();
        for (const message of permissions) {
            if (message.payer === hederaAccountID) {
                _permissions.set(message.user, message);
            }
        }

        for (const message of _permissions.values()) {
            await this.loadIPFS(message);
            const vcDoc = VcDocument.fromJsonTree(message.document);
            const userRoles = vcDoc.getField<{
                uuid: string,
                name: string,
                owner: string
            }[]>('roles');
            const userDid = vcDoc.getField<string>('userId');
            const template = await this.users.getUserById(userDid, userId);
            if (
                template &&
                template.role === UserRole.USER &&
                template.parent === parentDid
            ) {
                const roleIds: string[] = [];
                for (const item of userRoles) {
                    const role = _roleMap.get(item.uuid);
                    if (role) {
                        roleIds.push(role.id);
                        await this.users.updateUserRole(template.username, roleIds, _owner);
                        await new DatabaseServer().save(VcDocumentCollection, {
                            hash: vcDoc.toCredentialHash(),
                            owner: parentDid,
                            messageId: message.id,
                            topicId: message.topicId,
                            document: vcDoc.toJsonTree(),
                            type: SchemaEntity.USER_PERMISSIONS
                        });
                    }
                }
            }
        }
    }
}
