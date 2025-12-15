import {
    ConfigType,
    EntityStatus,
    GenerateUUIDv4,
    IFormula,
    IOwner,
    IRootConfig,
    PolicyTestStatus,
    PolicyToolMetadata,
    PolicyStatus,
    SchemaCategory,
    TagType,
    TopicType,
    LocationType,
    PolicyAvailability
} from '@guardian/interfaces';
import {
    DatabaseServer,
    PinoLogger,
    MessageAction,
    MessageServer,
    MessageType,
    Policy,
    PolicyMessage,
    PolicyTool,
    RecordImportExport,
    Schema,
    Tag,
    Token,
    Topic,
    TopicConfig,
    TopicHelper,
    Users,
    Formula,
    FormulaImportExport,
    INotificationStep,
    PolicyRecordMessage
} from '@guardian/common';
import { ImportMode } from '../common/import.interface.js';
import { ImportFormulaResult, ImportPolicyError, ImportPolicyOptions, ImportPolicyResult, ImportTestResult } from './policy-import.interface.js';
import { ImportSchemaMap, ImportSchemaResult } from '../schema/schema-import.interface.js';
import { PolicyImportExportHelper } from './policy-import-helper.js';
import { SchemaImportExportHelper } from '../schema/schema-import-helper.js';
import { importTag } from '../tag/tag-import-helper.js';
import { ImportToolMap, ImportToolResults } from '../tool/tool-import.interface.js';
import { importSubTools } from '../tool/tool-import-helper.js';
import { ImportTokenMap, ImportTokenResult } from '../token/token-import.interface.js';
import { ImportArtifactResult } from '../artifact/artifact-import.interface.js';
import { importTokensByFiles } from '../token/token-import-helper.js';
import { importArtifactsByFiles } from '../artifact/artifact-import-helper.js';
// import { publishSystemSchemas } from '../schema/schema-publish-helper.js';
import { ObjectId } from '@mikro-orm/mongodb';
import { publishSystemSchemasPackage } from '../schema/schema-publish-helper.js';

export enum RecordMethod {
    Start = 'START',
    Stop = 'STOP',
    Action = 'ACTION',
    Generate = 'GENERATE'
}

export class PolicyImport {
    private readonly mode: ImportMode;
    private readonly notifier: INotificationStep;

    private root: IRootConfig;
    private owner: IOwner;
    private topicHelper: TopicHelper;
    private messageServer: MessageServer;
    private parentTopic: TopicConfig;
    private topicRow: TopicConfig;
    private toolsResult: ImportToolResults;
    private toolsMapping: ImportToolMap[]
    private tokensResult: ImportTokenResult;
    private tokenMapping: ImportTokenMap[];
    private artifactsResult: ImportArtifactResult;
    private artifactsMapping: Map<string, string>;
    private schemasResult: ImportSchemaResult;
    private schemasMapping: ImportSchemaMap[];
    private testsResult: ImportTestResult;
    // tslint:disable-next-line:no-unused-variable
    private testsMapping: Map<string, string>;
    // tslint:disable-next-line:no-unused-variable
    private topicId: string;
    private formulasResult: ImportFormulaResult;
    private formulasMapping: Map<string, string>;
    private sourcePolicyId: string | null = null;
    private importRecords = false;
    private fromMessageId: string | null = null;
    private sourcePolicyMessageId: string | null = null;

    constructor(mode: ImportMode, notifier: INotificationStep) {
        this.mode = mode;
        this.notifier = notifier;
    }

    private async resolveAccount(
        user: IOwner,
        step: INotificationStep,
        userId: string | null
    ): Promise<IRootConfig> {
        step.start();
        const users = new Users();
        this.root = await users.getHederaAccount(user.creator, userId);
        this.topicHelper = new TopicHelper(
            this.root.hederaAccountId,
            this.root.hederaAccountKey,
            this.root.signOptions
        );
        this.messageServer = new MessageServer({
            operatorId: this.root.hederaAccountId,
            operatorKey: this.root.hederaAccountKey,
            signOptions: this.root.signOptions
        });
        this.owner = user;
        step.complete();
        return this.root;
    }

