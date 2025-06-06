import {
    AggregateVC,
    BaseEntity,
    BlockState,
    Contract,
    ContractMessage,
    DatabaseServer,
    DidDocument,
    DocumentState,
    IAuthUser,
    KeyType,
    MessageAction,
    MessageServer,
    MintRequest,
    MintTransaction,
    MultiDocuments,
    PolicyRoles,
    RetirePool,
    RoleMessage,
    SplitDocuments,
    Token,
    Topic,
    TopicConfig,
    TopicHelper,
    Users,
    VCMessage,
    VPMessage,
    VcDocument,
    VcDocumentDefinition,
    VcHelper,
    VpDocument,
    VpDocumentDefinition,
    Wallet,
    Workers,
    findAllEntities, PolicyCache,
} from '@guardian/common';
import {
    ContractAPI,
    ContractType,
    DocumentStatus,
    MigrationConfig,
    Schema,
    SchemaCategory,
    SchemaHelper,
    TopicType,
    ISignOptions,
    PolicyHelper,
} from '@guardian/interfaces';
import { INotifier } from '../../helpers/notifier.js';
import {
    BlockStateLoader,
    RolesLoader,
    DidLoader,
    MintRequestLoader,
    AggregateVCLoader,
    MintTransactionLoader,
    DocumentStateLoader,
    VcDocumentLoader,
    VpDocumentLoader,
    SplitDocumentLoader,
    MultiSignDocumentLoader,
    TokensLoader,
    RetirePoolLoader
} from './policy-data/loaders/index.js';
import { createHederaToken } from '../../api/token.service.js';
import { createContract } from '../../api/helpers/contract-api.js';
import { getContractVersion, setPoolContract } from '../../api/contract.service.js';

/**
 * Document error
 */
export interface DocumentError {
    id?: string;
    message?: string;
}

/**
 * Policy data migrator
 */
export class PolicyDataMigrator {
    /**
     * Vc message identifiers mapping
     */
    private readonly vcMessageIds: Map<string, VcDocument> = new Map();

    /**
     * VP identifiers mapping
     */
    private readonly vpIds = new Map<string, string>();

    /**
     * VC identifiers mapping
     */
    private readonly vcIds = new Map<string, any>();

    /**
     * Created tokens
     */
    private readonly _createdTokens = new Map<string, any>();

    /**
     * Created wipe contract identifier
     */
    private _createdWipeContractId;

    /**
     * Database server instance
     */
    private readonly _db!: DatabaseServer;

    /**
     * Message server instance
     */
    private readonly _ms!: MessageServer;

    private constructor(
        private readonly _root: IAuthUser,
        private readonly _rootKey: string,
        private readonly _signOptions: ISignOptions,
        private readonly _users: Users,
        private readonly _owner: string,
        private readonly _policyId: string,
        private readonly _policyTopicId: string,
        private readonly _policyInstanceTopic: TopicConfig,
        private readonly _oldPolicyOwner: string,
        private readonly _oldPolicyTopicId: string,
        private readonly _oldUserTopicId: string,
        private readonly _userTopic: Topic,
        private readonly _roles: any,
        private readonly _groups: any,
        private readonly _schemas: any,
        private readonly _blocks: any,
        private readonly _tokens: any,
        private readonly _tokensMap: any,
        private readonly _editedVCs: any,
        private readonly _dids: DidDocument[],
        private readonly _dryRunId?: string,
        private readonly _notifier?: INotifier
    ) {
        this._db = new DatabaseServer(_dryRunId);
        this._ms = new MessageServer({
            operatorId: _root.hederaAccountId,
            operatorKey: _rootKey,
            signOptions: _signOptions,
            dryRun: _dryRunId,
        });
        for (const [oldTokenId, newTokenId] of Object.entries(
            this._tokensMap
        )) {
            this._createdTokens.set(oldTokenId, newTokenId);
        }
    }

