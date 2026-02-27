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
    PinoLogger,
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
    findAllEntities,
    PolicyCache,
    INotificationStep,
    MigrationRun,
    MigrationFailedItem,
    MigrationMessageMap, DataBaseHelper, DryRun,
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
    BlockType,
    MigrationRunStatus,
    MigrationRunSummary,
    MigrationSummaryItem, IOwner,
} from '@guardian/interfaces';
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
import { createContractV2 } from '../../api/helpers/contract-api.js';
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
     * VC identifiers mapping
     */
    private readonly vcIds = new Map<string, any>();

    /**
     * Created tokens
     */
    private readonly _createdTokens = new Map<string, any>();

    /**
     * Processed source token ids
     */
    private readonly _processedTokenIds = new Set<string>();

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

    /**
     * Migration Run Heartbeat Stale Timeout
     */
    private static readonly migrationHeartbeatRunStaleTimeout = Number(
        process.env.MIGRATION_HEARDBEAT_RUN_STALE_TIMEOUT || 10 * 60 * 1000
    );

    /**
     * Migration write batch size
     */
    private static readonly migrationWriteBatchSize = Number(
        process.env.MIGRATION_WRITE_BATCH_SIZE || 50
    );

    /**
     * runtime cache:
     * scopeKey(srcPolicyId:dstPolicyId:startedBy) -> entityType -> srcMessageId -> dstMessageId
     */
    private static readonly migrationMessageCache = new Map<
        string,
        Map<string, Map<string, string>>
    >();

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
        private readonly _dryRunId: string,
        private readonly _notifier: INotificationStep
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

    private static createSummaryItem(total: number): MigrationSummaryItem {
        return {
            total,
            success: 0,
            failed: 0,
            cursorLastId: undefined
        };
    }

    private static buildInitialSummaryFromLoadedData(params: {
        srcVCs: VcDocument[];
        srcVPs: VpDocument[];
        srcRoleVcs: VcDocument[];
        policyRoles: PolicyRoles[];
        policyStates: BlockState[];
        srcMintRequests: MintRequest[];
        srcMintTransactions: MintTransaction[];
        srcMultiDocuments: MultiDocuments[];
        srcAggregateVCs: AggregateVC[];
        srcSplitDocuments: SplitDocuments[];
        srcDocumentStates: DocumentState[];
        srcTokens: Token[];
        srcRetirePools: RetirePool[];
        migrateState: boolean;
        migrateRetirePools: boolean;
    }): MigrationRunSummary {
        const summary: MigrationRunSummary = {
            vcDocument: PolicyDataMigrator.createSummaryItem(params.srcVCs.length),
            vpDocument: PolicyDataMigrator.createSummaryItem(params.srcVPs.length)
        };

        if (params.migrateState) {
            summary.roleVcDocument = PolicyDataMigrator.createSummaryItem(params.srcRoleVcs.length);
            summary.policyRole = PolicyDataMigrator.createSummaryItem(params.policyRoles.length);
            summary.policyState = PolicyDataMigrator.createSummaryItem(params.policyStates.length);
            summary.mintRequest = PolicyDataMigrator.createSummaryItem(params.srcMintRequests.length);
            summary.mintTransaction = PolicyDataMigrator.createSummaryItem(params.srcMintTransactions.length);
            summary.multiDocument = PolicyDataMigrator.createSummaryItem(params.srcMultiDocuments.length);
            summary.aggregateVc = PolicyDataMigrator.createSummaryItem(params.srcAggregateVCs.length);
            summary.splitDocument = PolicyDataMigrator.createSummaryItem(params.srcSplitDocuments.length);
            summary.documentState = PolicyDataMigrator.createSummaryItem(params.srcDocumentStates.length);
            summary.token = PolicyDataMigrator.createSummaryItem(params.srcTokens.length);
        }

        if (params.migrateState && params.migrateRetirePools) {
            summary.retirePool = PolicyDataMigrator.createSummaryItem(params.srcRetirePools.length);
        }

        let total = 0;
        for (const item of Object.values(summary)) {
            if (!item) {
                continue;
            }
            total += Number(item.total || 0);
        }

        summary.total = PolicyDataMigrator.createSummaryItem(total);

        return summary;
    }

    /**
     * Migrate policy data
     * @param owner Owner
     * @param migrationConfig Migration config
     * @param userId
     * @param notifier Notifier
     * @param runData
     * @returns Migration errors
     */
    static async migrate(
        owner: string,
        migrationConfig: MigrationConfig,
        userId: string | null,
        notifier: INotificationStep,
        runData?: MigrationRun
    ): Promise<DocumentError[]> {
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

                if (srcModelDryRun) {
                    policyUsers = await DatabaseServer.getVirtualUsers(srcModel.id)
                } else {
                    policyUsers = await users.getUsersBySrId(owner, userId);
                }

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
                notifier,
            );
            return await policyDataMigrator._migrateData(
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
                srcModel.id,
                retireContractId,
                migrationConfig,
                runData
            );
        } catch (error) {
            await new PinoLogger().error(error.message, ['GUARDIAN_SERVICE'], userId);
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
     * @param srcPolicyId
     * @param retireContractId
     * @param userId
     * @param migrationConfig
     * @param existingRunData
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
        srcPolicyId: string,
        retireContractId?: string,
        migrationConfig?: MigrationConfig,
        existingRunData?: MigrationRun
    ): Promise<DocumentError[]> {
        const db = new DatabaseServer(this._dryRunId);
        const isResumeRun = !!existingRunData;

        const runClass: new () => BaseEntity = MigrationRun;
        let run: MigrationRun;

        if (existingRunData) {
            run = existingRunData;
            run.status = MigrationRunStatus.RUNNING;
            run.stopRequested = false;
            run.finishedAt = undefined;
            run.heartbeatAt = new Date();
            run = (await db.save(runClass, run)) as MigrationRun;
        } else {
            const initialSummary = PolicyDataMigrator.buildInitialSummaryFromLoadedData({
                srcVCs: vcs,
                srcVPs: vps,
                srcRoleVcs: roleVcs,
                policyRoles: roles,
                policyStates: states,
                srcMintRequests: mintRequests,
                srcMintTransactions: mintTransactions,
                srcMultiDocuments: multiSignDocuments,
                srcAggregateVCs: aggregateVCs,
                srcSplitDocuments: splitDocuments,
                srcDocumentStates: documentStates,
                srcTokens: dynamicTokens,
                srcRetirePools: retirePools,
                migrateState,
                migrateRetirePools
            });

            const runData: Partial<MigrationRun> = {
                srcPolicyId,
                dstPolicyId: this._policyId,
                status: MigrationRunStatus.RUNNING,
                startedBy: userId || undefined,
                stopRequested: false,
                summary: initialSummary,
                config: migrationConfig,
                startedAt: new Date(),
                heartbeatAt: new Date(),
                finishedAt: undefined,
                error: undefined
            };

            run = (await db.save(runClass, runData)) as MigrationRun;
        }

        await PolicyDataMigrator.loadRunMessageCacheFromDb(db, run);
        const errors = new Array<DocumentError>();

        try {
            // <-- Steps
            const STEP_MIGRATE_POLICY = 'Migrate policy state';
            const STEP_MIGRATE_DOCUMENTS_TOKEN = 'Migrate documents and tokens';
            // Steps -->

            this._notifier.addStep(STEP_MIGRATE_POLICY);
            this._notifier.addStep(STEP_MIGRATE_DOCUMENTS_TOKEN);
            this._notifier.start();

            this._notifier.startStep(STEP_MIGRATE_POLICY);
            if (migrateState) {
                if (this._dryRunId) {
                    await this._createVirtualUsers(users);
                }

                await this._migratePolicyRoles(
                    roles,
                    userId,
                    run as MigrationRun,
                    errors,
                    PolicyDataMigrator.migrationWriteBatchSize,
                    isResumeRun
                );

                await this._migrateDocument<VcDocument>(
                    'roleVcDocument',
                    roleVcs,
                    (vc: VcDocument, uid: string | null) =>
                        this._migrateRoleVc(vc, uid, run as MigrationRun, roles),
                    this._db.saveVC.bind(this._db),
                    userId,
                    run as MigrationRun,
                    errors,
                    null,
                    '',
                    PolicyDataMigrator.migrationWriteBatchSize,
                    isResumeRun
                );

                if (states?.length > 0) {
                    const [{config: srcBlockTree}, {config: blockTree}] = await Promise.all([
                        DatabaseServer.getPolicyById(srcPolicyId),
                        DatabaseServer.getPolicyById(this._policyId)
                    ]);

                    const srcStepStateMap = new Map<number, string>();
                    const stepStateMap = new Map<string, number>();
                    const stepBlockStates: BlockState[] = [];

                    states.forEach(state => {
                        const srcBlock = this.findBlockById(srcBlockTree, state.blockId);
                        if (srcBlock?.blockType === BlockType.Step && srcBlock.children?.length > 0) {
                            srcBlock.children.forEach((child, index) => {
                                srcStepStateMap.set(index, child.tag)
                            });
                            stepBlockStates.push(state);
                        }

                        const block = this.findBlockByTag(blockTree, srcBlock?.tag);
                        if (block && block.blockType === BlockType.Step && block.children?.length > 0) {
                            block.children.forEach((child, index) => {
                                stepStateMap.set(child.tag, index)
                            });
                        }
                    });
                    stepBlockStates.forEach(stepState => {
                        const blockState = JSON.parse(stepState.blockState);
                        if (blockState && blockState.state) {
                            const currentState = blockState.state;
                            for (const key in currentState) {
                                if (currentState.hasOwnProperty(key)) {
                                    if (
                                        currentState[key]?.index !== undefined &&
                                        currentState[key]?.index !== null &&
                                        srcStepStateMap.get(currentState[key].index)
                                    ) {
                                        const tag = srcStepStateMap.get(currentState[key].index);
                                        currentState[key].index = stepStateMap.get(tag) ?? currentState[key].index;
                                    }
                                }
                            }
                        }
                        stepState.blockState = JSON.stringify(blockState);
                    });
                }

                await this._migratePolicyStates(
                    states,
                    run as MigrationRun,
                    errors,
                    PolicyDataMigrator.migrationWriteBatchSize,
                    isResumeRun
                );
                this._notifier.completeStep(STEP_MIGRATE_POLICY);
            } else {
                this._notifier.skipStep(STEP_MIGRATE_POLICY);
            }

            const migrationSummary = run.summary as MigrationRunSummary;
            const documentsStep = this._notifier.getStep(STEP_MIGRATE_DOCUMENTS_TOKEN);

            const vcTotal = Number(migrationSummary?.vcDocument?.total || 0);
            const vpTotal = Number(migrationSummary?.vpDocument?.total || 0);
            const mintRequestTotal = Number(migrationSummary?.mintRequest?.total || 0);
            const mintTransactionTotal = Number(migrationSummary?.mintTransaction?.total || 0);
            const retirePoolTotal = Number(migrationSummary?.retirePool?.total || 0);

            const vcProgressStep = documentsStep
                ? documentsStep.addStep('VC documents', vcTotal > 0 ? vcTotal : 1, true)
                : null;
            const vpProgressStep = documentsStep
                ? documentsStep.addStep('VP documents', vpTotal > 0 ? vpTotal : 1, true)
                : null;

            const mintRequestProgressStep = documentsStep && migrateState
                ? documentsStep.addStep('Mint requests', mintRequestTotal > 0 ? mintRequestTotal : 1, true)
                : null;
            const mintTransactionProgressStep = documentsStep && migrateState
                ? documentsStep.addStep('Mint transactions', mintTransactionTotal > 0 ? mintTransactionTotal : 1, true)
                : null;
            const retirePoolProgressStep = documentsStep && migrateState && migrateRetirePools
                ? documentsStep.addStep('Retire pools', retirePoolTotal > 0 ? retirePoolTotal : 1, true)
                : null;

            if (vcProgressStep) {
                vcProgressStep.start();
                if (vcTotal === 0) {
                    vcProgressStep.complete();
                }
            }

            if (vpProgressStep) {
                vpProgressStep.start();
                if (vpTotal === 0) {
                    vpProgressStep.complete();
                }
            }

            if (mintRequestProgressStep) {
                mintRequestProgressStep.start();
                if (mintRequestTotal === 0) {
                    mintRequestProgressStep.complete();
                }
            }

            if (mintTransactionProgressStep) {
                mintTransactionProgressStep.start();
                if (mintTransactionTotal === 0) {
                    mintTransactionProgressStep.complete();
                }
            }

            if (retirePoolProgressStep) {
                retirePoolProgressStep.start();
                if (retirePoolTotal === 0) {
                    retirePoolProgressStep.complete();
                }
            }

            this._notifier.startStep(STEP_MIGRATE_DOCUMENTS_TOKEN);
            await this._migrateDocument<VcDocument>(
                'vcDocument',
                vcs,
                (vc: VcDocument, uid: string | null) =>
                    this._migrateVcDocument(vc, vcs, roles, dynamicTokens, uid, run as MigrationRun),
                this._db.saveVC.bind(this._db),
                userId,
                run as MigrationRun,
                errors,
                vcProgressStep,
                'VC Documents',
                PolicyDataMigrator.migrationWriteBatchSize,
                isResumeRun
            );

            if (vcProgressStep && vcTotal > 0) {
                vcProgressStep.complete();
            }

            if (migrateState) {
                await this._migrateDocument<MultiDocuments>(
                    'multiDocument',
                    multiSignDocuments,
                    this._migrateMultiSignDocument.bind(this),
                    async (doc) => {
                        await this._db.setMultiSigDocument(
                            doc.uuid,
                            this._policyId,
                            doc.documentId,
                            {
                                id: doc.userId,
                                did: doc.did,
                                group: doc.group,
                                username: doc.username,
                            },
                            doc.status || '',
                            doc .document
                        );
                    },
                    userId,
                    run,
                    errors,
                    null,
                    '',
                    PolicyDataMigrator.migrationWriteBatchSize,
                    isResumeRun
                );

                await this._migrateDocument<DocumentState>(
                    'documentState',
                    documentStates,
                    this._migrateDocumentState.bind(this),
                    this._db.saveDocumentState.bind(this._db),
                    userId,
                    run as MigrationRun,
                    errors,
                    null,
                    '',
                    PolicyDataMigrator.migrationWriteBatchSize,
                    isResumeRun
                );

                await this._migrateDocument<AggregateVC>(
                    'aggregateVc',
                    aggregateVCs,
                    this._migrateAggregateVC.bind(this),
                    async (doc) => {
                        await this._db.createAggregateDocuments(
                            doc as any,
                            doc.blockId
                        );
                    },
                    userId,
                    run as MigrationRun,
                    errors,
                    null,
                    '',
                    PolicyDataMigrator.migrationWriteBatchSize,
                    isResumeRun
                );

                await this._migrateDocument<SplitDocuments>(
                    'splitDocument',
                    splitDocuments,
                    this._migrateSplitDocument.bind(this),
                    async (doc) => {
                        await this._db.setResidue(doc as any);
                    },
                    userId,
                    run as MigrationRun,
                    errors,
                    null,
                    '',
                    PolicyDataMigrator.migrationWriteBatchSize,
                    isResumeRun
                );
            }

            await this._migrateDocument<VpDocument>(
                'vpDocument',
                vps,
                (vp: VpDocument, uid: string | null) =>
                    this._migrateVpDocument(vp as VpDocument & { group: string }, uid, run as MigrationRun),
                this._db.saveVP.bind(this._db),
                userId,
                run as MigrationRun,
                errors,
                vpProgressStep,
                'VP Documents',
                PolicyDataMigrator.migrationWriteBatchSize,
                isResumeRun
            );

            if (vpProgressStep && vpTotal > 0) {
                vpProgressStep.complete();
            }

            if (migrateState) {
                await this._migrateMintRequests(
                    mintRequests,
                    mintTransactions,
                    run as MigrationRun,
                    errors,
                    mintRequestProgressStep,
                    mintTransactionProgressStep,
                    PolicyDataMigrator.migrationWriteBatchSize,
                    isResumeRun
                );

                if (mintRequestProgressStep && mintRequestTotal > 0) {
                    mintRequestProgressStep.complete();
                }
                if (mintTransactionProgressStep && mintTransactionTotal > 0) {
                    mintTransactionProgressStep.complete();
                }
            }

            if (migrateRetirePools && migrateState) {
                await this.migrateTokenPools(
                    retireContractId,
                    retirePools,
                    run as MigrationRun,
                    userId,
                    errors,
                    retirePoolProgressStep,
                    'Retire pools',
                    PolicyDataMigrator.migrationWriteBatchSize,
                    isResumeRun
                );

                if (retirePoolProgressStep && retirePoolTotal > 0) {
                    retirePoolProgressStep.complete();
                }
            }
            this._notifier.completeStep(STEP_MIGRATE_DOCUMENTS_TOKEN);

            if (run.status === MigrationRunStatus.RUNNING) {
                const tokenSummary = (run.summary as MigrationRunSummary)?.token;
                if (tokenSummary) {
                    const total = Number(tokenSummary.total || 0);
                    const failed = Number(tokenSummary.failed || 0);
                    if (total > 0 && this._processedTokenIds.size > 0) {
                        tokenSummary.success = Math.min(total, this._processedTokenIds.size);
                        tokenSummary.failed = Math.min(total - tokenSummary.success, failed);
                    }
                }
                run.status = MigrationRunStatus.COMPLETED;
                run.finishedAt = new Date();
                run.heartbeatAt = new Date();
                await this._db.save(MigrationRun, run as MigrationRun);
            }

            return errors;
        } catch (error) {
            if (run.status !== MigrationRunStatus.STOPPED) {
                const tokenSummary = (run.summary as MigrationRunSummary)?.token;
                if (tokenSummary) {
                    const total = Number(tokenSummary.total || 0);
                    const failed = Number(tokenSummary.failed || 0);
                    if (total > 0 && this._processedTokenIds.size > 0) {
                        tokenSummary.success = Math.min(total, this._processedTokenIds.size);
                        tokenSummary.failed = Math.min(total - tokenSummary.success, failed);
                    }
                }
                run.status = MigrationRunStatus.FAILED;
                run.finishedAt = new Date();
                run.heartbeatAt = new Date();
                run.error = error?.toString();
                await this._db.save(MigrationRun, run as MigrationRun);

                errors.push({
                    id: 'migration',
                    message: error?.toString()
                });
            }
            throw error;
        } finally {
            const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(
                run.srcPolicyId,
                run.dstPolicyId,
                run.startedBy
            );

            PolicyDataMigrator.clearRunCache(scopeKey);
            this._processedTokenIds.clear();
        }
    }

    /**
     * Migrate token pools
     * @param contractId Contract identifier
     * @param pools
     * @param run
     * @param userId
     * @param errors
     * @param progressStep
     * @param progressLabel
     * @param writeBatchSize
     * @param isResumeRun
     */
    async migrateTokenPools(
        contractId: string,
        pools: RetirePool[],
        run: MigrationRun,
        userId: string | null,
        errors: DocumentError[],
        progressStep: INotificationStep | null = null,
        progressLabel: string = 'Retire pools',
        writeBatchSize = PolicyDataMigrator.migrationWriteBatchSize,
        isResumeRun = false,
    ) {
        if (!contractId) {
            return;
        }

        const summary = run.summary as MigrationRunSummary;
        const entityType = 'retirePool';
        const poolSummary = summary?.retirePool;

        if (!poolSummary) {
            throw new Error('Summary item not found for entityType: retirePool');
        }

        const reportRetirePoolProgress = this.createBatchStepProgressReporter(
            progressStep,
            progressLabel || 'Retire pools',
            poolSummary
        );

        const getSourceId = (pool: RetirePool): string | undefined => {
            if (pool?.id) {
                return pool.id;
            }
            if ((pool as any)?._id) {
                return (pool as any)._id;
            }
            return;
        };

        const saveFailedItem = async (pool: RetirePool, error: any) => {
            const srcEntityId = getSourceId(pool);
            if (!srcEntityId) {
                return;
            }

            const existing = await this._db.findOne(MigrationFailedItem, {
                runId: run.id,
                entityType,
                srcEntityId
            } as Partial<MigrationFailedItem>);

            if (existing) {
                existing.attemptCount = Number(existing.attemptCount || 0) + 1;
                existing.errorMessage = error?.toString();
                existing.lastFailedAt = new Date();
                await this._db.save(MigrationFailedItem, existing);
                return;
            }

            const failed: Partial<MigrationFailedItem> = {
                runId: run.id,
                srcPolicyId: run.srcPolicyId,
                dstPolicyId: run.dstPolicyId,
                entityType,
                srcEntityId,
                attemptCount: 1,
                errorMessage: error?.toString(),
                firstFailedAt: new Date(),
                lastFailedAt: new Date()
            };

            await this._db.save(MigrationFailedItem, failed);
        };

        const notEmptyPools = pools.filter((item) => !!item);

        const startIndex = PolicyDataMigrator.resolveStartIndexByCursor(
            notEmptyPools,
            poolSummary.cursorLastId,
            (pool: RetirePool) => getSourceId(pool)
        );

        const pendingMappings: Partial<MigrationMessageMap>[] = [];

        for (let writeOffset = startIndex; writeOffset < notEmptyPools.length; writeOffset += writeBatchSize) {
            const latestRun = await this._db.findOne(MigrationRun, { id: run.id } as Partial<MigrationRun>);
            if (latestRun?.stopRequested) {
                run.stopRequested = true;
                run.status = MigrationRunStatus.STOPPED;
                run.finishedAt = new Date();
                run.heartbeatAt = new Date();
                run.summary = summary;

                const flushedOnStop = await this.flushMappingsToDb(pendingMappings);
                PolicyDataMigrator.applyFlushedMappingsToMemory(flushedOnStop);

                await this._db.save(MigrationRun, run);
                return;
            }

            const writeBatch = notEmptyPools.slice(writeOffset, writeOffset + writeBatchSize);

            const tasks = writeBatch.map(async (pool) => {
                const srcEntityId = getSourceId(pool);

                try {
                    const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                    // mapping pre-check (source of truth)
                    const mapped = PolicyDataMigrator.getMessageMapping(
                        scopeKey,
                        entityType,
                        srcEntityId
                    );
                    if (mapped) {
                        if (!isResumeRun) {
                            poolSummary.success += 1;
                        }
                        return;
                    }

                    const mappedPoolTokens = this.replacePoolTokens(pool.tokens);

                    await setPoolContract(
                        new Workers(),
                        contractId,
                        this._root.hederaAccountId,
                        this._rootKey,
                        mappedPoolTokens,
                        pool.immediately,
                        userId
                    );

                    // retirePool has no stable dst id from contract call, keep src id as dst marker
                    PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                        startedBy: run.startedBy,
                        srcPolicyId: run.srcPolicyId,
                        dstPolicyId: run.dstPolicyId,
                        entityType: entityType,
                        srcEntityId,
                        srcMessageId: srcEntityId,
                        dstMessageId: srcEntityId
                    });

                    poolSummary.success += 1;
                } catch (error) {
                    poolSummary.failed += 1;
                    errors.push({
                        id: srcEntityId || (pool as any)?.id || (pool as any)?._id,
                        message: error?.toString(),
                    });
                    await saveFailedItem(pool, error);
                }
            });

            await Promise.all(tasks);

            const flushed = await this.flushMappingsToDb(pendingMappings);

            const lastPool = writeBatch[writeBatch.length - 1];
            const lastCursor = getSourceId(lastPool);

            await this.saveRunProgressAfterWriteBatch(
                run,
                summary,
                entityType,
                lastCursor
            );

            reportRetirePoolProgress();

            PolicyDataMigrator.applyFlushedMappingsToMemory(flushed);
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
     * Find block in policy config by id
     * @param policyConfig policy config
     * @param blockId block id
     * @returns Policy block or null
     */
    private findBlockById(policyConfig: any, blockId: string): any | null {
        for (const node of policyConfig.children) {
            if (node.id === blockId) {
                return node;
            }

            if (node.children && node.children.length) {
                const found = this.findBlockById(node, blockId);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }

    /**
     * Find block in policy config by tag
     * @param tree
     * @param blockTag block tag
     * @returns Policy block or null
     */
    private findBlockByTag(tree: any, blockTag: string): any | null {
        for (const node of tree.children) {
            if (node.tag === blockTag) {
                return node;
            }

            if (node.children && node.children.length) {
                const found = this.findBlockByTag(node, blockTag);
                if (found) {
                    return found;
                }
            }
        }
        return null;
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
                this._processedTokenIds.add(String(tokenId));
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
            this._processedTokenIds.add(String(tokenId));
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

        const [contractId, log] = await createContractV2(
            ContractAPI.CREATE_CONTRACT,
            new Workers(),
            ContractType.WIPE,
            this._root.hederaAccountId,
            this._rootKey,
            topic.topicId,
            userId
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
        await this._ms.setTopicObject(topic)
            .sendMessage(contractMessage, {
                sendToIPFS: true,
                memo: null,
                userId,
                interception: null
            });

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
        // this._notifier?.info(`Migrating DID ${did}`);
        await this._db.saveDid(didObj);
        return did;
    }

    /**
     * Migrate document wrapper
     * @param entityType
     * @param documents Documents
     * @param migrateFn Migrate function
     * @param saveFn Save function
     * @param userId
     * @param run
     * @param errors
     * @param progressStep
     * @param progressLabel
     * @param writeBatchSize
     * @param isResumeRun
     */
    private async _migrateDocument<T extends BaseEntity>(
        entityType: string,
        documents: T[],
        migrateFn: (document: T, userId: string | null) => Promise<T>,
        saveFn: (document: Partial<T>) => Promise<T | void>,
        userId: string | null,
        run: MigrationRun,
        errors: DocumentError[],
        progressStep: INotificationStep | null = null,
        progressLabel: string = '',
        writeBatchSize = PolicyDataMigrator.migrationWriteBatchSize,
        isResumeRun = false,
    ) {
        const summary = run.summary as MigrationRunSummary;
        const entitySummary = summary?.[entityType];

        if (!entitySummary) {
            throw new Error(`Summary item not found for entityType: ${entityType}`);
        }

        const reportBatchProgress = this.createBatchStepProgressReporter(
            progressStep,
            progressLabel || entityType,
            entitySummary
        );

        const saveFailedItem = async (document: T, error: any) => {
            const sourceKeys = PolicyDataMigrator.extractSourceKeys(entityType, document);
            const srcEntityId = sourceKeys.srcEntityId;
            if (!srcEntityId) {
                return;
            }

            const existing = await this._db.findOne(MigrationFailedItem, {
                runId: run.id,
                entityType,
                srcEntityId
            } as Partial<MigrationFailedItem>);

            if (existing) {
                existing.attemptCount = Number(existing.attemptCount || 0) + 1;
                existing.errorMessage = error?.toString();
                existing.lastFailedAt = new Date();
                await this._db.save(MigrationFailedItem, existing);
                return;
            }

            const failed: Partial<MigrationFailedItem> = {
                runId: run.id,
                srcPolicyId: run.srcPolicyId,
                dstPolicyId: run.dstPolicyId,
                entityType,
                srcEntityId,
                attemptCount: 1,
                errorMessage: error?.toString(),
                firstFailedAt: new Date(),
                lastFailedAt: new Date()
            };

            await this._db.save(MigrationFailedItem, failed);
        };

        const notEmptyDocuments = documents.filter((item) => !!item);

        const startIndex = PolicyDataMigrator.resolveStartIndexByCursor(
            notEmptyDocuments,
            entitySummary.cursorLastId,
            (document: T) => PolicyDataMigrator.extractSourceKeys(entityType, document).srcEntityId
        );

        const pendingMappings: Partial<MigrationMessageMap>[] = [];

        for (let writeOffset = startIndex; writeOffset < notEmptyDocuments.length; writeOffset += writeBatchSize) {
            const latestRun = await this._db.findOne(MigrationRun, { id: run.id } as Partial<MigrationRun>);
            if (latestRun?.stopRequested) {
                run.stopRequested = true;
                run.status = MigrationRunStatus.STOPPED;
                run.finishedAt = new Date();
                run.heartbeatAt = new Date();
                run.summary = summary;

                const flushedOnStop = await this.flushMappingsToDb(pendingMappings);
                PolicyDataMigrator.applyFlushedMappingsToMemory(flushedOnStop);

                await this._db.save(MigrationRun, run);
                return;
            }

            const writeBatch = notEmptyDocuments.slice(writeOffset, writeOffset + writeBatchSize);

            const tasks = writeBatch.map(async (document) => {
                const sourceKeys = PolicyDataMigrator.extractSourceKeys(entityType, document);
                const srcEntityId = sourceKeys.srcEntityId;
                const srcMapKey = sourceKeys.srcMessageId || srcEntityId;

                try {
                    if (srcMapKey) {
                        const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                        const mapped = PolicyDataMigrator.getMessageMapping(
                            scopeKey,
                            entityType,
                            srcMapKey
                        );
                        if (mapped) {
                            if (!isResumeRun) {
                                entitySummary.success += 1;
                            }
                            return;
                        }
                    }

                    const newDocument = await migrateFn(document, userId);
                    if (!newDocument) {
                        entitySummary.success += 1;
                        return;
                    }

                    const destinationKeys = PolicyDataMigrator.extractSourceKeys(entityType, newDocument);
                    const dstEntityId = destinationKeys.srcEntityId || srcEntityId;
                    const dstMapKey = destinationKeys.srcMessageId || dstEntityId || srcMapKey;

                    PolicyDataMigrator.clearEntityMeta(newDocument);

                    await saveFn(newDocument);

                    if (srcEntityId && srcMapKey && dstMapKey) {
                        PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                            startedBy: run.startedBy,
                            srcPolicyId: run.srcPolicyId,
                            dstPolicyId: run.dstPolicyId,
                            entityType,
                            srcEntityId,
                            srcMessageId: srcMapKey,
                            dstMessageId: dstMapKey
                        });
                    }

                    entitySummary.success += 1;
                } catch (error) {
                    if (String(error).includes('JSON Object is empty')) {
                        entitySummary.success += 1;
                        await new PinoLogger().warn(error.message, ['GUARDIAN_SERVICE'], userId);
                        return;
                    }

                    entitySummary.failed += 1;
                    errors.push({
                        id: srcEntityId || (document as any)?.id || (document as any)?._id,
                        message: error?.toString(),
                    });
                    await saveFailedItem(document, error);
                }
            });

            await Promise.all(tasks);

            const lastDocument = writeBatch[writeBatch.length - 1];
            const lastCursor = PolicyDataMigrator.extractSourceKeys(entityType, lastDocument).srcEntityId;

            const flushed = await this.flushMappingsToDb(pendingMappings);

            await this.saveRunProgressAfterWriteBatch(
                run,
                summary,
                entityType,
                lastCursor
            );

            reportBatchProgress()

            PolicyDataMigrator.applyFlushedMappingsToMemory(flushed);
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
            if (user.username === 'Administrator') {
                continue;
            }

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
     * @param run
     * @param sourceRoles
     * @returns VC
     */
    private async _migrateRoleVc(
        doc: VcDocument,
        userId: string | null,
        run: MigrationRun,
        sourceRoles: PolicyRoles[]
    ) {
        if (!doc) {
            return doc;
        }

        const srcMapKey = PolicyDataMigrator.getSourceMapKey('roleVcDocument', doc);
        if (srcMapKey) {
            const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

            const mappedMessageId = PolicyDataMigrator.getMessageMapping(
                scopeKey,
                'roleVcDocument',
                srcMapKey
            );
            if (mappedMessageId) {
                doc.messageId = mappedMessageId;
                return doc;
            }
        }

        const oldDocOwner = doc.owner;
        doc.owner = await this._replaceDidTopicId(doc.owner);

        let role;
        let sourceRole;
        if (doc.group) {
            sourceRole = sourceRoles?.find(
                (item) => item.uuid === doc.group && item.did === oldDocOwner
            ) || sourceRoles?.find(
                (item) => item.uuid === doc.group
            );
            const groups = await this._db.getGroupsByUser(
                this._policyId,
                doc.owner
            );
            role = groups.find(
                (group) =>
                    group?.groupName === this._groups[sourceRole?.groupName] ||
                    group.role === this._roles[sourceRole?.role] ||
                    group.uuid === doc.group
            );
            doc.group = role?.uuid;
        }
        const sourceRoleMessageId = sourceRole?.messageId
            ? String(sourceRole.messageId)
            : undefined;

        let vc: VcDocumentDefinition;
        const destinationSchemaIri = this._schemas?.[doc.schema] || doc.schema;
        const schema = await DatabaseServer.getSchema({
            topicId: this._policyTopicId,
            iri: destinationSchemaIri,
        });
        if (!schema) {
            throw new Error(
                `Schema not found: srcSchema=${String(doc.schema)}, dstSchema=${String(destinationSchemaIri)}, docId=${String((doc as any)?.id)}`
            );
        }

        if (
            doc.schema !== schema.iri ||
            this._policyTopicId !== this._oldPolicyTopicId
        ) {
            const vcHelper = new VcHelper();
            const didDocument = await vcHelper.loadDidDocument(this._owner, userId);
            const credentialSubject = SchemaHelper.updateObjectContext(
                new Schema(schema),
                doc.document.credentialSubject[0]
            );
            const verifyResult = await vcHelper.verifySubject(credentialSubject);
            if (!verifyResult.ok) {
                throw new Error(verifyResult.error.type);
            }
            vc = await vcHelper.createVerifiableCredential(
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
            const roleMessage = new RoleMessage(MessageAction.MigrateVC);
            roleMessage.setDocument(vc);
            if (role) {
                roleMessage.setRole(role);
            }

            const relationships = [doc.messageId];
            if (doc.relationships) {
                relationships.push(...doc.relationships);
            }
            roleMessage.setRelationships(relationships);
            roleMessage.setTag(doc);
            roleMessage.setEntityType(doc);
            roleMessage.setOption(doc);

            if (role) {
                const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);
                let resolvedRoleMessageId = role?.messageId ? String(role.messageId) : undefined;

                let mappedRoleMessageId: string | undefined;
                if (sourceRoleMessageId) {
                    mappedRoleMessageId = PolicyDataMigrator.getMessageMapping(
                        scopeKey,
                        'roleVcDocument',
                        sourceRoleMessageId
                    ) || PolicyDataMigrator.getMessageMapping(
                        scopeKey,
                        'vcDocument',
                        sourceRoleMessageId
                    );
                }

                if (mappedRoleMessageId) {
                    resolvedRoleMessageId = mappedRoleMessageId;
                }

                if (resolvedRoleMessageId) {
                    roleMessage.setUser(resolvedRoleMessageId);
                }
            }

            const result = await this._ms
                .setTopicObject(this._policyInstanceTopic)
                .sendMessage(roleMessage, {
                    sendToIPFS: true,
                    memo: null,
                    userId,
                    interception: null
                });

            const destinationMessageId = result.getId();

            doc.messageId = destinationMessageId;
            doc.topicId = result.getTopicId();
            doc.messageHash = result.toHash();

            if (srcMapKey) {
                const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                PolicyDataMigrator.setMessageMapping(
                    scopeKey,
                    'roleVcDocument',
                    srcMapKey,
                    destinationMessageId
                );
            }

            if (role) {
                const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);
                if (sourceRoleMessageId) {
                    PolicyDataMigrator.setMessageMapping(
                        scopeKey,
                        'roleVcDocument',
                        sourceRoleMessageId,
                        destinationMessageId
                    );
                }

                role.messageId = destinationMessageId;
                await this._db.setUserInGroup(role);
            }
        }

        return doc;
    }

    /**
     * Migrate policy states
     * @param states States
     * @param run
     * @param errors
     * @param writeBatchSize
     * @param isResumeRun
     */
    private async _migratePolicyStates(
        states: BlockState[],
        run: MigrationRun,
        errors: DocumentError[],
        writeBatchSize = PolicyDataMigrator.migrationWriteBatchSize,
        isResumeRun = false,
    ) {
        const entityType: keyof MigrationRunSummary = 'policyState';
        const summary = run.summary;
        const stateSummary = summary?.policyState;

        const getSourceId = (state: BlockState): string | undefined => {
            if (state?.id) {
                return state.id;
            }
            if ((state as any)?._id) {
                return (state as any)._id;
            }
            if (state?.blockId) {
                return state.blockId;
            }
            return;
        };

        const saveFailedItem = async (state: BlockState, error: any) => {
            const srcEntityId = getSourceId(state);
            if (!srcEntityId) {
                return;
            }

            const existing = await this._db.findOne(MigrationFailedItem, {
                runId: run.id,
                entityType,
                srcEntityId
            } as Partial<MigrationFailedItem>);

            if (existing) {
                existing.attemptCount = Number(existing.attemptCount || 0) + 1;
                existing.errorMessage = error?.toString();
                existing.lastFailedAt = new Date();
                await this._db.save(MigrationFailedItem, existing);
                return;
            }

            const failed: Partial<MigrationFailedItem> = {
                runId: run.id,
                srcPolicyId: run.srcPolicyId,
                dstPolicyId: run.dstPolicyId,
                entityType,
                srcEntityId,
                attemptCount: 1,
                errorMessage: error?.toString(),
                firstFailedAt: new Date(),
                lastFailedAt: new Date()
            };

            await this._db.save(MigrationFailedItem, failed);
        };

        const notEmptyStates = states.filter((item) => !!item);

        const startIndex = PolicyDataMigrator.resolveStartIndexByCursor(
            notEmptyStates,
            stateSummary.cursorLastId,
            (state: BlockState) => getSourceId(state)
        );

        for (let writeOffset = startIndex; writeOffset < notEmptyStates.length; writeOffset += writeBatchSize) {
            const latestRun = await this._db.findOne(MigrationRun, { id: run.id } as Partial<MigrationRun>);
            if (latestRun?.stopRequested) {
                run.stopRequested = true;
                run.status = MigrationRunStatus.STOPPED;
                run.finishedAt = new Date();
                run.heartbeatAt = new Date();
                run.summary = summary;
                await this._db.save(MigrationRun, run);
                return;
            }

            const writeBatch = notEmptyStates.slice(writeOffset, writeOffset + writeBatchSize);
            const mappingBuffer: Partial<MigrationMessageMap>[] = [];

            const tasks = writeBatch.map(async (sourceState) => {
                const keys = PolicyDataMigrator.extractSourceKeys(entityType, sourceState);
                const srcEntityId = keys.srcEntityId || getSourceId(sourceState);

                try {
                    if (!srcEntityId) {
                        throw new Error('Source entity id not found for policyState');
                    }

                    const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                    const mapped = PolicyDataMigrator.getMessageMapping(scopeKey, entityType, srcEntityId);
                    if (mapped) {
                        if (!isResumeRun) {
                            stateSummary.success += 1;
                        }
                        return;
                    }

                    const destinationBlockId = sourceState.blockId && this._blocks[sourceState.blockId];
                    if (!destinationBlockId) {
                        throw new Error('Destination block mapping not found for policy state');
                    }

                    const data = JSON.parse(sourceState.blockState);

                    if (data?.state) {
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
                        destinationBlockId,
                        null,
                        data
                    );

                    PolicyDataMigrator.appendMappingToBuffer(mappingBuffer, {
                        startedBy: run.startedBy,
                        srcPolicyId: run.srcPolicyId,
                        dstPolicyId: run.dstPolicyId,
                        entityType,
                        srcMessageId: srcEntityId,
                        dstMessageId: destinationBlockId,
                        srcEntityId
                    });

                    stateSummary.success += 1;
                } catch (error) {
                    stateSummary.failed += 1;
                    errors.push({
                        id: srcEntityId || (sourceState as any)?.id || (sourceState as any)?._id || (sourceState as any)?.blockId,
                        message: error?.toString(),
                    });
                    await saveFailedItem(sourceState, error);
                }
            });

            await Promise.all(tasks);

            const flushedMappings = await this.flushMappingsToDb(mappingBuffer);

            const lastState = writeBatch[writeBatch.length - 1];
            const lastCursor = getSourceId(lastState);
            if (lastCursor) {
                stateSummary.cursorLastId = lastCursor;
            }

            await this.saveRunProgressAfterWriteBatch(run, summary, entityType);
            PolicyDataMigrator.applyFlushedMappingsToMemory(flushedMappings);
        }
    }

    /**
     * Migrate policy roles
     * @param roles Roles
     * @param userId
     * @param run
     * @param errors
     * @param writeBatchSize
     * @param isResumeRun
     */
    private async _migratePolicyRoles(
        roles: PolicyRoles[],
        userId: string | null,
        run: MigrationRun,
        errors: DocumentError[],
        writeBatchSize = PolicyDataMigrator.migrationWriteBatchSize,
        isResumeRun = false,
    ) {
        const entityType = 'policyRole';
        const summary = run.summary as MigrationRunSummary;
        const roleSummary = summary?.policyRole;

        const getSourceId = (role: PolicyRoles): string | undefined => {
            const keys = PolicyDataMigrator.extractSourceKeys(entityType, role);
            return keys.srcEntityId;
        };

        const saveFailedItem = async (role: PolicyRoles, error: any) => {
            const srcEntityId = getSourceId(role);
            if (!srcEntityId) {
                return;
            }

            const existing = await this._db.findOne(MigrationFailedItem, {
                runId: run.id,
                entityType,
                srcEntityId
            } as Partial<MigrationFailedItem>);

            if (existing) {
                existing.attemptCount = Number(existing.attemptCount || 0) + 1;
                existing.errorMessage = error?.toString();
                existing.lastFailedAt = new Date();
                await this._db.save(MigrationFailedItem, existing);
                return;
            }

            const failed: Partial<MigrationFailedItem> = {
                runId: run.id,
                srcPolicyId: run.srcPolicyId,
                dstPolicyId: run.dstPolicyId,
                entityType,
                srcEntityId,
                attemptCount: 1,
                errorMessage: error?.toString(),
                firstFailedAt: new Date(),
                lastFailedAt: new Date()
            };

            await this._db.save(MigrationFailedItem, failed);
        };

        const pendingMappings: Partial<MigrationMessageMap>[] = [];

        const notEmptyRoles = roles.filter((item) => !!item);

        const startIndex = PolicyDataMigrator.resolveStartIndexByCursor(
            notEmptyRoles,
            roleSummary.cursorLastId,
            (role: PolicyRoles) => getSourceId(role)
        );

        for (let writeOffset = startIndex; writeOffset < notEmptyRoles.length; writeOffset += writeBatchSize) {
            const latestRun = await this._db.findOne(MigrationRun, { id: run.id } as Partial<MigrationRun>);
            if (latestRun?.stopRequested) {
                run.stopRequested = true;
                run.status = MigrationRunStatus.STOPPED;
                run.finishedAt = new Date();
                run.heartbeatAt = new Date();
                run.summary = summary;

                const flushedOnStop = await this.flushMappingsToDb(pendingMappings);
                PolicyDataMigrator.applyFlushedMappingsToMemory(flushedOnStop);

                await this._db.save(MigrationRun, run);
                return;
            }

            const writeBatch = notEmptyRoles.slice(writeOffset, writeOffset + writeBatchSize);

            const tasks = writeBatch.map(async (sourceRole) => {
                const srcEntityId = getSourceId(sourceRole);

                try {
                    if (srcEntityId) {
                        const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                        const mapped = PolicyDataMigrator.getMessageMapping(
                            scopeKey,
                            entityType,
                            srcEntityId
                        );
                        if (mapped) {
                            if (!isResumeRun) {
                                roleSummary.success += 1;
                            }
                            return;
                        }
                    }

                    const role = { ...(sourceRole as any) } as PolicyRoles;

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

                    const existingGroups = await this._db.getGroupsByUser(this._policyId, role.did);
                    const exists = existingGroups.some((item) => {
                        if (role.groupName && item.groupName === role.groupName) {
                            return true;
                        }
                        if (role.role && item.role === role.role) {
                            return true;
                        }
                        return false;
                    });

                    if (!exists) {
                        PolicyDataMigrator.clearEntityIdentity(role);
                        await this._db.setUserInGroup(role);
                    }

                    if (srcEntityId) {
                        PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                            startedBy: run.startedBy,
                            srcPolicyId: run.srcPolicyId,
                            dstPolicyId: run.dstPolicyId,
                            entityType,
                            srcEntityId,
                            srcMessageId: srcEntityId,
                            dstMessageId: srcEntityId
                        });
                    }

                    roleSummary.success += 1;
                } catch (error) {
                    roleSummary.failed += 1;
                    errors.push({
                        id: srcEntityId || sourceRole?.id || (sourceRole as any)?._id || sourceRole?.did,
                        message: error?.toString(),
                    });
                    await saveFailedItem(sourceRole, error);
                }
            });

            await Promise.all(tasks);

            const lastRole = writeBatch[writeBatch.length - 1];
            const cursor = getSourceId(lastRole);

            const flushed = await this.flushMappingsToDb(pendingMappings);

            await this.saveRunProgressAfterWriteBatch(
                run,
                summary,
                entityType,
                cursor
            );

            PolicyDataMigrator.applyFlushedMappingsToMemory(flushed);
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
     * @param run
     * @returns VP
     */
    private async _migrateVpDocument(
        doc: VpDocument & { group: string },
        userId: string | null,
        run: MigrationRun
    ) {
        if (!doc) {
            return doc;
        }

        const srcMapKey = PolicyDataMigrator.getSourceMapKey('vpDocument', doc);
        if (srcMapKey) {
            const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

            const mappedMessageId = PolicyDataMigrator.getMessageMapping(
                scopeKey,
                'vpDocument',
                srcMapKey
            );
            if (mappedMessageId) {
                doc.messageId = mappedMessageId;
                return doc;
            }
        }

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
                    item?.groupName === this._groups[srcGroup?.groupName] ||
                    item.role === this._roles[srcGroup?.role]
            );
            doc.group = userRole ? userRole.uuid : null;
        }

        const vcs = doc.document.verifiableCredential.map((item) =>
            VcDocumentDefinition.fromJsonTree(item)
        );

        let vpChanged = false;

        if (Array.isArray(doc.relationships)) {
            for (let i = 0; i < doc.relationships.length; i++) {
                const relationship = String(doc.relationships[i]);
                const migratedVc = this.vcMessageIds.get(relationship);
                if (migratedVc?.document) {
                    const migratedVcDef = VcDocumentDefinition.fromJsonTree(
                        migratedVc.document
                    );
                    for (let j = 0; j < vcs.length; j++) {
                        const element = vcs[j];
                        if (
                            element.getId() === migratedVcDef.getId() &&
                            element.toCredentialHash() !== migratedVcDef.toCredentialHash()
                        ) {
                            vpChanged = true;
                            vcs[j] = migratedVcDef;
                        }
                    }
                }
            }
        }

        let vp;
        if (vpChanged || this._oldPolicyOwner !== this._owner) {
            const vcHelper = new VcHelper();
            const didDocument = await vcHelper.loadDidDocument(this._owner, userId);
            vp = await vcHelper.createVerifiablePresentation(
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
            const vpMessage = new VPMessage(MessageAction.MigrateVP);
            vpMessage.setDocument(vp);
            vpMessage.setUser(null);
            vpMessage.setRelationships([...(doc.relationships || []), doc.messageId]);
            vpMessage.setTag(doc);
            vpMessage.setEntityType(doc);
            vpMessage.setOption(doc);

            const vpMessageResult = await this._ms
                .setTopicObject(this._policyInstanceTopic)
                .sendMessage(vpMessage, {
                    sendToIPFS: true,
                    memo: null,
                    userId,
                    interception: null
                });

            const destinationMessageId = vpMessageResult.getId();

            if (srcMapKey) {
                const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                PolicyDataMigrator.setMessageMapping(
                    scopeKey,
                    'vpDocument',
                    srcMapKey,
                    destinationMessageId
                );
            }

            doc.messageId = destinationMessageId;
            doc.topicId = vpMessageResult.getTopicId();
            doc.messageHash = vpMessageResult.toHash();
        }

        return doc;
    }

    /**
     * Migrate mint requests
     * @param mintRequests Mint requests
     * @param mintTransactions Mint transactions
     * @param run
     * @param errors
     * @param requestProgressStep
     * @param transactionProgressStep
     * @param writeBatchSize
     * @param isResumeRun
     */
    private async _migrateMintRequests(
        mintRequests: MintRequest[],
        mintTransactions: MintTransaction[],
        run: MigrationRun,
        errors: DocumentError[],
        requestProgressStep: INotificationStep | null = null,
        transactionProgressStep: INotificationStep | null = null,
        writeBatchSize = PolicyDataMigrator.migrationWriteBatchSize,
        isResumeRun = false,
    ) {
        const summary = run.summary as MigrationRunSummary;
        const requestSummary = summary?.mintRequest;
        const transactionSummary = summary?.mintTransaction;

        const reportMintRequestProgress = this.createBatchStepProgressReporter(
            requestProgressStep,
            'Mint requests',
            requestSummary
        );

        const reportMintTransactionProgress = this.createBatchStepProgressReporter(
            transactionProgressStep,
            'Mint transactions',
            transactionSummary
        );

        const getRequestSourceId = (request: MintRequest): string | undefined => {
            if (request?.id) {
                return String(request.id);
            }
            if ((request as any)?._id) {
                return String((request as any)._id);
            }
            return;
        };

        const getTransactionSourceId = (transaction: MintTransaction): string | undefined => {
            if (transaction?.id) {
                return String(transaction.id);
            }
            if ((transaction as any)?._id) {
                return String(transaction._id);
            }
            return;
        };

        const saveFailedItem = async (
            entityType: 'mintRequest' | 'mintTransaction',
            srcEntityId: string | undefined,
            error: any
        ) => {
            if (!srcEntityId) {
                return;
            }

            const existing = await this._db.findOne(MigrationFailedItem, {
                runId: run.id,
                entityType,
                srcEntityId
            } as Partial<MigrationFailedItem>);

            if (existing) {
                existing.attemptCount = Number(existing.attemptCount || 0) + 1;
                existing.errorMessage = error?.toString();
                existing.lastFailedAt = new Date();
                await this._db.save(MigrationFailedItem, existing);
                return;
            }

            const failed: Partial<MigrationFailedItem> = {
                runId: run.id,
                srcPolicyId: run.srcPolicyId,
                dstPolicyId: run.dstPolicyId,
                entityType,
                srcEntityId,
                attemptCount: 1,
                errorMessage: error?.toString(),
                firstFailedAt: new Date(),
                lastFailedAt: new Date()
            };

            await this._db.save(MigrationFailedItem, failed);
        };

        // src mintRequestId -> dst mintRequestId
        const mintRequestsMapping = new Map<string, string>();

        // ---------- MintRequest ----------
        const notEmptyRequests = mintRequests.filter((item) => !!item);

        const requestStartIndex = PolicyDataMigrator.resolveStartIndexByCursor(
            notEmptyRequests,
            requestSummary.cursorLastId,
            (request: MintRequest) => getRequestSourceId(request)
        );

        const requestMappingBuffer: Partial<MigrationMessageMap>[] = [];

        for (let writeOffset = requestStartIndex; writeOffset < notEmptyRequests.length; writeOffset += writeBatchSize) {
            const latestRun = await this._db.findOne(MigrationRun, { id: run.id } as Partial<MigrationRun>);
            if (latestRun?.stopRequested) {
                run.stopRequested = true;
                run.status = MigrationRunStatus.STOPPED;
                run.finishedAt = new Date();
                run.heartbeatAt = new Date();
                run.summary = summary;

                const flushedOnStop = await this.flushMappingsToDb(requestMappingBuffer);
                PolicyDataMigrator.applyFlushedMappingsToMemory(flushedOnStop);

                await this._db.save(MigrationRun, run);
                return;
            }

            const writeBatch = notEmptyRequests.slice(writeOffset, writeOffset + writeBatchSize);

            const tasks = writeBatch.map(async (request) => {
                const srcEntityId = getRequestSourceId(request);

                try {
                    const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                    // mapping pre-check
                    const mappedRequestId = PolicyDataMigrator.getMessageMapping(
                        scopeKey,
                        'mintRequest',
                        srcEntityId
                    );
                    if (mappedRequestId) {
                        mintRequestsMapping.set(srcEntityId, mappedRequestId);
                        if (!isResumeRun) {
                            requestSummary.success += 1;
                        }
                        return;
                    }

                    const sourceVpMessageId = request.vpMessageId || undefined;
                    const newVpMessageId = sourceVpMessageId
                        ? PolicyDataMigrator.getMessageMapping(scopeKey, 'vpDocument', sourceVpMessageId)
                        : undefined;

                    if (!newVpMessageId) {
                        throw new Error('VP mapping not found for mintRequest');
                    }

                    const requestToSave = { ...(request as any) } as MintRequest;
                    requestToSave.vpMessageId = newVpMessageId;
                    PolicyDataMigrator.clearEntityIdentity(requestToSave);

                    const newRequest = await this._db.saveMintRequest(requestToSave);
                    const dstRequestId = newRequest.id;

                    mintRequestsMapping.set(srcEntityId, dstRequestId);

                    PolicyDataMigrator.appendMappingToBuffer(requestMappingBuffer, {
                        startedBy: run.startedBy,
                        srcPolicyId: run.srcPolicyId,
                        dstPolicyId: run.dstPolicyId,
                        entityType: 'mintRequest',
                        srcEntityId,
                        srcMessageId: srcEntityId,
                        dstMessageId: dstRequestId
                    });

                    requestSummary.success += 1;
                } catch (error) {
                    requestSummary.failed += 1;
                    errors.push({
                        id: srcEntityId || request?.id || (request as any)?._id,
                        message: error?.toString(),
                    });
                    await saveFailedItem('mintRequest', srcEntityId, error);
                }
            });

            await Promise.all(tasks);

            const flushed = await this.flushMappingsToDb(requestMappingBuffer);

            const lastRequest = writeBatch[writeBatch.length - 1];
            const lastRequestCursor = getRequestSourceId(lastRequest);

            await this.saveRunProgressAfterWriteBatch(
                run,
                summary,
                'mintRequest',
                lastRequestCursor
            );

            reportMintRequestProgress();

            PolicyDataMigrator.applyFlushedMappingsToMemory(flushed);
        }

        // ---------- MintTransaction ----------
        const notEmptyTransactions = mintTransactions.filter((item) => !!item);

        const transactionStartIndex = PolicyDataMigrator.resolveStartIndexByCursor(
            notEmptyTransactions,
            transactionSummary.cursorLastId,
            (transaction: MintTransaction) => getTransactionSourceId(transaction)
        );

        const txMappingBuffer: Partial<MigrationMessageMap>[] = [];

        for (let writeOffset = transactionStartIndex; writeOffset < notEmptyTransactions.length; writeOffset += writeBatchSize) {
            const latestRun = await this._db.findOne(MigrationRun, { id: run.id } as Partial<MigrationRun>);
            if (latestRun?.stopRequested) {
                run.stopRequested = true;
                run.status = MigrationRunStatus.STOPPED;
                run.finishedAt = new Date();
                run.heartbeatAt = new Date();
                run.summary = summary;

                const flushedOnStop = await this.flushMappingsToDb(txMappingBuffer);
                PolicyDataMigrator.applyFlushedMappingsToMemory(flushedOnStop);

                await this._db.save(MigrationRun, run);
                return;
            }

            const writeBatch = notEmptyTransactions.slice(writeOffset, writeOffset + writeBatchSize);

            const tasks = writeBatch.map(async (transaction) => {
                const srcEntityId = getTransactionSourceId(transaction);

                try {
                    if (!srcEntityId) {
                        throw new Error('Source id not found for mintTransaction');
                    }
                    const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                    // mapping pre-check
                    const mappedTx = PolicyDataMigrator.getMessageMapping(
                        scopeKey,
                        'mintTransaction',
                        srcEntityId
                    );
                    if (mappedTx) {
                        if (!isResumeRun) {
                            transactionSummary.success += 1;
                        }
                        return;
                    }

                    const srcMintRequestId = transaction.mintRequestId || undefined;

                    if (!srcMintRequestId) {
                        throw new Error('Source mintRequestId not found for mintTransaction');
                    }

                    // target mintRequestId from local map or global mapping cache
                    let dstMintRequestId = mintRequestsMapping.get(srcMintRequestId);
                    if (!dstMintRequestId) {
                        const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                        dstMintRequestId = PolicyDataMigrator.getMessageMapping(
                            scopeKey,
                            'mintRequest',
                            srcMintRequestId
                        );
                    }

                    if (!dstMintRequestId) {
                        throw new Error('MintRequest mapping not found for mintTransaction');
                    }

                    const txToSave = { ...(transaction as any) } as MintTransaction;
                    txToSave.mintRequestId = dstMintRequestId;
                    PolicyDataMigrator.clearEntityIdentity(txToSave);

                    await this._db.saveMintTransaction(txToSave);

                    PolicyDataMigrator.appendMappingToBuffer(txMappingBuffer, {
                        startedBy: run.startedBy,
                        srcPolicyId: run.srcPolicyId,
                        dstPolicyId: run.dstPolicyId,
                        entityType: 'mintTransaction',
                        srcEntityId,
                        srcMessageId: srcEntityId,
                        dstMessageId: srcEntityId
                    });

                    transactionSummary.success += 1;
                } catch (error) {
                    transactionSummary.failed += 1;
                    errors.push({
                        id: srcEntityId || transaction?.id || (transaction as any)?._id,
                        message: error?.toString(),
                    });
                    await saveFailedItem('mintTransaction', srcEntityId, error);
                }
            });

            await Promise.all(tasks);

            const flushed = await this.flushMappingsToDb(txMappingBuffer);

            const lastTransaction = writeBatch[writeBatch.length - 1];
            const lastTransactionCursor = getTransactionSourceId(lastTransaction);

            await this.saveRunProgressAfterWriteBatch(
                run,
                summary,
                'mintTransaction',
                lastTransactionCursor
            );

            reportMintTransactionProgress();

            PolicyDataMigrator.applyFlushedMappingsToMemory(flushed);
        }
    }

    /**
     * Migrate VC document
     * @param doc VC
     * @param vcs VCs
     * @param roles Roles
     * @param tokens
     * @param userId
     * @param run
     * @param recursionState
     * @returns VC
     */
    private async _migrateVcDocument(
        doc: VcDocument,
        vcs: VcDocument[],
        roles: PolicyRoles[],
        tokens: Token[],
        userId: string | null,
        run: MigrationRun,
        recursionState?: {
            inProgress: Set<string>;
            done: Map<string, string>;
        }
    ) {
        if (!doc) {
            return doc;
        }

        const state = recursionState || {
            inProgress: new Set<string>(),
            done: new Map<string, string>(),
        };

        const srcMapKey = PolicyDataMigrator.getSourceMapKey('vcDocument', doc);
        const recursionKey = String(srcMapKey || doc?.messageId || (doc as any)?.id || '');

        if (recursionKey && state.done.has(recursionKey)) {
            const doneMessageId = state.done.get(recursionKey);
            if (doneMessageId) {
                doc.messageId = doneMessageId;
            }
            return doc;
        }

        if (recursionKey && state.inProgress.has(recursionKey)) {
            return null;
        }

        if (recursionKey) {
            state.inProgress.add(recursionKey);
        }

        try {

            if (srcMapKey) {
                const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                const mappedMessageId = PolicyDataMigrator.getMessageMapping(
                    scopeKey,
                    'vcDocument',
                    srcMapKey
                );
                if (mappedMessageId) {
                    doc.messageId = mappedMessageId;
                    if (recursionKey) {
                        state.done.set(recursionKey, mappedMessageId);
                    }
                    return doc;
                }
            }

            if (doc.messageId && this.vcMessageIds.has(doc.messageId)) {
                return doc;
            }

            if (doc.messageId) {
                this.vcMessageIds.set(doc.messageId, doc);
            }

            doc.relationships = doc.relationships || [];
            const sourceOwnerDid = doc.owner;
            const destinationOwnerDidForRelationships = await this._replaceDidTopicId(sourceOwnerDid);
            const sourceGroupRoleForRelationships = doc.group
                ? roles.find((item) => item.uuid === doc.group && item.did === sourceOwnerDid)
                : undefined;
            const sourceAssignedRoleForRelationships = doc.assignedToGroup
                ? roles.find((item) => item.uuid === doc.assignedToGroup && item.did === sourceOwnerDid)
                : undefined;
            const sourceRoleRelationshipIds = new Set<string>();
            const sourceRoleRelationshipFallback = new Map<string, string>();
            const destinationGroupsForRelationships = await this._db.getGroupsByUser(
                this._policyId,
                destinationOwnerDidForRelationships
            );
            if (sourceGroupRoleForRelationships?.messageId) {
                const sourceRoleMessageId = String(sourceGroupRoleForRelationships.messageId);
                sourceRoleRelationshipIds.add(sourceRoleMessageId);
                const destinationGroupRole = destinationGroupsForRelationships.find(
                    (item) =>
                        item?.groupName === this._groups[sourceGroupRoleForRelationships?.groupName] ||
                        item.role === this._roles[sourceGroupRoleForRelationships?.role]
                );
                if (destinationGroupRole?.messageId) {
                    sourceRoleRelationshipFallback.set(
                        sourceRoleMessageId,
                        String(destinationGroupRole.messageId)
                    );
                }
            }
            if (sourceAssignedRoleForRelationships?.messageId) {
                const sourceRoleMessageId = String(sourceAssignedRoleForRelationships.messageId);
                sourceRoleRelationshipIds.add(sourceRoleMessageId);
                const destinationGroupRole = destinationGroupsForRelationships.find(
                    (item) =>
                        item?.groupName === this._groups[sourceAssignedRoleForRelationships?.groupName] ||
                        item.role === this._roles[sourceAssignedRoleForRelationships?.role]
                );
                if (destinationGroupRole?.messageId) {
                    sourceRoleRelationshipFallback.set(
                        sourceRoleMessageId,
                        String(destinationGroupRole.messageId)
                    );
                }
            }
            for (let i = 0; i < doc.relationships.length; i++) {
                const relationship = doc.relationships[i];
                const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                const mappedRelationship = PolicyDataMigrator.getMessageMapping(
                    scopeKey,
                    'vcDocument',
                    relationship
                ) || PolicyDataMigrator.getMessageMapping(
                    scopeKey,
                    'roleVcDocument',
                    relationship
                );
                if (mappedRelationship) {
                    doc.relationships[i] = mappedRelationship;
                    continue;
                }

                const sourceRelated = vcs.find((item) => item.messageId === relationship);
                if (!sourceRelated) {
                    const relationshipAsString = String(relationship);
                    if (sourceRoleRelationshipIds.has(relationshipAsString)) {
                        const mappedRoleRelationship = PolicyDataMigrator.getMessageMapping(
                            scopeKey,
                            'roleVcDocument',
                            relationshipAsString
                        ) || PolicyDataMigrator.getMessageMapping(
                            scopeKey,
                            'vcDocument',
                            relationshipAsString
                        );
                        if (mappedRoleRelationship) {
                            doc.relationships[i] = mappedRoleRelationship;
                        } else {
                            const fallbackRoleRelationship = sourceRoleRelationshipFallback.get(relationshipAsString);
                            if (fallbackRoleRelationship) {
                                doc.relationships[i] = fallbackRoleRelationship;
                            } else {
                                doc.relationships.splice(i, 1);
                                i--;
                            }
                        }
                        continue;
                    }
                    doc.relationships.splice(i, 1);
                    i--;
                    continue;
                }

                try {
                    const republishedDocument = await this._migrateVcDocument(
                        sourceRelated,
                        vcs,
                        roles,
                        tokens,
                        userId,
                        run,
                        state
                    );

                    if (!republishedDocument?.messageId) {
                        doc.relationships.splice(i, 1);
                        i--;
                        continue;
                    }

                    doc.relationships[i] = republishedDocument.messageId;

                    const relatedSrcMapKey = PolicyDataMigrator.getSourceMapKey('vcDocument', sourceRelated);
                    if (relatedSrcMapKey) {
                        PolicyDataMigrator.setMessageMapping(
                            scopeKey,
                            'vcDocument',
                            relatedSrcMapKey,
                            String(republishedDocument.messageId)
                        );
                    }
                } catch (error) {
                    doc.relationships.splice(i, 1);
                    i--;
                }
            }

            const oldDocOwner = doc.owner;
            doc.owner = destinationOwnerDidForRelationships;
            doc.assignedTo = await this._replaceDidTopicId(doc.assignedTo);

            let role: any;
            let sourceGroupRole: PolicyRoles | undefined;
            let roleForMessageUser: any;
            if (doc.group) {
                sourceGroupRole = roles.find(
                    (item) => item.uuid === doc.group && item.did === oldDocOwner
                );
                const groups = await this._db.getGroupsByUser(
                    this._policyId,
                    doc.owner
                );
                role = groups.find(
                    (item) =>
                        item?.groupName === this._groups[sourceGroupRole?.groupName] ||
                        item.role === this._roles[sourceGroupRole?.role]
                );
                roleForMessageUser = role;
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
                    (item) => item?.groupName === this._groups[srcGroup?.groupName]
                );
                doc.assignedToGroup = role?.uuid;
            }

            let vc: VcDocumentDefinition;

            const destinationSchemaIri = this._schemas?.[doc.schema] || doc.schema;
            const schema = await DatabaseServer.getSchema({
                topicId: this._policyTopicId,
                iri: destinationSchemaIri,
            });
            if (!schema) {
                throw new Error(
                    `Schema not found: srcSchema=${doc.schema}, dstSchema=${destinationSchemaIri}, docId=${doc?.id}`
                );
            }

            if (
                this._editedVCs[doc.id] ||
                doc.schema !== schema.iri ||
                this._policyTopicId !== this._oldPolicyTopicId
            ) {
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
                const vcMessage = new VCMessage(MessageAction.MigrateVC);
                vcMessage.setDocument(vc);
                vcMessage.setDocumentStatus(
                    doc.option?.status || DocumentStatus.NEW
                );
                vcMessage.setRelationships([...doc.relationships, doc.messageId]);
                vcMessage.setTag(doc);
                vcMessage.setEntityType(doc);
                vcMessage.setOption(doc);
                if (roleForMessageUser && schema.category === SchemaCategory.POLICY) {
                    const sourceRoleMessageId = sourceGroupRole?.messageId
                        ? String(sourceGroupRole.messageId)
                        : undefined;
                    const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);
                    let resolvedRoleMessageId = roleForMessageUser?.messageId
                        ? String(roleForMessageUser.messageId)
                        : undefined;
                    let mappedRoleMessageId: string | undefined;
                    if (sourceRoleMessageId) {
                        mappedRoleMessageId = PolicyDataMigrator.getMessageMapping(
                            scopeKey,
                            'roleVcDocument',
                            sourceRoleMessageId
                        ) || PolicyDataMigrator.getMessageMapping(
                            scopeKey,
                            'vcDocument',
                            sourceRoleMessageId
                        );
                    }
                    if (mappedRoleMessageId) {
                        resolvedRoleMessageId = mappedRoleMessageId;
                    }
                    if (resolvedRoleMessageId) {
                        vcMessage.setUser(resolvedRoleMessageId);
                    }
                }

                const vcMessageResult = await this._ms
                    .setTopicObject(this._policyInstanceTopic)
                    .sendMessage(vcMessage, {
                        sendToIPFS: true,
                        memo: null,
                        userId,
                        interception: null
                    });

                const destinationMessageId = vcMessageResult.getId();
                doc.messageId = destinationMessageId;
                doc.topicId = vcMessageResult.getTopicId();
                doc.messageHash = vcMessageResult.toHash();
                this.vcMessageIds.set(destinationMessageId, doc);

                if (srcMapKey) {
                    const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                    PolicyDataMigrator.setMessageMapping(
                        scopeKey,
                        'vcDocument',
                        srcMapKey,
                        destinationMessageId
                    );
                }
            }

            this.vcIds.set(doc.id, doc);

            if (doc.tokens) {
                doc.tokens = await this.migrateTokenTemplates(tokens, doc.tokens, userId);
            }

            if (recursionKey && doc?.messageId) {
                state.done.set(recursionKey, String(doc.messageId));
            }

            return doc;
        } finally {
            if (recursionKey) {
                state.inProgress.delete(recursionKey);
            }
        }
    }

    private static isHeartbeatStaleForRun(run: Partial<MigrationRun>): boolean {
        if (run.status !== MigrationRunStatus.RUNNING) {
            return false;
        }

        if (!run.heartbeatAt) {
            return true;
        }

        const heartbeatAtTime = new Date(run.heartbeatAt).getTime();
        if (!Number.isFinite(heartbeatAtTime)) {
            return true;
        }

        return (
            Date.now() - heartbeatAtTime >
            PolicyDataMigrator.migrationHeartbeatRunStaleTimeout
        );
    }

    public static mapRunToResponse(run: MigrationRun) {
        const isHeartbeatStale = PolicyDataMigrator.isHeartbeatStaleForRun(run);
        const summary = run?.summary
            ? JSON.parse(JSON.stringify(run.summary))
            : {};
        if (summary && typeof summary === 'object' && (summary as any).total) {
            delete (summary as any).total;
        }

        const effectiveStatus =
            run.status === MigrationRunStatus.RUNNING && isHeartbeatStale
                ? MigrationRunStatus.STOPPED
                : run.status;

        return {
            runId: run.id,
            srcPolicyId: run.srcPolicyId,
            dstPolicyId: run.dstPolicyId,
            status: effectiveStatus,
            startedAt: run.startedAt || null,
            finishedAt: run.finishedAt || null,
            summary
        };
    }

    /**
     * Request stop for migration run
     * Current readBatch will finish, next readBatch will not start.
     */
    public static async requestStopMigrationByRunId(runId: string): Promise<void> {
        if (!runId) {
            throw new Error('runId is required');
        }

        const db = new DatabaseServer();
        const run = await db.findOne(MigrationRun, { id: runId } as Partial<MigrationRun>);

        if (!run) {
            throw new Error('Migration run not found');
        }

        if (run.status !== MigrationRunStatus.RUNNING) {
            return;
        }

        run.stopRequested = true;
        run.heartbeatAt = new Date();
        await db.save(MigrationRun, run);
    }

    private static getOrCreateRunCache(scopeKey: string): Map<string, Map<string, string>> {
        let runCache = PolicyDataMigrator.migrationMessageCache.get(scopeKey);
        if (!runCache) {
            runCache = new Map<string, Map<string, string>>();
            PolicyDataMigrator.migrationMessageCache.set(scopeKey, runCache);
        }
        return runCache;
    }

    private static getOrCreateEntityCache(
        scopeKey: string,
        entityType: string
    ): Map<string, string> {
        const runCache = PolicyDataMigrator.getOrCreateRunCache(scopeKey);
        let entityCache = runCache.get(entityType);
        if (!entityCache) {
            entityCache = new Map<string, string>();
            runCache.set(entityType, entityCache);
        }
        return entityCache;
    }

    private static clearRunCache(scopeKey: string): void {
        PolicyDataMigrator.migrationMessageCache.delete(scopeKey);
    }

    private static async loadRunMessageCacheFromDb(
        db: DatabaseServer,
        run: MigrationRun,
    ): Promise<void> {
        const scopeKey = `${run.srcPolicyId}:${run.dstPolicyId}:${run.startedBy || ''}`;

        const mappings = await db.find(MigrationMessageMap, {
            srcPolicyId: run.srcPolicyId,
            dstPolicyId: run.dstPolicyId,
            startedBy: run.startedBy
        } as Partial<MigrationMessageMap>);

        const runCache = new Map<string, Map<string, string>>();

        for (const mapping of (mappings || [])) {
            const entityType = mapping?.entityType;
            const srcMessageId = mapping?.srcMessageId;
            const dstMessageId = mapping?.dstMessageId;

            if (!entityType || !srcMessageId || !dstMessageId) {
                continue;
            }

            let entityCache = runCache.get(entityType);
            if (!entityCache) {
                entityCache = new Map<string, string>();
                runCache.set(entityType, entityCache);
            }

            entityCache.set(srcMessageId, dstMessageId);
        }

        PolicyDataMigrator.migrationMessageCache.set(scopeKey, runCache);
    }

    private static setMessageMapping(
        scopeKey: string,
        entityType: string,
        srcMessageId: string,
        dstMessageId: string
    ): void {
        const entityCache = PolicyDataMigrator.getOrCreateEntityCache(scopeKey, entityType);
        entityCache.set(srcMessageId, dstMessageId);
    }

    private static getMessageMapping(
        scopeKey: string,
        entityType: string,
        srcMessageId: string
    ): string | undefined {
        const runCache = PolicyDataMigrator.migrationMessageCache.get(scopeKey);
        if (!runCache) {
            return;
        }
        const entityCache = runCache.get(entityType);
        if (!entityCache) {
            return;
        }
        return entityCache.get(srcMessageId);
    }

    private static extractSourceKeys(
        entityType: string,
        item: any
    ): { srcEntityId?: string; srcMessageId?: string } {
        let srcEntityId: string | undefined;
        if (item?.id) {
            srcEntityId = item.id;
        } else if (item?._id) {
            srcEntityId = item._id;
        } else if (item?.did) {
            srcEntityId = item.did;
        } else if (item?.blockId) {
            srcEntityId = item.blockId;
        }

        let srcMessageId: string | undefined;
        if (
            entityType === 'vcDocument' ||
            entityType === 'roleVcDocument' ||
            entityType === 'vpDocument'
        ) {
            if (item?.messageId) {
                srcMessageId = item.messageId;
            }
        }

        return { srcEntityId, srcMessageId };
    }

    private static getSourceMapKey(entityType: string, item: any): string | undefined {
        const keys = PolicyDataMigrator.extractSourceKeys(entityType, item);
        const srcMessageId = keys?.srcMessageId ? String(keys.srcMessageId) : undefined;
        const srcEntityId = keys?.srcEntityId ? String(keys.srcEntityId) : undefined;

        if (srcMessageId) {
            return srcMessageId;
        }

        if (srcEntityId) {
            return srcEntityId;
        }

        return;
    }

    private static clearEntityIdentity(entity: any): void {
        delete entity.id;
        delete entity._id;
    }

    private static clearEntityMeta(entity: any): void {
        PolicyDataMigrator.clearEntityIdentity(entity);
        delete entity.createDate;
        delete entity.updateDate;
    }

    private static appendMappingToBuffer(
        buffer: Partial<MigrationMessageMap>[],
        mapping: Partial<MigrationMessageMap>
    ): void {
        if (
            !mapping?.srcPolicyId ||
            !mapping?.dstPolicyId ||
            !mapping?.entityType ||
            !mapping?.srcMessageId ||
            !mapping?.dstMessageId
        ) {
            return;
        }

        const mappingKey =
            `${mapping.srcPolicyId}:${mapping.dstPolicyId}:${mapping.startedBy || ''}:${mapping.entityType}:${mapping.srcMessageId}`;

        const existingIndex = buffer.findIndex((item) => {
            const itemKey =
                `${item.srcPolicyId}:${item.dstPolicyId}:${item.startedBy || ''}:${item.entityType}:${item.srcMessageId}`;
            return itemKey === mappingKey;
        });

        if (existingIndex >= 0) {
            buffer[existingIndex] = mapping;
            return;
        }

        buffer.push(mapping);
    }

    private async flushMappingsToDb(
        buffer: Partial<MigrationMessageMap>[]
    ): Promise<Partial<MigrationMessageMap>[]> {
        if (!buffer.length) {
            return [];
        }

        const flushed: Partial<MigrationMessageMap>[] = [];

        for (const item of buffer) {
            if (
                !item?.srcPolicyId ||
                !item?.dstPolicyId ||
                !item?.entityType ||
                !item?.srcMessageId ||
                !item?.dstMessageId
            ) {
                continue;
            }

            const existing = await this._db.findOne(MigrationMessageMap, {
                srcPolicyId: item.srcPolicyId,
                dstPolicyId: item.dstPolicyId,
                startedBy: item.startedBy,
                entityType: item.entityType,
                srcMessageId: item.srcMessageId
            } as Partial<MigrationMessageMap>);

            if (existing) {
                existing.dstMessageId = item.dstMessageId;
                existing.srcEntityId = item.srcEntityId;
                await this._db.save(MigrationMessageMap, existing);
            } else {
                await this._db.save(MigrationMessageMap, item);
            }

            flushed.push(item);
        }

        buffer.length = 0;
        return flushed;
    }

    private static applyFlushedMappingsToMemory(
        mappings: Partial<MigrationMessageMap>[]
    ): void {
        for (const item of mappings) {
            if (
                !item?.srcPolicyId ||
                !item?.dstPolicyId ||
                !item?.entityType ||
                !item?.srcMessageId ||
                !item?.dstMessageId
            ) {
                continue;
            }

            const scopeKey =
                `${item.srcPolicyId}:${item.dstPolicyId}:${item.startedBy || ''}`;

            let scopeCache = PolicyDataMigrator.migrationMessageCache.get(scopeKey);
            if (!scopeCache) {
                scopeCache = new Map<string, Map<string, string>>();
                PolicyDataMigrator.migrationMessageCache.set(scopeKey, scopeCache);
            }

            let entityCache = scopeCache.get(item.entityType);
            if (!entityCache) {
                entityCache = new Map<string, string>();
                scopeCache.set(item.entityType, entityCache);
            }

            entityCache.set(item.srcMessageId, item.dstMessageId);
        }
    }

    private async saveRunProgressAfterWriteBatch(
        run: MigrationRun,
        summary: MigrationRunSummary,
        entityType: string,
        cursorLastId?: string
    ): Promise<void> {
        if (cursorLastId) {
            const entitySummary = summary?.[entityType];
            if (entitySummary) {
                entitySummary.cursorLastId = cursorLastId;
            }
        }

        run.summary = summary;
        run.heartbeatAt = new Date();
        await this._db.save(MigrationRun, run);
    }

    private static resolveStartIndexByCursor<T>(
        items: T[],
        cursorLastId: string | undefined,
        getId: (item: T) => string | undefined
    ): number {
        if (!cursorLastId) {
            return 0;
        }

        const index = items.findIndex((item) => {
            const id = getId(item);
            if (!id) {
                return false;
            }
            return id === cursorLastId;
        });

        if (index < 0) {
            return 0;
        }

        return index + 1;
    }

    /**
     * Retry failed migration items for existing run
     * Loads only source records listed in MigrationFailedItem for this run.
     */
    public static async retryFailedItems(
        owner: string,
        run: MigrationRun,
        userId: string | null,
        notifier: INotificationStep,
        writeBatchSize: number = PolicyDataMigrator.migrationWriteBatchSize,
        ): Promise<DocumentError[]> {

        const migrationConfig = run.config as MigrationConfig;
        if (!migrationConfig?.policies?.src || !migrationConfig?.policies?.dst) {
            throw new Error('Migration run config is invalid');
        }

        const vcIds = new Set<string>();
        const roleVcIds = new Set<string>();
        const vpIds = new Set<string>();
        const roleIds = new Set<string>();
        const stateIds = new Set<string>();
        const mintRequestIds = new Set<string>();
        const mintTransactionIds = new Set<string>();
        const multiDocumentIds = new Set<string>();
        const aggregateVcIds = new Set<string>();
        const splitDocumentIds = new Set<string>();
        const documentStateIds = new Set<string>();
        const tokenIds = new Set<string>();
        const retirePoolIds = new Set<string>();

        const { src, dst } = migrationConfig.policies;
        const users = new Users();
        const userTopic = await DatabaseServer.getTopicByType(
            owner,
            TopicType.UserTopic
        );

        const srcModel = await DatabaseServer.getPolicy({
            id: src,
            owner,
        });
        if (!srcModel) {
            throw new Error(`Can't find source policy`);
        }
        const srcModelDryRun = PolicyHelper.isDryRunMode(srcModel);
        const srcDb = new DatabaseServer(srcModelDryRun ? srcModel.id : undefined);

        const dstModel = await DatabaseServer.getPolicy({
            id: dst,
            owner,
        });
        if (!dstModel) {
            throw new Error(`Can't find destination policy`);
        }
        const dstModelDryRun = PolicyHelper.isDryRunMode(dstModel);

        const retryDb = new DatabaseServer(dstModelDryRun ? dstModel.id : undefined);
        const failedItems = await retryDb.find(
            MigrationFailedItem,
            { runId: run.id } as Partial<MigrationFailedItem>,
            { orderBy: { createDate: 'ASC' as const } }
        );

        if (!failedItems || failedItems.length === 0) {
            return [];
        }

        for (const failedItem of failedItems) {
            const entityType = failedItem.entityType;
            const srcEntityId = failedItem.srcEntityId;

            if (entityType === 'vcDocument') {
                vcIds.add(srcEntityId);
            } else if (entityType === 'roleVcDocument') {
                roleVcIds.add(srcEntityId);
            } else if (entityType === 'vpDocument') {
                vpIds.add(srcEntityId);
            } else if (entityType === 'policyRole') {
                roleIds.add(srcEntityId);
            } else if (entityType === 'policyState') {
                stateIds.add(srcEntityId);
            } else if (entityType === 'mintRequest') {
                mintRequestIds.add(srcEntityId);
            } else if (entityType === 'mintTransaction') {
                mintTransactionIds.add(srcEntityId);
            } else if (entityType === 'multiDocument') {
                multiDocumentIds.add(srcEntityId);
            } else if (entityType === 'aggregateVc') {
                aggregateVcIds.add(srcEntityId);
            } else if (entityType === 'splitDocument') {
                splitDocumentIds.add(srcEntityId);
            } else if (entityType === 'documentState') {
                documentStateIds.add(srcEntityId);
            } else if (entityType === 'token') {
                tokenIds.add(srcEntityId);
            } else if (entityType === 'retirePool') {
                retirePoolIds.add(srcEntityId);
            }
        }

        const srcSystemSchemas = await DatabaseServer.getSchemas({
            category: SchemaCategory.SYSTEM,
            topicId: srcModel.topicId,
        });
        const dstSystemSchemas = await DatabaseServer.getSchemas({
            category: SchemaCategory.SYSTEM,
            topicId: dstModel.topicId,
        });

        const schemas = migrationConfig.schemas || {};
        for (const schema of srcSystemSchemas) {
            const dstSchema = dstSystemSchemas.find(
                (item) => item.entity === schema.entity
            );
            if (dstSchema) {
                schemas[schema.iri] = dstSchema.iri;
            }
        }

        const loadByIds = async <T extends BaseEntity>(
            entity: new () => T,
            ids: Set<string>
        ): Promise<T[]> => {
            if (!ids.size) {
                return [];
            }
            const entityClass: new () => BaseEntity = entity;
            const result = await srcDb.find(
                entityClass,
                { id: { $in: Array.from(ids) } } as any
            );
            return result as T[];
        };

        const filterBySourceIds = <T>(entityType: string, list: T[], ids: Set<string>): T[] => {
            if (!ids.size) {
                return [];
            }
            return list.filter((item) => {
                const keys = PolicyDataMigrator.extractSourceKeys(entityType, item as any);
                return !!keys.srcEntityId && ids.has(keys.srcEntityId);
            });
        };

        const vcs = await loadByIds(VcDocument, vcIds);
        const roleVcs = await loadByIds(VcDocument, roleVcIds);
        const vps = await loadByIds(VpDocument, vpIds);
        const mintRequests = await loadByIds(MintRequest, mintRequestIds);
        const mintTransactions = await loadByIds(MintTransaction, mintTransactionIds);
        const multiSignDocuments = await loadByIds(MultiDocuments, multiDocumentIds);
        const aggregateVCs = await loadByIds(AggregateVC, aggregateVcIds);
        const splitDocuments = await loadByIds(SplitDocuments, splitDocumentIds);
        const documentStates = await loadByIds(DocumentState, documentStateIds);
        const dynamicTokens = await loadByIds(Token, tokenIds);
        const retirePools = await loadByIds(RetirePool, retirePoolIds);

        const allRoles = roleIds.size
            ? await new RolesLoader(
                srcModel.id,
                srcModel.topicId,
                srcModel.instanceTopicId,
                srcModelDryRun
            ).get()
            : [];
        const roles = filterBySourceIds('policyRole', allRoles, roleIds);

        const allStates = stateIds.size
            ? await new BlockStateLoader(
                srcModel.id,
                srcModel.topicId,
                srcModel.instanceTopicId,
                srcModelDryRun
            ).get()
            : [];
        const states = filterBySourceIds('policyState', allStates, stateIds);

        const srcDids = await new DidLoader(
            srcModel.id,
            srcModel.topicId,
            srcModel.instanceTopicId,
            srcModelDryRun
        ).get();

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
            userTopic.topicId,
            userTopic,
            migrationConfig.roles || {},
            migrationConfig.groups || {},
            schemas,
            migrationConfig.blocks || {},
            migrationConfig.tokens || {},
            migrationConfig.tokensMap || {},
            migrationConfig.editedVCs || {},
            srcDids,
            dstModelDryRun ? dstModel.id : null,
            notifier,
        );

        return await policyDataMigrator._retryFailedItems({
            run,
            userId,
            retireContractId: migrationConfig.retireContractId,
            vcs,
            vps,
            roleVcs,
            roles,
            states,
            mintRequests,
            mintTransactions,
            multiSignDocuments,
            aggregateVCs,
            splitDocuments,
            documentStates,
            dynamicTokens,
            retirePools,
            writeBatchSize
        });
    }

    /**
     * Retry only failed items for existing run
     */
    public async _retryFailedItems(params: {
        run: MigrationRun;
        userId: string | null;
        retireContractId?: string;
        vcs: VcDocument[];
        vps: VpDocument[];
        roleVcs: VcDocument[];
        roles: PolicyRoles[];
        states: BlockState[];
        mintRequests: MintRequest[];
        mintTransactions: MintTransaction[];
        multiSignDocuments: MultiDocuments[];
        aggregateVCs: AggregateVC[];
        splitDocuments: SplitDocuments[];
        documentStates: DocumentState[];
        dynamicTokens: Token[];
        retirePools: RetirePool[];
        writeBatchSize?: number;
    }): Promise<DocumentError[]> {
        const {
            run,
            userId,
            retireContractId,
            vcs,
            vps,
            roleVcs,
            roles,
            states,
            mintRequests,
            mintTransactions,
            multiSignDocuments,
            aggregateVCs,
            splitDocuments,
            documentStates,
            dynamicTokens,
            retirePools,
        } = params;

        const writeBatchSize = params.writeBatchSize || PolicyDataMigrator.migrationWriteBatchSize;
        const summary = run.summary as MigrationRunSummary;
        const errors: DocumentError[] = [];

        const getSummaryItem = (entityType: string) => {
            const item = summary?.[entityType];
            if (!item) {
                throw new Error(`Summary item not found for entityType: ${entityType}`);
            }
            return item;
        };

        const resolveFailedSource = <T>(entityType: string, list: T[], srcEntityId: string): T | undefined => {
            return list.find((item) => {
                const keys = PolicyDataMigrator.extractSourceKeys(entityType, item as any);
                return keys.srcEntityId === srcEntityId;
            });
        };

        const updateFailedItemError = async (failed: MigrationFailedItem, error: any) => {
            failed.attemptCount = Number(failed.attemptCount || 0) + 1;
            failed.errorMessage = error?.toString();
            failed.lastFailedAt = new Date();
            await this._db.save(MigrationFailedItem, failed);
        };

        const flushMappingsAndRun = async (buffer: Partial<MigrationMessageMap>[]) => {
            const flushed = await this.flushMappingsToDb(buffer);
            run.summary = summary;
            run.heartbeatAt = new Date();
            await this._db.save(MigrationRun, run);
            PolicyDataMigrator.applyFlushedMappingsToMemory(flushed);
        };

        const pendingMappings: Partial<MigrationMessageMap>[] = [];

        await PolicyDataMigrator.loadRunMessageCacheFromDb(this._db, run);

        run.status = MigrationRunStatus.RUNNING;
        run.stopRequested = false;
        run.finishedAt = undefined;
        run.error = undefined;
        run.heartbeatAt = new Date();
        await this._db.save(MigrationRun, run);

        try {
            const failedItems = await this._db.find(
                MigrationFailedItem,
                { runId: run.id } as Partial<MigrationFailedItem>,
                { orderBy: { createDate: 'ASC' as const } }
            );

            const localMintRequestMap = new Map<string, string>();

            for (let offset = 0; offset < failedItems.length; offset += writeBatchSize) {
                const latestRun = await this._db.findOne(MigrationRun, { id: run.id } as Partial<MigrationRun>);
                if (latestRun?.stopRequested) {
                    run.stopRequested = true;
                    run.status = MigrationRunStatus.STOPPED;
                    run.finishedAt = new Date();
                    run.heartbeatAt = new Date();

                    await flushMappingsAndRun(pendingMappings);
                    await this._db.save(MigrationRun, run);
                    return errors;
                }

                const writeBatch = failedItems.slice(offset, offset + writeBatchSize);
                const successItems: MigrationFailedItem[] = [];

                const tasks = writeBatch.map(async (failedItem) => {
                    const entityType = failedItem.entityType;
                    const srcEntityId = failedItem.srcEntityId;
                    const entitySummary = getSummaryItem(entityType);
                    const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                    try {
                        const preMappedByEntityId = PolicyDataMigrator.getMessageMapping(
                            scopeKey,
                            entityType,
                            srcEntityId
                        );

                        if (preMappedByEntityId) {
                            entitySummary.success += 1;
                            successItems.push(failedItem);

                            if (entityType === 'mintRequest') {
                                localMintRequestMap.set(srcEntityId, preMappedByEntityId);
                            }

                            return;
                        }

                        if (entityType === 'vcDocument') {
                            const src = resolveFailedSource('vcDocument', vcs, srcEntityId);
                            if (!src) {
                                throw new Error('Source vcDocument not found');
                            }

                            const sourceKeys = PolicyDataMigrator.extractSourceKeys(entityType, src);
                            const srcMapKey = sourceKeys.srcMessageId || sourceKeys.srcEntityId || srcEntityId;
                            const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);
                            const mappedByMessage = srcMapKey
                                ? PolicyDataMigrator.getMessageMapping(scopeKey, entityType, srcMapKey)
                                : undefined;

                            if (mappedByMessage) {
                                entitySummary.success += 1;
                                successItems.push(failedItem);
                                return;
                            }

                            const migrated = await this._migrateVcDocument(
                                src,
                                vcs,
                                roles,
                                dynamicTokens,
                                userId,
                                run
                            );

                            PolicyDataMigrator.clearEntityMeta(migrated);

                            await this._db.saveVC(migrated);

                            const destinationKeys = PolicyDataMigrator.extractSourceKeys(entityType, migrated);
                            const dstMapKey = destinationKeys.srcMessageId || destinationKeys.srcEntityId || srcMapKey;

                            if (sourceKeys.srcEntityId && srcMapKey && dstMapKey) {
                                PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                                    startedBy: run.startedBy,
                                    srcPolicyId: run.srcPolicyId,
                                    dstPolicyId: run.dstPolicyId,
                                    entityType,
                                    srcEntityId: sourceKeys.srcEntityId,
                                    srcMessageId: srcMapKey,
                                    dstMessageId: dstMapKey
                                });
                            }
                        } else if (entityType === 'roleVcDocument') {
                            const src = resolveFailedSource('roleVcDocument', roleVcs, srcEntityId);
                            if (!src) {
                                throw new Error('Source roleVcDocument not found');
                            }

                            const sourceKeys = PolicyDataMigrator.extractSourceKeys(entityType, src);
                            const srcMapKey = sourceKeys.srcMessageId || sourceKeys.srcEntityId || srcEntityId;
                            const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);
                            const mappedByMessage = srcMapKey
                                ? PolicyDataMigrator.getMessageMapping(scopeKey, entityType, srcMapKey)
                                : undefined;

                            if (mappedByMessage) {
                                entitySummary.success += 1;
                                successItems.push(failedItem);
                                return;
                            }

                            const migrated = await this._migrateRoleVc(src, userId, run, roles);

                            PolicyDataMigrator.clearEntityMeta(migrated);

                            await this._db.saveVC(migrated);

                            const destinationKeys = PolicyDataMigrator.extractSourceKeys(entityType, migrated);
                            const dstMapKey = destinationKeys.srcMessageId || destinationKeys.srcEntityId || srcMapKey;

                            if (sourceKeys.srcEntityId && srcMapKey && dstMapKey) {
                                PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                                    startedBy: run.startedBy,
                                    srcPolicyId: run.srcPolicyId,
                                    dstPolicyId: run.dstPolicyId,
                                    entityType,
                                    srcEntityId: sourceKeys.srcEntityId,
                                    srcMessageId: srcMapKey,
                                    dstMessageId: dstMapKey
                                });
                            }
                        } else if (entityType === 'vpDocument') {
                            const src = resolveFailedSource('vpDocument', vps, srcEntityId) as (VpDocument & { group: string });
                            if (!src) {
                                throw new Error('Source vpDocument not found');
                            }

                            const sourceKeys = PolicyDataMigrator.extractSourceKeys(entityType, src);
                            const srcMapKey = sourceKeys.srcMessageId || sourceKeys.srcEntityId || srcEntityId;
                            const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);
                            const mappedByMessage = srcMapKey
                                ? PolicyDataMigrator.getMessageMapping(scopeKey, entityType, srcMapKey)
                                : undefined;

                            if (mappedByMessage) {
                                entitySummary.success += 1;
                                successItems.push(failedItem);
                                return;
                            }

                            const migrated = await this._migrateVpDocument(src, userId, run);

                            PolicyDataMigrator.clearEntityMeta(migrated);

                            await this._db.saveVP(migrated);

                            const destinationKeys = PolicyDataMigrator.extractSourceKeys(entityType, migrated);
                            const dstMapKey = destinationKeys.srcMessageId || destinationKeys.srcEntityId || srcMapKey;

                            if (sourceKeys.srcEntityId && srcMapKey && dstMapKey) {
                                PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                                    startedBy: run.startedBy,
                                    srcPolicyId: run.srcPolicyId,
                                    dstPolicyId: run.dstPolicyId,
                                    entityType,
                                    srcEntityId: sourceKeys.srcEntityId,
                                    srcMessageId: srcMapKey,
                                    dstMessageId: dstMapKey
                                });
                            }
                        } else if (entityType === 'multiDocument') {
                            const src = resolveFailedSource('multiDocument', multiSignDocuments, srcEntityId);
                            if (!src) {
                                throw new Error('Source multiDocument not found');
                            }

                            if (
                                !src.document ||
                                (typeof src.document === 'object' && !Object.keys(src.document).length)
                            ) {
                                if (entitySummary.failed > 0) {
                                    entitySummary.failed -= 1;
                                }
                                entitySummary.success += 1;
                                successItems.push(failedItem);
                                await new PinoLogger().warn(`${srcEntityId}: Error: JSON Object is empty`, ['GUARDIAN_SERVICE'], userId);
                                return;
                            }

                            const migrated = await this._migrateMultiSignDocument(src, userId);
                            if (!migrated) {
                                throw new Error('Source multiDocument cannot be migrated');
                            }
                            PolicyDataMigrator.clearEntityIdentity(migrated);
                            await this._db.setMultiSigDocument(
                                (migrated as any).uuid,
                                this._policyId,
                                (migrated as any).documentId,
                                {
                                    id: (migrated as any).userId,
                                    did: (migrated as any).did,
                                    group: (migrated as any).group,
                                    username: (migrated as any).username,
                                },
                                (migrated as any).status || '',
                                (migrated as any).document
                            );

                            PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                                startedBy: run.startedBy,
                                srcPolicyId: run.srcPolicyId,
                                dstPolicyId: run.dstPolicyId,
                                entityType,
                                srcEntityId,
                                srcMessageId: srcEntityId,
                                dstMessageId: srcEntityId
                            });
                        } else if (entityType === 'documentState') {
                            const src = resolveFailedSource('documentState', documentStates, srcEntityId);
                            if (!src) {
                                throw new Error('Source documentState not found');
                            }

                            const migrated = await this._migrateDocumentState(src);
                            PolicyDataMigrator.clearEntityIdentity(migrated);
                            await this._db.saveDocumentState(migrated as any);

                            PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                                startedBy: run.startedBy,
                                srcPolicyId: run.srcPolicyId,
                                dstPolicyId: run.dstPolicyId,
                                entityType,
                                srcEntityId,
                                srcMessageId: srcEntityId,
                                dstMessageId: srcEntityId
                            });
                        } else if (entityType === 'aggregateVc') {
                            const src = resolveFailedSource('aggregateVc', aggregateVCs, srcEntityId);
                            if (!src) {
                                throw new Error('Source aggregateVc not found');
                            }

                            const migrated = await this._migrateAggregateVC(src);
                            PolicyDataMigrator.clearEntityIdentity(migrated);
                            await this._db.createAggregateDocuments(migrated as any, migrated.blockId);

                            PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                                startedBy: run.startedBy,
                                srcPolicyId: run.srcPolicyId,
                                dstPolicyId: run.dstPolicyId,
                                entityType,
                                srcEntityId,
                                srcMessageId: srcEntityId,
                                dstMessageId: srcEntityId
                            });
                        } else if (entityType === 'splitDocument') {
                            const src = resolveFailedSource('splitDocument', splitDocuments, srcEntityId);
                            if (!src) {
                                throw new Error('Source splitDocument not found');
                            }

                            const migrated = await this._migrateSplitDocument(src, userId);
                            PolicyDataMigrator.clearEntityIdentity(migrated);
                            await this._db.setResidue(migrated as any);

                            PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                                startedBy: run.startedBy,
                                srcPolicyId: run.srcPolicyId,
                                dstPolicyId: run.dstPolicyId,
                                entityType,
                                srcEntityId,
                                srcMessageId: srcEntityId,
                                dstMessageId: srcEntityId
                            });
                        } else if (entityType === 'policyState') {
                            const src = resolveFailedSource('policyState', states, srcEntityId);
                            if (!src) {
                                throw new Error('Source policyState not found');
                            }

                            const data = JSON.parse(src.blockState);
                            if (data?.state) {
                                const keys = Object.keys(data);
                                for (const key of keys) {
                                    const newKey = await this._replaceDidTopicId(key);
                                    data[newKey] = data[key];
                                    if (data[newKey] !== data[key]) {
                                        delete data[key];
                                    }
                                }
                            }

                            const destinationBlockId = this._blocks[src.blockId];
                            if (!destinationBlockId) {
                                throw new Error('Destination block mapping not found for policyState');
                            }

                            await this._db.saveBlockState(this._policyId, destinationBlockId, null, data);

                            PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                                startedBy: run.startedBy,
                                srcPolicyId: run.srcPolicyId,
                                dstPolicyId: run.dstPolicyId,
                                entityType,
                                srcEntityId,
                                srcMessageId: srcEntityId,
                                dstMessageId: destinationBlockId
                            });
                        } else if (entityType === 'mintRequest') {
                            const src = resolveFailedSource('mintRequest', mintRequests, srcEntityId);
                            if (!src) {
                                throw new Error('Source mintRequest not found');
                            }

                            const sourceVpMessageId = src.vpMessageId || undefined;
                            const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);
                            const mappedVpMessageId = sourceVpMessageId
                                ? PolicyDataMigrator.getMessageMapping(scopeKey, 'vpDocument', sourceVpMessageId)
                                : undefined;

                            if (!mappedVpMessageId) {
                                throw new Error('VP mapping not found for mintRequest');
                            }

                            const requestToSave = { ...(src as any) } as MintRequest;
                            requestToSave.vpMessageId = mappedVpMessageId;
                            PolicyDataMigrator.clearEntityIdentity(requestToSave);

                            const saved = await this._db.saveMintRequest(requestToSave);
                            localMintRequestMap.set(srcEntityId, saved.id);

                            PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                                startedBy: run.startedBy,
                                srcPolicyId: run.srcPolicyId,
                                dstPolicyId: run.dstPolicyId,
                                entityType,
                                srcEntityId,
                                srcMessageId: srcEntityId,
                                dstMessageId: saved.id
                            });
                        } else if (entityType === 'mintTransaction') {
                            const src = resolveFailedSource('mintTransaction', mintTransactions, srcEntityId);
                            if (!src) {
                                throw new Error('Source mintTransaction not found');
                            }

                            const srcMintRequestId = src.mintRequestId || undefined;
                            if (!srcMintRequestId) {
                                throw new Error('Source mintRequestId not found for mintTransaction');
                            }

                            let dstMintRequestId = localMintRequestMap.get(srcMintRequestId);
                            if (!dstMintRequestId) {
                                const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

                                dstMintRequestId = PolicyDataMigrator.getMessageMapping(
                                    scopeKey,
                                    'mintRequest',
                                    srcMintRequestId
                                );
                            }

                            if (!dstMintRequestId) {
                                throw new Error('MintRequest mapping not found for mintTransaction');
                            }

                            const txToSave = { ...(src as any) } as MintTransaction;
                            txToSave.mintRequestId = dstMintRequestId;
                            PolicyDataMigrator.clearEntityIdentity(txToSave);
                            await this._db.saveMintTransaction(txToSave);

                            PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                                startedBy: run.startedBy,
                                srcPolicyId: run.srcPolicyId,
                                dstPolicyId: run.dstPolicyId,
                                entityType,
                                srcEntityId,
                                srcMessageId: srcEntityId,
                                dstMessageId: srcEntityId
                            });
                        } else if (entityType === 'retirePool') {
                            const src = resolveFailedSource('retirePool', retirePools, srcEntityId);
                            if (!src) {
                                throw new Error('Source retirePool not found');
                            }
                            if (!retireContractId) {
                                throw new Error('retireContractId is required for retirePool retry');
                            }

                            await setPoolContract(
                                new Workers(),
                                retireContractId,
                                this._root.hederaAccountId,
                                this._rootKey,
                                this.replacePoolTokens(src.tokens),
                                src.immediately,
                                userId
                            );

                            PolicyDataMigrator.appendMappingToBuffer(pendingMappings, {
                                startedBy: run.startedBy,
                                srcPolicyId: run.srcPolicyId,
                                dstPolicyId: run.dstPolicyId,
                                entityType,
                                srcEntityId,
                                srcMessageId: srcEntityId,
                                dstMessageId: srcEntityId
                            });
                        } else {
                            throw new Error(`Unsupported failed entityType: ${entityType}`);
                        }

                        if (entitySummary.failed > 0) {
                            entitySummary.failed -= 1;
                        }
                        entitySummary.success += 1;
                        successItems.push(failedItem);
                    } catch (error) {
                        if (
                            entityType === 'multiDocument' &&
                            String(error).includes('JSON Object is empty')
                        ) {
                            if (entitySummary.failed > 0) {
                                entitySummary.failed -= 1;
                            }
                            entitySummary.success += 1;
                            successItems.push(failedItem);
                            await new PinoLogger().warn(`${srcEntityId}: Error: JSON Object is empty`, ['GUARDIAN_SERVICE'], userId);
                            return;
                        }

                        errors.push({
                            id: srcEntityId,
                            message: error?.toString(),
                        });
                        await updateFailedItemError(failedItem, error);
                    }
                });

                await Promise.all(tasks);

                await flushMappingsAndRun(pendingMappings);

                for (const item of successItems) {
                    await this._db.remove(MigrationFailedItem, item);
                }
            }

            await flushMappingsAndRun(pendingMappings);

            if (run.status === MigrationRunStatus.RUNNING) {
                const tokenSummary = summary?.token;
                if (tokenSummary) {
                    const total = Number(tokenSummary.total || 0);
                    const failed = Number(tokenSummary.failed || 0);
                    if (total > 0 && this._processedTokenIds.size > 0) {
                        tokenSummary.success = Math.min(total, this._processedTokenIds.size);
                        tokenSummary.failed = Math.min(total - tokenSummary.success, failed);
                    }
                }
                run.status = MigrationRunStatus.COMPLETED;
                run.finishedAt = new Date();
                run.heartbeatAt = new Date();
                run.summary = summary;
                await this._db.save(MigrationRun, run);
            }

            return errors;
        } catch (error) {
            await flushMappingsAndRun(pendingMappings);

            if (run.status !== MigrationRunStatus.STOPPED) {
                const tokenSummary = summary?.token;
                if (tokenSummary) {
                    const total = Number(tokenSummary.total || 0);
                    const failed = Number(tokenSummary.failed || 0);
                    if (total > 0 && this._processedTokenIds.size > 0) {
                        tokenSummary.success = Math.min(total, this._processedTokenIds.size);
                        tokenSummary.failed = Math.min(total - tokenSummary.success, failed);
                    }
                }
                run.status = MigrationRunStatus.FAILED;
                run.finishedAt = new Date();
                run.heartbeatAt = new Date();
                run.error = error?.toString();
                run.summary = summary;
                await this._db.save(MigrationRun, run);
            }
            throw error;
        } finally {
            const scopeKey = PolicyDataMigrator.getScopeKeyMappingCache(run.srcPolicyId, run.dstPolicyId, run.startedBy);

            PolicyDataMigrator.clearRunCache(scopeKey);
            this._processedTokenIds.clear();
        }
    }

    private static getScopeKeyMappingCache(srcPolicyId: string, dstPolicyId: string, startedBy: string): string {
        return `${srcPolicyId}:${dstPolicyId}:${startedBy || ''}`;
    }

    public static clearRunCacheByPolicyId(policyId: string): void {
        for (const scopeKey of PolicyDataMigrator.migrationMessageCache.keys()) {
            const [srcPolicyId, dstPolicyId] = scopeKey.split(':');
            if (srcPolicyId === policyId || dstPolicyId === policyId) {
                PolicyDataMigrator.migrationMessageCache.delete(scopeKey);
            }
        }
    }

    private createBatchStepProgressReporter(
        step: INotificationStep | null,
        label: string,
        summaryItem?: { total: number; success: number; failed: number }
    ): () => void {
        let lastReportedPercent = 0;
        let progressNode: INotificationStep | null = null;

        return () => {
            if (!step || !summaryItem) {
                return;
            }

            const total = summaryItem.total ?? 0;
            if (total <= 0) {
                return;
            }

            if (!progressNode) {
                progressNode = step.addStep(`${label}`, 1, true);
                progressNode.setEstimate(100);
                progressNode.start();
            }

            const processed = (summaryItem.success ?? 0) + (summaryItem.failed ?? 0);
            const percent = Math.floor((processed * 100) / total);

            if (percent <= lastReportedPercent) {
                return;
            }

            for (let p = lastReportedPercent + 1; p <= percent; p++) {
                const tick = progressNode.addStep(`${label} ${p}%`, 1, true);
                tick.start();
                tick.complete();
            }

            lastReportedPercent = percent;

            if (percent >= 100) {
                progressNode.complete();
            }
        };
    }

    public static isRunActive(run: Partial<MigrationRun>): boolean {
        const normalized = PolicyDataMigrator.mapRunToResponse(run as MigrationRun);
        return normalized.status === MigrationRunStatus.RUNNING;
    }

    public static async assertNoActiveMigrationForUser(owner: IOwner): Promise<void> {
        const startedBy = owner?.id;

        const regularRuns = await new DatabaseServer().find(MigrationRun, {
            startedBy,
            status: MigrationRunStatus.RUNNING
        } as Partial<MigrationRun>);

        const dryRunRaw = await new DataBaseHelper(DryRun).find({
            dryRunClass: 'MigrationRun',
            startedBy,
            status: MigrationRunStatus.RUNNING
        } as any);

        const allRuns = [
            ...(regularRuns || []),
            ...((dryRunRaw as unknown as Partial<MigrationRun>[]) || [])
        ];

        const hasActive = allRuns.some((run) => PolicyDataMigrator.isRunActive(run));
        if (hasActive) {
            throw new Error(
                'Another migration is already running. Please wait until it is finished.'
            );
        }
    }
}