    private async dataPreparation(
        policy: Policy,
        user: IOwner,
        additionalPolicyConfig: Partial<Policy> | null
    ): Promise<Policy> {
        if (this.mode === ImportMode.DEMO) {
            delete policy._id;
            delete policy.id;
            delete policy.messageId;
            delete policy.version;
            delete policy.previousVersion;
            delete policy.createDate;
            policy.uuid = GenerateUUIDv4();
            policy.creator = user.creator;
            policy.owner = user.owner;
            policy.instanceTopicId = null;
            policy.synchronizationTopicId = null;
            policy.name = additionalPolicyConfig?.name || policy.name;
            policy.topicDescription = additionalPolicyConfig?.topicDescription || policy.topicDescription;
            policy.description = additionalPolicyConfig?.description || policy.description;
            policy.policyTag = additionalPolicyConfig?.policyTag || 'Tag_' + Date.now();
            policy.status = PolicyStatus.DEMO;
            policy.locationType = LocationType.LOCAL;
            policy.availability = PolicyAvailability.PRIVATE;
        } else if (this.mode === ImportMode.VIEW) {
            delete policy.createDate;
            policy._id = new ObjectId(policy.id);
            policy.id = policy.id;
            policy.creator = null;
            policy.owner = null;
            policy.name = additionalPolicyConfig?.name || policy.name;
            policy.topicDescription = additionalPolicyConfig?.topicDescription || policy.topicDescription;
            policy.description = additionalPolicyConfig?.description || policy.description;
            policy.policyTag = additionalPolicyConfig?.policyTag || policy.policyTag;
            policy.status = PolicyStatus.VIEW;
            policy.messageId = (additionalPolicyConfig?.messageId || policy.messageId || '').trim();
            policy.locationType = LocationType.REMOTE;
            policy.availability = PolicyAvailability.PUBLIC;
        } else {
            delete policy._id;
            delete policy.id;
            delete policy.messageId;
            delete policy.version;
            delete policy.previousVersion;
            delete policy.createDate;
            policy.uuid = GenerateUUIDv4();
            policy.creator = user.creator;
            policy.owner = user.owner;
            policy.instanceTopicId = null;
            policy.synchronizationTopicId = null;
            policy.name = additionalPolicyConfig?.name || policy.name;
            policy.topicDescription = additionalPolicyConfig?.topicDescription || policy.topicDescription;
            policy.description = additionalPolicyConfig?.description || policy.description;
            policy.policyTag = additionalPolicyConfig?.policyTag || 'Tag_' + Date.now();
            policy.status = PolicyStatus.DRAFT;
            policy.locationType = LocationType.LOCAL;
            policy.availability = PolicyAvailability.PRIVATE;
        }
        return policy;
    }