    /**
     * Migrate policy data
     * @param owner Owner
     * @param migrationConfig Migration config
     * @param userId
     * @param notifier Notifier
     * @returns Migration errors
     */
    static async migrate(
        owner: string,
        migrationConfig: MigrationConfig,
        userId: string | null,
        notifier?: INotifier
    ) {
        try {
            const {
                policies,
                vcs,
                vps,
                schemas,
                groups,
                roles,
                tokens,
                tokensMap,
                blocks,
                editedVCs,
                migrateState,
                migrateRetirePools,
                retireContractId,
            } = migrationConfig;
            const { src, dst } = policies;
            const users = new Users();
            const userTopic = await DatabaseServer.getTopicByType(
                owner,
                TopicType.UserTopic
            );
            let policyUsers;
            let policyRoles;
            let policyStates;
            let oldUserTopic;
            let srcModel;
            let srcSystemSchemas;
            let srcVCs;
            let srcRoleVcs;
            let srcVPs;
            let srcDids;
            let srcMintRequests;
            let srcMintTransactions;
            let srcMultiDocuments;
            let srcAggregateVCs;
            let srcSplitDocuments;
            let srcDocumentStates;
            let srcTokens;
            let srcRetirePools;

            const userPolicy = await DatabaseServer.getPolicyCache({
                id: src,
                userId: owner,
            });
            if (userPolicy) {
                srcModel = userPolicy.policy;
                oldUserTopic = userPolicy.userTopic.topicId;
                policyUsers = userPolicy.users;
                policyRoles = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'roles',
                    cachePolicyId: userPolicy.id,
                } as Partial<PolicyCache>);
                policyStates = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'states',
                    cachePolicyId: userPolicy.id,
                } as Partial<PolicyCache>);
                srcSystemSchemas = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'schemas',
                    cachePolicyId: userPolicy.id,
                    category: SchemaCategory.SYSTEM,
                } as Partial<PolicyCache>);
                srcVCs = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'vcs',
                    cachePolicyId: userPolicy.id,
                    oldId: { $in: vcs },
                } as Partial<PolicyCache>);
                srcRoleVcs = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'vcs',
                    cachePolicyId: userPolicy.id,
                    schema: '#UserRole',
                } as Partial<PolicyCache>);
                srcVPs = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'vps',
                    cachePolicyId: userPolicy.id,
                    oldId: { $in: vps },
                } as Partial<PolicyCache>);
                srcDids = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'dids',
                    cachePolicyId: userPolicy.id,
                } as Partial<PolicyCache>);
                srcMintRequests = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'mintRequests',
                    cachePolicyId: userPolicy.id,
                    vpMessageId: { $in: srcVPs.map((item) => item.messageId) },
                } as Partial<PolicyCache>);
                srcMintTransactions = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'mintTransactions',
                    cachePolicyId: userPolicy.id,
                    mintRequestId: {
                        $in: srcMintRequests.map((item) => item.id),
                    },
                } as Partial<PolicyCache>);
                srcMultiDocuments = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'multiDocuments',
                    cachePolicyId: userPolicy.id,
                    documentId: { $in: vcs },
                } as Partial<PolicyCache>);
                srcAggregateVCs = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'aggregateVCs',
                    cachePolicyId: userPolicy.id,
                } as Partial<PolicyCache>);
                srcSplitDocuments = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'splitDocuments',
                    cachePolicyId: userPolicy.id,
                } as Partial<PolicyCache>);
                srcDocumentStates = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'documentStates',
                    cachePolicyId: userPolicy.id,
                    documentId: { $in: vcs },
                } as Partial<PolicyCache>);
                srcTokens = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'tokens',
                    cachePolicyId: userPolicy.id,
                } as Partial<PolicyCache>);
                srcRetirePools = await DatabaseServer.getPolicyCacheData({
                    cacheCollection: 'retirePools',
                    cachePolicyId: userPolicy.id,
                } as Partial<PolicyCache>);
            } else {
                srcModel = await DatabaseServer.getPolicy({
                    id: src,
                    owner,
                });
                if (!srcModel) {
                    throw new Error(`Can't find source policy`);
                }
                const srcModelDryRun = PolicyHelper.isDryRunMode(srcModel);
                policyUsers = await users.getUsersBySrId(owner, userId);
                policyRoles = await new RolesLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get();
                policyStates = await new BlockStateLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get();
                srcSystemSchemas = await DatabaseServer.getSchemas({
                    category: SchemaCategory.SYSTEM,
                    topicId: srcModel.topicId,
                });
                srcVCs = await new VcDocumentLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get({
                    id: { $in: vcs },
                });
                srcRoleVcs = await new VcDocumentLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get({
                    schema: '#UserRole',
                });
                srcVPs = await await new VpDocumentLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get({
                    id: { $in: vps },
                });
                srcDids = await new DidLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get();
                srcMintRequests = await new MintRequestLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get(srcVPs.map((item) => item.messageId));
                srcMintTransactions = await new MintTransactionLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get(srcMintRequests.map((item) => item.id));
                srcMultiDocuments = await new MultiSignDocumentLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get(vcs);
                srcAggregateVCs = await new AggregateVCLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get();
                srcSplitDocuments = await new SplitDocumentLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get();
                srcDocumentStates = await new DocumentStateLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get(vcs);
                srcTokens = await new TokensLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get();
                const policyTokens = findAllEntities(srcModel.config, [
                    'tokenId',
                ]);
                srcRetirePools = await new RetirePoolLoader(
                    srcModel.id,
                    srcModel.topicId,
                    srcModel.instanceTopicId,
                    srcModelDryRun
                ).get(
                    srcTokens.map((token) => token.tokenId).concat(policyTokens)
                );
            }

            const dstModel = await DatabaseServer.getPolicy({
                id: dst,
                owner,
            });
            if (!dstModel) {
                throw new Error(`Can't find destination policy`);
            }
            const dstModelDryRun = PolicyHelper.isDryRunMode(dstModel);
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

            const wallet = new Wallet();
            const root = await users.getUserById(owner, userId);
            const rootKey = await wallet.getKey(
                root.walletToken,
                KeyType.KEY,
                owner
            );
            const signOptions = await wallet.getUserSignOptions(root);

            const instanceTopicConfig = await TopicConfig.fromObject(
                await new DatabaseServer(dstModelDryRun ? dstModel.id : undefined)
                    .getTopic({
                        topicId: dstModel.instanceTopicId,
                    }), false, userId
            );

            const policyDataMigrator = new PolicyDataMigrator(
                root,
                rootKey,
                signOptions,
                users,
                owner,
                dst,
                dstModel.topicId,
                instanceTopicConfig,
                srcModel.owner,
                srcModel.topicId,
                oldUserTopic || userTopic.topicId,
                userTopic,
                roles,
                groups,
                schemas,
                blocks || {},
                tokens || {},
                tokensMap || {},
                editedVCs || {},
                srcDids,
                dstModelDryRun ? dstModel.id : null,
                notifier
            );
            const migrationErrors = await policyDataMigrator._migrateData(
                srcVCs,
                srcVPs,
                policyUsers,
                srcRoleVcs,
                policyRoles,
                policyStates,
                srcMintRequests,
                srcMintTransactions,
                srcMultiDocuments,
                srcAggregateVCs,
                srcSplitDocuments,
                srcDocumentStates,
                srcTokens,
                srcRetirePools,
                migrateState,
                migrateRetirePools,
                userId,
                retireContractId
            );

            return migrationErrors;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    /**
     * Migrate policy data
     * @param vcs VCs
     * @param vps VPs
     * @param users Users
     * @param roleVcs Role VCs
     * @param roles Roles
     * @param states States
     * @param mintRequests Mint requests
     * @param mintTransactions Mint transactions
     * @param multiSignDocuments Multi sign documents
     * @param aggregateVCs Aggregate VCs
     * @param splitDocuments Split documents
     * @param documentStates Document states
     * @param dynamicTokens
     * @param retirePools
     * @param migrateState Migrate state
     * @param migrateRetirePools
     * @param retireContractId
     * @param userId
     * @returns Migration errors
     */
    private async _migrateData(
        vcs: VcDocument[],
        vps: VpDocument[],
        users: {
            username: string;
            did: string;
            hederaAccountId: string;
            hederaAccountKey?: string;
        }[],
        roleVcs: VcDocument[],
        roles: PolicyRoles[],
        states: BlockState[],
        mintRequests: MintRequest[],
        mintTransactions: MintTransaction[],
        multiSignDocuments: MultiDocuments[],
        aggregateVCs: AggregateVC[],
        splitDocuments: SplitDocuments[],
        documentStates: DocumentState[],
        dynamicTokens: Token[],
        retirePools: RetirePool[],
        migrateState = false,
        migrateRetirePools = false,
        userId: string | null,
        retireContractId?: string
    ) {
        const errors = new Array<DocumentError>();
        this._notifier?.start(`Migrate policy state`);
        if (migrateState) {
            if (this._dryRunId) {
                await this._createVirtualUsers(users);
            }
            await this._migratePolicyRoles(roles, userId);
            await this._migrateDocument(
                roleVcs,
                this._migrateRoleVc.bind(this),
                this._db.saveVC.bind(this._db),
                errors,
                userId
            );
            await this._migratePolicyStates(states);
        } else {
            this._notifier?.info('Migrate policy state skipped');
        }
        this._notifier?.completedAndStart(`Migrate ${vcs.length} VC documents`);
        await this._migrateDocument(
            vcs,
            (vc: VcDocument) =>
                this._migrateVcDocument(vc, vcs, roles, dynamicTokens, errors, userId),
            this._db.saveVC.bind(this._db),
            errors,
            userId
        );
        if (migrateState) {
            await this._migrateDocument(
                multiSignDocuments,
                this._migrateMultiSignDocument.bind(this),
                this._db.setMultiSigDocument.bind(this._db),
                errors,
                userId
            );
            await this._migrateDocument(
                documentStates,
                this._migrateDocumentState.bind(this),
                this._db.saveDocumentState.bind(this._db),
                errors,
                userId
            );
            await this._migrateDocument(
                aggregateVCs,
                this._migrateAggregateVC.bind(this),
                async (doc) => {
                    await this._db.createAggregateDocuments(
                        doc as any,
                        doc.blockId
                    );
                },
                errors,
                userId
            );
            await this._migrateDocument(
                splitDocuments,
                this._migrateSplitDocument.bind(this),
                async (doc) => {
                    await this._db.setResidue(doc as any);
                },
                errors,
                userId
            );
        }
        this._notifier?.completedAndStart(`Migrate ${vps.length} VP documents`);
        await this._migrateDocument(
            vps,
            this._migrateVpDocument.bind(this),
            this._db.saveVP.bind(this._db),
            errors,
            userId
        );
        await this._migrateMintRequests(mintRequests, mintTransactions);

        if (migrateRetirePools && migrateState) {
            await this.migrateTokenPools(retireContractId, retirePools, errors, userId);
        }
        return errors;
    }

    /**
     * Migrate token pools
     * @param contractId Contract identifier
     * @param pools Pools
     * @param errors Errors
     * @param userId
     */
    async migrateTokenPools(
        contractId: string,
        pools: RetirePool[],
        errors: DocumentError[],
        userId: string | null
    ) {
        if (!contractId) {
            return;
        }
        for (const pool of pools) {
            try {
                await setPoolContract(
                    new Workers(),
                    contractId,
                    this._root.hederaAccountId,
                    this._rootKey,
                    this.replacePoolTokens(pool.tokens),
                    pool.immediately,
                    userId
                );
            } catch (error) {
                errors.push({
                    id: pool.id,
                    message: error?.toString(),
                });
            }
        }
    }

    /**
     * Replace pool tokens
     * @param tokens Tokens
     * @returns Replaces tokens
     */
    replacePoolTokens(tokens: { token: string }[]) {
        const result = [];
        for (const token of tokens) {
            const newTokenId =
                this._tokensMap.get(token.token) ||
                this._createdTokens.get(token.token);
            if (!newTokenId) {
                continue;
            }
            result.push(Object.assign(token, { token: newTokenId }));
        }

        return result;
    }

    /**
     * Migrate tokens
     * @param dynamicTokens Dynamic tokens
     * @param tokenTemplates Token templates
     * @param userId
     */
    async migrateTokenTemplates(
        dynamicTokens: Token[],
        tokenTemplates: { [key: string]: string },
        userId: string | null
    ) {
        const result: any = {};

        const tokenObjects = []

        const dataBaseServer = new DatabaseServer();

        for (const [tokenTemplate, tokenId] of Object.entries(tokenTemplates)) {
            const newTokenTemplate = this._tokens[tokenTemplate];
            if (!newTokenTemplate) {
                continue;
            }

            const existingToken = await DatabaseServer.getTokenById(tokenId);
            if (existingToken) {
                result[newTokenTemplate] = tokenId;
                delete existingToken._id;
                delete existingToken.id;
                existingToken.policyId = this._policyId;

                tokenObjects.push(existingToken);
                continue;
            }
            const tokenConfig = dynamicTokens.find(
                (item) => item.tokenId === tokenId
            );
            if (!tokenConfig) {
                continue;
            }

            tokenConfig.wipeContractId = await this.createWipeContract(
                tokenConfig.wipeContractId,
                userId
            );

            const tokenObject = await createHederaToken(
                tokenConfig,
                Object.assign(this._root, {
                    hederaAccountKey: this._rootKey,
                }) as any,
                userId
            );
            tokenObject.policyId = this._policyId;

            tokenObjects.push(tokenObject);
            result[newTokenTemplate] = tokenObject.tokenId;
            this._createdTokens.set(tokenId, tokenObject.tokenId);
        }

        await dataBaseServer.saveMany(Token, tokenObjects);

        return result;
    }

    /**
     * Create wipe contract
     * @param wipeContractId Wipe contract identifier
     * @param userId
     * @returns Wipe contract identifier
     */
    async createWipeContract(wipeContractId: string, userId: string | null) {
        const dataBaseServer = new DatabaseServer();

        const existingWipeContract = await dataBaseServer.findOne(
            Contract,
            {
                type: ContractType.WIPE,
                wipeContractId,
                owner: this._owner,
            } as Partial<Contract>
        );
        if (existingWipeContract) {
            return wipeContractId;
        }

        if (this._createdWipeContractId) {
            return this._createdWipeContractId;
        }

        const topicHelper = new TopicHelper(
            this._root.hederaAccountId,
            this._rootKey,
            this._signOptions,
            this._dryRunId
        );
        const topic = await topicHelper.create(
            {
                type: TopicType.ContractTopic,
                name: TopicType.ContractTopic,
                description: TopicType.ContractTopic,
                owner: this._owner,
                policyId: null,
                policyUUID: null,
            },
            userId,
            {
                admin: true,
                submit: false,
            }
        );

        const [contractId, log] = await createContract(
            ContractAPI.CREATE_CONTRACT,
            new Workers(),
            ContractType.WIPE,
            this._root.hederaAccountId,
            this._rootKey,
            topic.topicId
        );

        await topic.saveKeys(userId);
        await DatabaseServer.saveTopic(topic.toObject());

        const version = await getContractVersion(
            log
        );
        const contract = await dataBaseServer.save(Contract, {
            contractId,
            owner: this._owner,
            description: `Migration ${this._policyId} wipe contract`,
            permissions: (version === '1.0.0' ? 15 : 7),
            type: ContractType.WIPE,
            topicId: topic.topicId,
            wipeContractIds: [],
            wipeTokenIds: [],
            version,
        });

        const contractMessage = new ContractMessage(
            MessageAction.CreateContract
        );
        contractMessage.setDocument(contract);
        await this._ms.setTopicObject(topic).sendMessage(contractMessage, true, null, userId);

        this._createdWipeContractId = contract.contractId;
        return this._createdWipeContractId;
    }

    /**
     * Migrate document state
     * @param documentState Document state
     * @returns Document state
     */
    private async _migrateDocumentState(documentState: DocumentState) {
        const vc = this.vcIds.get(documentState.documentId);
        if (!vc) {
            return null;
        }
        documentState.documentId = vc.id;
        return documentState;
    }

    /**
     * Migrate split document
     * @param doc Split document
     * @param userId
     * @returns Split document
     */
    private async _migrateSplitDocument(doc: SplitDocuments, userId: string | null) {
        if (!this._blocks[doc.blockId]) {
            return null;
        }

        doc.userId = await this._replaceDidTopicId(doc.userId);
        doc.policyId = this._policyId;

        const _vcHelper = new VcHelper();
        const didDocument = await _vcHelper.loadDidDocument(this._owner, userId);
        const svc = await _vcHelper.issueVerifiableCredential(
            VcDocumentDefinition.fromJsonTree(doc.document),
            didDocument,
            null
        );

        doc.document = svc.toJsonTree();

        return doc;
    }

    /**
     * Migrate aggregate VC
     * @param doc Aggregate VC
     * @returns Aggregate VC
     */
    async _migrateAggregateVC(doc: AggregateVC) {
        if (!this._blocks[doc.blockId]) {
            return null;
        }
        const vc = this.vcIds.get(doc.sourceDocumentId.toString());
        if (!vc) {
            return null;
        }
        doc.blockId = this._blocks[doc.blockId];
        doc.sourceDocumentId = doc._id;
        return Object.assign(doc, vc);
    }

    /**
     * Migrate multi sign document
     * @param doc Multi document
     * @param userId
     * @returns Multi document
     */
    async _migrateMultiSignDocument(doc: MultiDocuments, userId: string | null) {
        doc.userId = await this._replaceDidTopicId(doc.userId);
        doc.did = await this._replaceDidTopicId(doc.did);

        const vc = this.vcIds.get(doc.documentId);
        if (!vc) {
            return null;
        }

        doc.documentId = vc.id;

        const _vcHelper = new VcHelper();
        const didDocument = await _vcHelper.loadDidDocument(this._owner, userId);
        const svc = await _vcHelper.issueVerifiableCredential(
            VcDocumentDefinition.fromJsonTree(doc.document),
            didDocument,
            null
        );

        doc.document = svc.toJsonTree();
        return doc;
    }

    /**
     * Migrate DID document
     * @param did did
     * @returns did
     */
    private async _migrateDidDocument(did: string) {
        const didObj = this._dids.find((item) => item.did === did);
        if (!didObj) {
            return did;
        }
        const existingDid = await this._db.getDidDocument(didObj.did);
        if (existingDid) {
            return did;
        }
        this._notifier?.info(`Migrating DID ${did}`);
        await this._db.saveDid(didObj);
        return did;
    }

    /**
     * Migrate document wrapper
     * @param documents Documents
     * @param migrateFn Migrate function
     * @param saveFn Save function
     * @param errors Errors
     * @param userId
     */
    private async _migrateDocument<T extends BaseEntity>(
        documents: T[],
        migrateFn: (document: T, userId: string | null) => Promise<T>,
        saveFn: (document: Partial<T>) => Promise<T | void>,
        errors: DocumentError[],
        userId: string | null
    ) {
        const notEmptyDocuments = (documents as any[]).filter((item) => !!item);
        for (const document of notEmptyDocuments) {
            try {
                const newDocument = await migrateFn(document, userId);
                if (!newDocument) {
                    continue;
                }
                delete newDocument.id;
                delete newDocument._id;
                delete newDocument.createDate;
                delete newDocument.updateDate;
                await saveFn(newDocument);
            } catch (error) {
                console.log(error);
                errors.push({
                    id: document?.id,
                    message: error?.toString(),
                });
            }
        }
    }

    /**
     * Create virtual users
     * @param users Users
     */
    private async _createVirtualUsers(
        users: {
            username: string;
            did: string;
            hederaAccountId: string;
        }[]
    ) {
        for (const user of users) {
            user.did = await this._replaceDidTopicId(user.did);
            if (user.did === this._owner) {
                continue;
            }

            await DatabaseServer.createVirtualUser(
                this._policyId,
                user.username,
                user.did,
                user.hederaAccountId,
                null,
                false
            );
        }
    }

    /**
     * Migrate role vc
     * @param doc VC
     * @param userId
     * @returns VC
     */
    private async _migrateRoleVc(doc: VcDocument, userId: string | null) {
        if (!doc) {
            return doc;
        }

        doc.owner = await this._replaceDidTopicId(doc.owner);

        let role;
        if (doc.group) {
            const groups = await this._db.getGroupsByUser(
                this._policyId,
                doc.owner
            );
            role = groups.find((group) => group.uuid === doc.group);
            doc.group = role?.uuid;
        }

        let vc: VcDocumentDefinition;
        const schema = await DatabaseServer.getSchema({
            topicId: this._policyTopicId,
            iri: this._schemas[doc.schema],
        });
        if (
            doc.schema !== schema.iri ||
            this._policyTopicId !== this._oldPolicyTopicId
        ) {
            this._notifier?.info(`Resigning VC ${doc.id}`);
            const _vcHelper = new VcHelper();
            const didDocument = await _vcHelper.loadDidDocument(this._owner, userId);
            const credentialSubject = SchemaHelper.updateObjectContext(
                new Schema(schema),
                doc.document.credentialSubject[0]
            );
            const res = await _vcHelper.verifySubject(credentialSubject);
            if (!res.ok) {
                throw new Error(res.error.type);
            }
            vc = await _vcHelper.createVerifiableCredential(
                credentialSubject,
                didDocument,
                null,
                { uuid: role?.uuid }
            );
            doc.hash = vc.toCredentialHash();
            doc.document = vc.toJsonTree();
            doc.schema = schema.iri;
        } else {
            vc = VcDocumentDefinition.fromJsonTree(doc.document);
        }
        doc.policyId = this._policyId;

        if (doc.messageId) {
            this._notifier?.info(`Publishing VC ${doc.id}`);

            const vcMessage = new RoleMessage(MessageAction.MigrateVC);
            vcMessage.setDocument(vc);
            if (role) {
                vcMessage.setRole(role);
            }
            const relationships = [doc.messageId];
            if (doc.relationships) {
                relationships.push(...doc.relationships);
            }
            vcMessage.setRelationships(relationships);
            if (role) {
                vcMessage.setUser(role.messageId);
            }
            const message = vcMessage;
            const vcMessageResult = await this._ms
                .setTopicObject(this._policyInstanceTopic)
                .sendMessage(message, true, null, userId);
            doc.messageId = vcMessageResult.getId();
            doc.topicId = vcMessageResult.getTopicId();
            doc.messageHash = vcMessageResult.toHash();
            this.vcMessageIds.set(doc.messageId, doc);
            if (role) {
                role.messageId = this.vcMessageIds.get(
                    role.messageId
                ).messageId;
                await this._db.setUserInGroup(role);
            }
        }

        return doc;
    }

    /**
     * Migrate policy states
     * @param states States
     */
    private async _migratePolicyStates(states: BlockState[]) {
        for (const state of states) {
            const data = JSON.parse(state.blockState);
            if (data.state) {
                const dataKeys = Object.keys(data);
                for (const key of dataKeys) {
                    const newKey = await this._replaceDidTopicId(key);
                    data[newKey] = data[key];
                    if (data[newKey] !== data[key]) {
                        delete data[key];
                    }
                }
            }

            await this._db.saveBlockState(
                this._policyId,
                this._blocks[state.blockId],
                null,
                data
            );
        }
    }

    /**
     * Migrate policy roles
     * @param roles Roles
     * @param userId
     */
    private async _migratePolicyRoles(roles: PolicyRoles[], userId: string | null) {
        for (const role of roles) {
            role.owner = await this._replaceDidTopicId(role.owner);
            role.did = await this._replaceDidTopicId(role.did);
            if (role.role) {
                role.role = this._roles[role.role];
            }
            if (role.groupName) {
                role.groupName = this._groups[role.groupName];
            }
            if (role.username && !this._dryRunId) {
                const newUser = await this._users.getUserById(role.did, userId);
                if (newUser) {
                    role.username = newUser.username;
                }
            }
            if (role.policyId) {
                role.policyId = this._policyId;
            }

            delete role.id;
            delete role._id;

            await this._db.setUserInGroup(role);
        }
    }

    /**
     * Replace did topic identifier
     * @param did did
     * @returns did
     */
    private async _replaceDidTopicId(did: string) {
        if (!did) {
            return did;
        }

        if (did === this._oldPolicyOwner) {
            return this._owner;
        }

        const didParts = did.split('_');
        if (didParts[1] === this._oldUserTopicId) {
            didParts[1] = this._userTopic.topicId;
        }

        return await this._migrateDidDocument(did);
    }

    /**
     * Migrate VP document
     * @param doc VP
     * @param userId
     * @returns VP
     */
    private async _migrateVpDocument(doc: VpDocument & { group: string }, userId: string | null) {
        doc.owner = await this._replaceDidTopicId(doc.owner);
        if (doc.group) {
            const srcGroup = await this._db.getGroupByID(
                this._policyId,
                doc.group
            );
            const dstUserGroup = await this._db.getGroupsByUser(
                this._policyId,
                doc.owner
            );
            const userRole = dstUserGroup.find(
                (item) =>
                    item.groupName === this._groups[srcGroup.groupName] ||
                    item.role === this._roles[srcGroup.role]
            );
            doc.group = userRole ? userRole.uuid : null;
        }

        // tslint:disable-next-line:no-shadowed-variable
        const vcs = doc.document.verifiableCredential.map((item) =>
            VcDocumentDefinition.fromJsonTree(item)
        );
        let vpChanged = false;
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < doc.relationships.length; i++) {
            const relationship = doc.relationships[i];
            // tslint:disable-next-line:no-shadowed-variable
            const vc = this.vcMessageIds.get(relationship);
            if (vc) {
                for (let j = 0; j < vcs.length; j++) {
                    const element = vcs[j];
                    const vcDef = VcDocumentDefinition.fromJsonTree(
                        vc.document
                    );
                    if (
                        element.getId() === vcDef.getId() &&
                        element.toCredentialHash() !== vcDef.toCredentialHash()
                    ) {
                        vpChanged = true;
                        vcs[j] = vcDef;
                    }
                }
            }
        }

        let vp;
        if (vpChanged || this._oldPolicyOwner !== this._owner) {
            this._notifier?.info(`Resigning VP ${doc.id}`);
            const _vcHelper = new VcHelper();
            const didDocument = await _vcHelper.loadDidDocument(this._owner, userId);
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

        doc.policyId = this._policyId;
        if (doc.messageId) {
            this._notifier?.info(`Publishing VP ${doc.id}`);
            const vpMessage = new VPMessage(MessageAction.MigrateVP);
            vpMessage.setDocument(vp);
            vpMessage.setUser(null);
            vpMessage.setRelationships([...doc.relationships, doc.messageId]);
            const vpMessageResult = await this._ms
                .setTopicObject(this._policyInstanceTopic)
                .sendMessage(vpMessage, true, null, userId);
            const vpMessageId = vpMessageResult.getId();
            this.vpIds.set(doc.messageId, vpMessageId);
            doc.messageId = vpMessageId;
            doc.topicId = vpMessageResult.getTopicId();
            doc.messageHash = vpMessageResult.toHash();
        }

        return doc;
    }

    /**
     * Migrate mint requests
     * @param mintRequests Mint requests
     * @param mintTransactions Mint transactions
     */
    private async _migrateMintRequests(
        mintRequests: MintRequest[],
        mintTransactions: MintTransaction[]
    ) {
        const mintRequestsMapping = new Map<string, string>();
        for (const mintRequest of mintRequests) {
            const newVpMessageId = this.vpIds.get(mintRequest.vpMessageId);
            if (!newVpMessageId) {
                continue;
            }
            mintRequest.vpMessageId = newVpMessageId;
            const oldMintRequestId = mintRequest.id;
            delete mintRequest.id;
            delete mintRequest._id;
            const newMintRequest = await this._db.saveMintRequest(mintRequest);
            mintRequestsMapping.set(oldMintRequestId, newMintRequest.id);
        }
        for (const mintTransaction of mintTransactions) {
            const newMintRequestId = mintRequestsMapping.get(
                mintTransaction.mintRequestId
            );
            if (!newMintRequestId) {
                continue;
            }
            mintTransaction.mintRequestId = newMintRequestId;
            delete mintTransaction.id;
            delete mintTransaction._id;
            await this._db.saveMintTransaction(mintTransaction);
        }
    }

    /**
     * Migrate VC document
     * @param doc VC
     * @param vcs VCs
     * @param roles Roles
     * @param tokens
     * @param errors Errors
     * @param userId
     * @returns VC
     */
    private async _migrateVcDocument(
        doc: VcDocument,
        vcs: VcDocument[],
        roles: PolicyRoles[],
        tokens: Token[],
        errors: DocumentError[],
        userId: string | null
    ) {
        if (!doc) {
            return doc;
        }

        doc.relationships = doc.relationships || [];
        for (let i = 0; i < doc.relationships.length; i++) {
            const relationship = doc.relationships[i];
            let republishedDocument = this.vcMessageIds.get(relationship);
            if (republishedDocument) {
                doc.relationships[i] = republishedDocument.messageId;
            } else {
                const rs = vcs.find((item) => item.messageId === relationship);
                try {
                    republishedDocument = await this._migrateVcDocument(
                        rs,
                        vcs,
                        roles,
                        tokens,
                        errors,
                        userId
                    );
                    doc.relationships[i] = republishedDocument.messageId;
                } catch (error) {
                    doc.relationships.splice(i, 1);
                    i--;
                }
            }
        }

        if (this.vcMessageIds.has(doc.messageId)) {
            return doc;
        }

        if (doc.messageId) {
            this.vcMessageIds.set(doc.messageId, doc);
        }

        const oldDocOwner = doc.owner;
        doc.owner = await this._replaceDidTopicId(doc.owner);
        doc.assignedTo = await this._replaceDidTopicId(doc.assignedTo);

        let role;
        if (doc.group) {
            const srcGroup = roles.find(
                (item) => item.uuid === doc.group && item.did === oldDocOwner
            );
            const groups = await this._db.getGroupsByUser(
                this._policyId,
                doc.owner
            );
            role = groups.find(
                (item) =>
                    item.groupName === this._groups[srcGroup.groupName] ||
                    item.role === this._roles[srcGroup.role]
            );
            doc.group = role?.uuid;
        }

        if (doc.assignedToGroup) {
            const srcGroup = roles.find(
                (item) =>
                    item.uuid === doc.assignedToGroup &&
                    item.did === oldDocOwner
            );
            const groups = await this._db.getGroupsByUser(
                this._policyId,
                doc.owner
            );
            role = groups.find(
                (item) => item.groupName === this._groups[srcGroup.groupName]
            );
            doc.assignedToGroup = role?.uuid;
        }

        let vc: VcDocumentDefinition;
        const schema = await DatabaseServer.getSchema({
            topicId: this._policyTopicId,
            iri: this._schemas[doc.schema],
        });
        if (
            this._editedVCs[doc.id] ||
            doc.schema !== schema.iri ||
            this._policyTopicId !== this._oldPolicyTopicId
        ) {
            this._notifier?.info(`Resigning VC ${doc.id}`);

            const _vcHelper = new VcHelper();
            const didDocument = await _vcHelper.loadDidDocument(this._owner, userId);
            const credentialSubject = SchemaHelper.updateObjectContext(
                new Schema(schema),
                this._editedVCs[doc.id] || doc.document.credentialSubject[0]
            );
            const res = await _vcHelper.verifySubject(credentialSubject);
            if (!res.ok) {
                throw new Error(res.error.type);
            }
            vc = await _vcHelper.createVerifiableCredential(
                credentialSubject,
                didDocument,
                null,
                {
                    uuid: await this._replaceDidTopicId(doc.document.id),
                }
            );
            doc.hash = vc.toCredentialHash();
            doc.document = vc.toJsonTree();
            doc.schema = schema.iri;
        } else {
            vc = VcDocumentDefinition.fromJsonTree(doc.document);
        }
        doc.policyId = this._policyId;

        if (doc.messageId) {
            this._notifier?.info(`Publishing VC ${doc.id}`);

            const vcMessage = new VCMessage(MessageAction.MigrateVC);
            vcMessage.setDocument(vc);
            vcMessage.setDocumentStatus(
                doc.option?.status || DocumentStatus.NEW
            );
            vcMessage.setRelationships([...doc.relationships, doc.messageId]);
            if (role && schema.category === SchemaCategory.POLICY) {
                vcMessage.setUser(role.messageId);
            }
            const message = vcMessage;
            const vcMessageResult = await this._ms
                .setTopicObject(this._policyInstanceTopic)
                .sendMessage(message, true, null, userId);
            doc.messageId = vcMessageResult.getId();
            doc.topicId = vcMessageResult.getTopicId();
            doc.messageHash = vcMessageResult.toHash();
            this.vcMessageIds.set(doc.messageId, doc);
        }

        this.vcIds.set(doc.id, doc);

        if (doc.tokens) {
            doc.tokens = await this.migrateTokenTemplates(tokens, doc.tokens, userId);
        }

        return doc;
    }
}