    private async createPolicyTopic(
        policy: Policy,
        user: IOwner,
        versionOfTopicId: string,
        step: INotificationStep,
        userId: string | null
    ) {
        step.start();
        this.parentTopic = await TopicConfig.fromObject(
            await DatabaseServer.getTopicByType(user.owner, TopicType.UserTopic), true, userId
        );

        if (this.mode === ImportMode.DEMO) {
            this.topicRow = new TopicConfig({
                type: TopicType.PolicyTopic,
                name: policy.name || TopicType.PolicyTopic,
                description: policy.topicDescription || TopicType.PolicyTopic,
                owner: user.owner,
                policyId: null,
                policyUUID: null,
                topicId: `0.0.${Date.now()}${(Math.random() * 1000).toFixed(0)}`
            }, null, null);
            await DatabaseServer.saveTopic(this.topicRow.toObject());
        } else if (this.mode === ImportMode.VIEW) {
            this.topicRow = new TopicConfig({
                type: TopicType.PolicyTopic,
                name: policy.name || TopicType.PolicyTopic,
                description: policy.topicDescription || TopicType.PolicyTopic,
                owner: user.owner,
                policyId: policy.id,
                policyUUID: policy.uuid,
                topicId: policy.topicId
            }, null, null);
            await DatabaseServer.saveTopic(this.topicRow.toObject());

            const restoreTopic = new TopicConfig({
                type: TopicType.RestoreTopic,
                name: TopicType.RestoreTopic,
                description: TopicType.RestoreTopic,
                owner: user.owner,
                policyId: policy.id,
                policyUUID: policy.uuid,
                topicId: policy.restoreTopicId
            }, null, null);
            await DatabaseServer.saveTopic(restoreTopic.toObject());

            const actionsTopic = new TopicConfig({
                type: TopicType.ActionsTopic,
                name: TopicType.ActionsTopic,
                description: TopicType.ActionsTopic,
                owner: user.owner,
                policyId: policy.id,
                policyUUID: policy.uuid,
                topicId: policy.actionsTopicId
            }, null, null);
            await DatabaseServer.saveTopic(actionsTopic.toObject());

            const recordsTopic = new TopicConfig({
                type: TopicType.RecordsTopic,
                name: TopicType.RecordsTopic,
                description: TopicType.RecordsTopic,
                owner: user.owner,
                policyId: policy.id,
                policyUUID: policy.uuid,
                topicId: policy.recordsTopicId
            }, null, null);
            await DatabaseServer.saveTopic(recordsTopic.toObject());
        } else {
            if (versionOfTopicId) {
                this.topicRow = await TopicConfig.fromObject(
                    await DatabaseServer.getTopicById(versionOfTopicId), true, userId
                );
                step.skip();
            } else {
                // <-- Steps
                const STEP_CREATE_POLICY_TOPIC = 'Create policy topic';
                const STEP_PUBLISH_POLICY = 'Publish Policy in Hedera';
                const STEP_LINK_TOPIC = 'Link topic and policy';
                // Steps -->
                step.addStep(STEP_CREATE_POLICY_TOPIC);
                step.addStep(STEP_PUBLISH_POLICY);
                step.addStep(STEP_LINK_TOPIC);

                step.startStep(STEP_CREATE_POLICY_TOPIC);
                this.topicRow = await this.topicHelper.create({
                    type: TopicType.PolicyTopic,
                    name: policy.name || TopicType.PolicyTopic,
                    description: policy.topicDescription || TopicType.PolicyTopic,
                    owner: user.owner,
                    policyId: null,
                    policyUUID: null
                }, userId);
                await this.topicRow.saveKeys(userId);
                await DatabaseServer.saveTopic(this.topicRow.toObject());

                policy.topicId = this.topicRow.topicId;
                step.completeStep(STEP_CREATE_POLICY_TOPIC);

                step.startStep(STEP_PUBLISH_POLICY);
                const message = new PolicyMessage(MessageType.Policy, MessageAction.CreatePolicy);
                message.setDocument(policy);
                const createPolicyMessage = await this.messageServer
                    .setTopicObject(this.parentTopic)
                    .sendMessage(message, {
                        sendToIPFS: true,
                        memo: null,
                        interception: null,
                        userId
                    });
                step.completeStep(STEP_PUBLISH_POLICY);

                step.startStep(STEP_LINK_TOPIC);
                await this.topicHelper.twoWayLink(
                    this.topicRow,
                    this.parentTopic,
                    createPolicyMessage.getId(),
                    this.owner.id
                );
                step.completeStep(STEP_LINK_TOPIC);
            }
        }
        policy.topicId = this.topicRow.topicId;
        this.topicId = policy.topicId;
        step.complete();
    }

    private async publishSystemSchemas(
        policy: Policy,
        systemSchemas: Schema[],
        user: IOwner,
        versionOfTopicId: string,
        step: INotificationStep,
        userId: string | null
    ) {
        if (this.mode === ImportMode.DEMO) {
            step.start();
            systemSchemas = await PolicyImportExportHelper.getSystemSchemas();
            this.schemasResult = await SchemaImportExportHelper.importSystemSchema(
                systemSchemas,
                user,
                {
                    category: SchemaCategory.POLICY,
                    topicId: this.topicRow.topicId,
                    skipGenerateId: false,
                    mode: this.mode
                },
                step,
                userId
            );
            step.complete();
        } else if (this.mode === ImportMode.VIEW) {
            step.start();
            this.schemasResult = await SchemaImportExportHelper.importSystemSchema(
                systemSchemas,
                user,
                {
                    category: SchemaCategory.POLICY,
                    topicId: this.topicRow.topicId,
                    skipGenerateId: false,
                    mode: this.mode
                },
                step,
                userId
            );
            step.complete();
        } else {
            if (versionOfTopicId) {
                step.skip();
            } else {
                step.start();
                systemSchemas = await PolicyImportExportHelper.getSystemSchemas();
                // step.setEstimate(systemSchemas.length);
                this.messageServer.setTopicObject(this.topicRow);
                // await publishSystemSchemas(systemSchemas, this.messageServer, user, step);
                await publishSystemSchemasPackage({
                    name: policy.name,
                    version: policy.version,
                    schemas: systemSchemas,
                    owner: user,
                    server: this.messageServer,
                    notifier: step
                })
                step.complete();
            }
        }
    }

    private async importTools(
        tools: PolicyTool[],
        user: IOwner,
        metadata: PolicyToolMetadata | null,
        step: INotificationStep,
        userId: string | null
    ) {
        step.start();

        this.toolsMapping = [];
        if (metadata?.tools) {
            for (const tool of tools) {
                if (
                    metadata.tools[tool.messageId] &&
                    tool.messageId !== metadata.tools[tool.messageId]
                ) {
                    this.toolsMapping.push({
                        oldMessageId: tool.messageId,
                        messageId: metadata.tools[tool.messageId],
                        oldHash: tool.hash,
                    });
                    tool.messageId = metadata.tools[tool.messageId];
                }
            }
        }

        this.toolsResult = await importSubTools(this.root, tools, user, step, userId);

        for (const toolMapping of this.toolsMapping) {
            const toolByMessageId = this.toolsResult.tools.find((tool) => tool.messageId === toolMapping.messageId);
            toolMapping.newHash = toolByMessageId?.hash;
        }

        step.complete();
    }

    private async importTokens(
        tokens: Token[],
        user: IOwner,
        step: INotificationStep,
        userId: string | null
    ) {
        step.start();
        this.tokensResult = await importTokensByFiles(user, tokens, this.mode, step, userId);
        this.tokenMapping = this.tokensResult.tokenMap;
        step.complete();
    }

    private async importSchemas(
        schemas: Schema[],
        user: IOwner,
        step: INotificationStep,
        userId: string | null
    ) {
        step.start();
        const topicIds = this.toolsResult.tools.map((tool) => tool.topicId);
        const toolsSchemas = (await DatabaseServer.getSchemas(
            {
                category: SchemaCategory.TOOL,
                topicId: { $in: topicIds }
            },
            {
                fields: ['name', 'iri'],
            }
        )) as { name: string; iri: string }[];
        this.schemasResult = await SchemaImportExportHelper.importSchemaByFiles(
            schemas,
            user,
            {
                category: SchemaCategory.POLICY,
                topicId: this.topicRow.topicId,
                skipGenerateId: false,
                outerSchemas: toolsSchemas,
                mode: this.mode
            },
            step,
            userId
        );
        this.schemasMapping = this.schemasResult.schemasMap;
        step.complete();
    }

    private async importArtifacts(
        artifacts: any[],
        user: IOwner,
        step: INotificationStep,
        userId: string | null
    ) {
        step.start();
        this.artifactsResult = await importArtifactsByFiles(user, artifacts, this.mode, step, userId);
        this.artifactsMapping = this.artifactsResult.artifactsMap;
        step.complete();
    }

    private async importTests(
        tests: any[],
        user: IOwner,
        step: INotificationStep,
        userId: string | null
    ) {
        step.start();
        const testsMap = new Map<string, string>();
        const errors: any[] = [];
        const files: [any, Buffer][] = [];
        for (const test of tests) {
            const oldUUID = test.uuid;
            const newUUID = GenerateUUIDv4();
            try {
                const recordToImport = await RecordImportExport.parseZipFile(test.data);
                files.push([{
                    uuid: newUUID,
                    owner: user.creator,
                    status: PolicyTestStatus.New,
                    duration: recordToImport.duration,
                    progress: 0,
                    date: null,
                    result: null,
                    error: null,
                    resultId: null,
                }, test.data])
                testsMap.set(oldUUID, newUUID);
            } catch (error) {
                errors.push({
                    type: 'test',
                    uuid: oldUUID,
                    name: oldUUID,
                    error: error.toString(),
                })
            }
        }

        this.testsResult = { testsMap, errors, files };
        this.testsMapping = testsMap;
        step.complete();
    }

    private async importFormulas(
        formulas: Formula[],
        user: IOwner,
        step: INotificationStep,
        userId: string | null
    ) {
        step.start();
        const formulasMap = new Map<string, string>();
        const errors: any[] = [];
        const files: IFormula[] = [];
        for (const formula of formulas) {
            if (this.mode === ImportMode.VIEW) {
                files.push({
                    uuid: formula.uuid,
                    name: formula.name,
                    description: formula.description,
                    owner: user.creator,
                    creator: user.creator,
                    status: EntityStatus.PUBLISHED,
                    config: formula.config
                })
            } else {
                const oldUUID = formula.uuid;
                const newUUID = GenerateUUIDv4();
                files.push({
                    uuid: newUUID,
                    name: formula.name,
                    description: formula.description,
                    owner: user.creator,
                    creator: user.creator,
                    status: EntityStatus.DRAFT,
                    config: formula.config
                })
                formulasMap.set(oldUUID, newUUID);
            }
        }

        this.formulasResult = { formulasMap, errors, files };
        this.formulasMapping = formulasMap;
        step.complete();
    }

    private async updateUUIDs(policy: Policy): Promise<Policy> {
        await PolicyImportExportHelper.replaceConfig(
            policy,
            this.schemasMapping,
            this.artifactsMapping,
            this.tokenMapping,
            this.toolsMapping,
        );
        for (const formula of this.formulasResult.files) {
            PolicyImportExportHelper.replaceFormulaConfig(
                formula,
                this.schemasMapping,
                this.formulasMapping,
            );
        }
        return policy;
    }

    private async savePolicy(policy: Policy, step: INotificationStep): Promise<Policy> {
        step.start();
        const dataBaseServer = new DatabaseServer();
        const model = dataBaseServer.create(Policy, policy as Policy);
        const result = await dataBaseServer.save(Policy, model);
        step.complete();
        return result;
    }

    private async saveTopic(policy: Policy, step: INotificationStep) {
        step.start();
        const dataBaseServer = new DatabaseServer();
        const row = await dataBaseServer.findOne(Topic, { topicId: this.topicRow.topicId })
        row.policyId = policy.id.toString();
        row.policyUUID = policy.uuid;
        await dataBaseServer.update(Topic, null, row);
        step.complete();
    }

    private async saveArtifacts(policy: Policy, step: INotificationStep) {
        step.start();
        const artifactObjects = []
        for (const addedArtifact of this.artifactsResult.artifacts) {
            addedArtifact.policyId = policy.id;

            artifactObjects.push(addedArtifact);
        }
        await DatabaseServer.saveArtifacts(artifactObjects);
        step.complete();
    }

    private async saveTests(policy: Policy, step: INotificationStep) {
        step.start();
        for (const [test, data] of this.testsResult.files) {
            test.policyId = policy.id;
            await DatabaseServer.createPolicyTest(test, data);
        }
        step.complete();
    }

    private async saveFormulas(policy: Policy, step: INotificationStep) {
        step.start();
        for (const formula of this.formulasResult.files) {
            formula.policyId = policy.id;
            formula.policyTopicId = policy.topicId;
            formula.policyInstanceTopicId = policy.instanceTopicId;
            formula.config = FormulaImportExport.validateConfig(formula.config);
            await DatabaseServer.createFormula(formula);
        }
        step.complete();
    }

    private async saveHash(
        policy: Policy,
        logger: PinoLogger,
        step: INotificationStep,
        userId: string | null
    ) {
        step.start();
        await PolicyImportExportHelper.updatePolicyComponents(policy, logger, userId);
        step.complete();
    }

    private async setSuggestionsConfig(
        policy: Policy,
        user: IOwner,
        step: INotificationStep
    ) {
        step.start();
        const suggestionsConfig = await DatabaseServer.getSuggestionsConfig(user.creator);
        if (!suggestionsConfig) {
            await DatabaseServer.setSuggestionsConfig({
                user: user.creator,
                items: [
                    {
                        id: policy.id,
                        type: ConfigType.POLICY,
                        index: 0,
                    },
                ],
            });
        }
        step.complete();
    }

    private async importTags(
        policy: Policy,
        tags: Tag[],
        step: INotificationStep
    ) {
        step.start();
        if (!tags || !tags.length) {
            step.complete();
            return;
        }

        const policyTags = tags.filter((t: any) => t.entity === TagType.Policy);
        const tokenTags = tags.filter((t: any) => t.entity === TagType.Token);
        const schemaTags = tags.filter((t: any) => t.entity === TagType.Schema);
        await importTag(policyTags, policy.id.toString());
        const tokenIdMap: Map<string, string> = new Map();
        for (const item of this.tokenMapping) {
            tokenIdMap.set(item.oldID, item.newID);
            tokenIdMap.set(item.oldTokenID, item.newID);
        }
        await importTag(tokenTags, tokenIdMap);
        const schemaIdMap: Map<string, string> = new Map();
        for (const item of this.schemasMapping) {
            schemaIdMap.set(item.oldID, item.newID);
            schemaIdMap.set(item.oldMessageID, item.newID);
        }
        await importTag(schemaTags, schemaIdMap);
        step.complete();
    }

    private async getErrors(): Promise<ImportPolicyError[]> {
        const errors: ImportPolicyError[] = [];
        if (this.schemasResult.errors) {
            for (const error of this.schemasResult.errors) {
                errors.push(error);
            }
        }
        if (this.toolsResult.errors) {
            for (const error of this.toolsResult.errors) {
                errors.push(error);
            }
        }
        if (this.testsResult.errors) {
            for (const error of this.testsResult.errors) {
                errors.push(error);
            }
        }
        if (this.formulasResult.errors) {
            for (const error of this.formulasResult.errors) {
                errors.push(error);
            }
        }
        return errors;
    }

    public async import(
        options: ImportPolicyOptions,
        userId: string | null
    ): Promise<ImportPolicyResult> {
        options.validate();
        const {
            policy,
            tokens,
            schemas,
            systemSchemas,
            artifacts,
            tags,
            tools,
            tests,
            formulas,
        } = options.policyComponents;
        const user = options.user;
        const versionOfTopicId = options.versionOfTopicId;
        const additionalPolicyConfig = options.additionalPolicyConfig;
        const metadata = options.metadata;
        const logger = options.logger;
        console.log(policy, 'policy');
        console.log(options, 'options');
        this.importRecords = !!options.importRecords;
        this.fromMessageId = options.fromMessageId;
        this.sourcePolicyId = policy?.id
            ? policy.id.toString()
            : (policy as any)?._id
                ? (policy as any)._id.toString()
                : (policy as any)?.policyId
                    ? String((policy as any).policyId)
                    : null;
        this.sourcePolicyMessageId = (
            (options.additionalPolicyConfig?.messageId as string | undefined)
            || (policy as any)?.messageId
            || ''
        ).toString().trim() || null;

        // <-- Steps
        const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
        const STEP_RESOLVE_TOPIC = 'Resolve topic';
        const STEP_PUBLISH_SYSTEM_SCHEMAS = 'Publish system schemas';
        const STEP_IMPORT_TOOLS = 'Import tools';
        const STEP_IMPORT_TOKENS = 'Import tokens';
        const STEP_IMPORT_SCHEMAS = 'Import schemas';
        const STEP_IMPORT_ARTIFACTS = 'Import artifacts';
        const STEP_IMPORT_TESTS = 'Import tests';
        const STEP_IMPORT_FORMULAS = 'Import formulas';
        const STEP_SAVE = 'Save';
        const STEP_IMPORT_TAGS = 'Import tags';
        // Steps -->

        this.notifier.addStep(STEP_RESOLVE_ACCOUNT, 1);
        this.notifier.addStep(STEP_RESOLVE_TOPIC, 1);
        this.notifier.addStep(STEP_PUBLISH_SYSTEM_SCHEMAS, 30, true);
        this.notifier.addStep(STEP_IMPORT_TOOLS, 10);
        this.notifier.addStep(STEP_IMPORT_TOKENS, 2);
        this.notifier.addStep(STEP_IMPORT_SCHEMAS, 50);
        this.notifier.addStep(STEP_IMPORT_ARTIFACTS, 5);
        this.notifier.addStep(STEP_IMPORT_TESTS, 2);
        this.notifier.addStep(STEP_IMPORT_FORMULAS, 2);
        this.notifier.addStep(STEP_SAVE, 3);
        this.notifier.addStep(STEP_IMPORT_TAGS, 5);
        this.notifier.start();

        await this.resolveAccount(
            user,
            this.notifier.getStep(STEP_RESOLVE_ACCOUNT),
            userId
        );
        await this.dataPreparation(policy, user, additionalPolicyConfig);
        await this.createPolicyTopic(
            policy,
            user,
            versionOfTopicId,
            this.notifier.getStep(STEP_RESOLVE_TOPIC),
            userId
        );
        await this.publishSystemSchemas(
            policy,
            systemSchemas,
            user,
            versionOfTopicId,
            this.notifier.getStep(STEP_PUBLISH_SYSTEM_SCHEMAS),
            userId
        );
        await this.importTools(
            tools,
            user,
            metadata,
            this.notifier.getStep(STEP_IMPORT_TOOLS),
            userId
        );
        await this.importTokens(
            tokens,
            user,
            this.notifier.getStep(STEP_IMPORT_TOKENS),
            userId
        );
        await this.importSchemas(
            schemas,
            user,
            this.notifier.getStep(STEP_IMPORT_SCHEMAS),
            userId
        );
        await this.importArtifacts(
            artifacts,
            user,
            this.notifier.getStep(STEP_IMPORT_ARTIFACTS),
            userId
        );
        await this.importTests(
            tests,
            user,
            this.notifier.getStep(STEP_IMPORT_TESTS),
            userId
        );
        await this.importFormulas(
            formulas,
            user,
            this.notifier.getStep(STEP_IMPORT_FORMULAS),
            userId
        );

        const step = this.notifier.getStep(STEP_SAVE);
        // <-- Steps
        const STEP_SAVE_POLICY = 'Save policy';
        const STEP_SAVE_TOPIC = 'Save topic';
        const STEP_SAVE_ARTIFACTS = 'Save artifacts';
        const STEP_SAVE_TESTS = 'Save tests';
        const STEP_SAVE_FORMULAS = 'Save formulas';
        const STEP_SAVE_HASH = 'Save hash';
        const STEP_SAVE_SUGGEST = 'Save suggestions';
        // Steps -->
        step.addStep(STEP_SAVE_POLICY);
        step.addStep(STEP_SAVE_TOPIC);
        step.addStep(STEP_SAVE_ARTIFACTS);
        step.addStep(STEP_SAVE_TESTS);
        step.addStep(STEP_SAVE_FORMULAS);
        step.addStep(STEP_SAVE_HASH);
        step.addStep(STEP_SAVE_SUGGEST);
        step.start();

        await this.updateUUIDs(policy);

        policy.autoRecordSteps = this.importRecords;
        policy.fromMessageId = this.fromMessageId;

        const row = await this.savePolicy(policy, step.getStep(STEP_SAVE_POLICY));
        await this.saveTopic(row, step.getStep(STEP_SAVE_TOPIC));
        await this.saveArtifacts(row, step.getStep(STEP_SAVE_ARTIFACTS));
        await this.saveTests(row, step.getStep(STEP_SAVE_TESTS));
        await this.saveFormulas(row, step.getStep(STEP_SAVE_FORMULAS));
        await this.saveHash(row, logger, step.getStep(STEP_SAVE_HASH), userId);
        await this.setSuggestionsConfig(row, user, step.getStep(STEP_SAVE_SUGGEST));
        step.complete();

        await this.importTags(row, tags, this.notifier.getStep(STEP_IMPORT_TAGS));
        await this.copyPolicyRecords(row, logger);

        this.notifier.complete();

        const errors = await this.getErrors();
        return { policy: row, errors };
    }

    private async copyPolicyRecords(policy: Policy, logger: PinoLogger): Promise<void> {
        console.log(this.fromMessageId, 'fromMessageId');
        if (!this.importRecords || !this.fromMessageId) {
            return;
        }

        try {
            const targetPolicyId = policy?.id?.toString?.();
            if (!targetPolicyId) {
                return;
            }

            const sourceRecordsTopicId = policy.recordsTopicId;
            console.log(sourceRecordsTopicId, 'sourceRecordsTopicId');
            if (!sourceRecordsTopicId) {
                await logger.warn(
                    `copyPolicyRecords: recordsTopicId is not set for policy ${targetPolicyId}`,
                    ['POLICY_IMPORT'],
                    null
                );
                return;
            }

            const messages = await MessageServer.getMessages<PolicyRecordMessage>({
                topicId: sourceRecordsTopicId,
                userId: null,
                type: MessageType.PolicyRecordStep,
                action: MessageAction.PolicyRecordStep
            });
            console.log(messages, 'messages');

            if (!messages || !messages.length) {
                await logger.info(
                    `copyPolicyRecords: no PolicyRecordStep messages found in topic ${sourceRecordsTopicId}`,
                    ['POLICY_IMPORT'],
                    null
                );
                return;
            }

            let startRecotdTime = 0;

            for (const msg of messages) {
                if (msg.policyMessageId !== this.fromMessageId) {
                    continue;
                }

                try {
                    await MessageServer.loadDocument(msg);
                } catch (e: any) {
                    await logger.error(
                        `copyPolicyRecords: failed to load record zip from IPFS for recordId=${msg.recordId}: ${e?.message || e}`,
                        ['POLICY_IMPORT'],
                        null
                    );
                    continue;
                }

                const zipBuffer = msg.getDocument?.() as Buffer | undefined;
                console.log(zipBuffer, 'zipBuffer');
                if (!zipBuffer) {
                    await logger.warn(
                        `copyPolicyRecords: empty document for recordId=${msg.recordId}`,
                        ['POLICY_IMPORT'],
                        null
                    );
                    continue;
                }

                let parsed: any;
                try {
                    parsed = await RecordImportExport.parseZipFile(zipBuffer);
                } catch (e: any) {
                    await logger.error(
                        `copyPolicyRecords: failed to parse record zip for recordId=${msg.recordId}: ${e?.message || e}`,
                        ['POLICY_IMPORT'],
                        null
                    );
                    continue;
                }
                console.log(parsed, 'parsed');

                const parsedRecords: any[] = Array.isArray(parsed?.records)
                    ? parsed.records
                    : parsed?.record
                        ? [parsed.record]
                        : [];
                const parsedResults: any[] = Array.isArray(parsed?.results) ? parsed.results : [];

                if (!parsedRecords.length) {
                    await logger.warn(
                        `copyPolicyRecords: no records found inside zip for recordId=${msg.recordId}`,
                        ['POLICY_IMPORT'],
                        null
                    );
                    continue;
                }

                for (const recordFromZip of parsedRecords) {
                    console.log(recordFromZip, 'recordFromZip');
                    if (!startRecotdTime) {
                        startRecotdTime = (Number(msg.time) || Date.now()) - 3000;
                    }
                    const clonedRecord: any = {
                        uuid: recordFromZip.uuid || msg.recordingUuid,
                        policyId: targetPolicyId,
                        method: recordFromZip.method || msg.method,
                        action: recordFromZip.action || msg.actionName,
                        time: msg.time,
                        user: recordFromZip.user || msg.user,
                        target: recordFromZip.target || msg.target,
                        document: recordFromZip.document ?? null,
                        results: parsedResults.length ? parsedResults : null,

                        ipfsCid: recordFromZip.ipfsCid ?? null,
                        ipfsUrl: recordFromZip.ipfsUrl ?? null,
                        ipfsTimestamp: recordFromZip.ipfsTimestamp ?? new Date(),
                        userRole: recordFromZip.userRole || null,

                        fromPolicyId: this.sourcePolicyId,
                        copiedRecordId: recordFromZip.id?.toString?.() || msg.recordId?.toString?.() || null
                    };

                    await DatabaseServer.createRecord(clonedRecord);
                }
            }

                const startRecord: any = {
                    uuid: GenerateUUIDv4(),
                    policyId: targetPolicyId,
                    method: RecordMethod.Start,
                    action: null,
                    time: startRecotdTime || Date.now(),
                    user: policy.owner,
                    target: null,
                    document: null,

                    ipfsCid: null,
                    ipfsUrl: null,
                    ipfsTimestamp: new Date(),

                    fromPolicyId: this.sourcePolicyId,
                    copiedRecordId: null,
                };
                await DatabaseServer.createRecord(startRecord);
        } catch (error: any) {
            await logger.error(
                `Failed to copy policy records from Hedera/IPFS: ${error?.message || error}`,
                ['POLICY_IMPORT'],
                null
            );
            throw error;
        }
    }
}
