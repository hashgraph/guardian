import { ConfigType, EntityStatus, GenerateUUIDv4, IFormula, IOwner, IRootConfig, PolicyTestStatus, PolicyToolMetadata, PolicyStatus, SchemaCategory, TagType, TopicType, LocationType } from '@guardian/interfaces';
import { DatabaseServer, PinoLogger, MessageAction, MessageServer, MessageType, Policy, PolicyMessage, PolicyTool, RecordImportExport, Schema, Tag, Token, Topic, TopicConfig, TopicHelper, Users, Formula, FormulaImportExport } from '@guardian/common';
import { ImportMode } from '../common/import.interface.js';
import { ImportFormulaResult, ImportPolicyError, ImportPolicyOptions, ImportPolicyResult, ImportTestResult } from './policy-import.interface.js';
import { ImportSchemaMap, ImportSchemaResult } from '../schema/schema-import.interface.js';
import { PolicyImportExportHelper } from './policy-import-helper.js';
import { SchemaImportExportHelper } from '../schema/schema-import-helper.js';
import { importTag } from '../tag/tag-import-helper.js';
import { INotifier } from '../../notifier.js';
import { ImportToolMap, ImportToolResults } from '../tool/tool-import.interface.js';
import { importSubTools } from '../tool/tool-import-helper.js';
import { ImportTokenMap, ImportTokenResult } from '../token/token-import.interface.js';
import { ImportArtifactResult } from '../artifact/artifact-import.interface.js';
import { importTokensByFiles } from '../token/token-import-helper.js';
import { importArtifactsByFiles } from '../artifact/artifact-import-helper.js';
import { publishSystemSchemas } from '../schema/schema-publish-helper.js';
import { ObjectId } from '@mikro-orm/mongodb';

export class PolicyImport {
    private readonly mode: ImportMode;
    private readonly notifier: INotifier;

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

    constructor(mode: ImportMode, notifier: INotifier) {
        this.mode = mode;
        this.notifier = notifier;
    }

    private async resolveAccount(user: IOwner, userId: string | null): Promise<IRootConfig> {
        this.notifier.start('Resolve Hedera account');
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
        }
        return policy;
    }

    private async createPolicyTopic(policy: Policy, user: IOwner, versionOfTopicId: string, userId: string | null) {
        this.notifier.completedAndStart('Resolve topic');
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
        } else {
            if (versionOfTopicId) {
                this.topicRow = await TopicConfig.fromObject(
                    await DatabaseServer.getTopicById(versionOfTopicId), true, userId
                );
                this.notifier.completedAndStart('Skip publishing policy in Hedera');
            } else {
                this.notifier.completedAndStart('Publish Policy in Hedera');
                const message = new PolicyMessage(MessageType.Policy, MessageAction.CreatePolicy);
                message.setDocument(policy);
                const createPolicyMessage = await this.messageServer
                    .setTopicObject(this.parentTopic)
                    .sendMessage(message);

                this.notifier.completedAndStart('Create policy topic');
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

                this.notifier.completedAndStart('Link topic and policy');
                await this.topicHelper.twoWayLink(
                    this.topicRow,
                    this.parentTopic,
                    createPolicyMessage.getId(),
                    this.owner.id
                );
            }
        }
        policy.topicId = this.topicRow.topicId;
        this.topicId = policy.topicId;
    }

    private async publishSystemSchemas(systemSchemas: Schema[], user: IOwner, versionOfTopicId: string, userId: string | null) {
        if (this.mode === ImportMode.DEMO) {
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
                this.notifier,
                userId
            );
        } else if (this.mode === ImportMode.VIEW) {
            this.schemasResult = await SchemaImportExportHelper.importSystemSchema(
                systemSchemas,
                user,
                {
                    category: SchemaCategory.POLICY,
                    topicId: this.topicRow.topicId,
                    skipGenerateId: false,
                    mode: this.mode
                },
                this.notifier,
                userId
            );
        } else {
            if (versionOfTopicId) {
                this.notifier.completedAndStart('Skip publishing schemas');
            } else {
                this.notifier.completedAndStart('Publishing schemas');
                systemSchemas = await PolicyImportExportHelper.getSystemSchemas();
                this.notifier.info(`Found ${systemSchemas.length} schemas`);
                this.messageServer.setTopicObject(this.topicRow);
                await publishSystemSchemas(systemSchemas, this.messageServer, user, this.notifier);
            }
        }
    }

    private async importTools(
        tools: PolicyTool[],
        user: IOwner,
        metadata: PolicyToolMetadata | null,
        userId: string | null
    ) {
        this.notifier.completedAndStart('Import tools');
        this.notifier.sub(true);

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

        this.toolsResult = await importSubTools(this.root, tools, user, this.notifier, userId);

        for (const toolMapping of this.toolsMapping) {
            const toolByMessageId = this.toolsResult.tools.find((tool) => tool.messageId === toolMapping.messageId);
            toolMapping.newHash = toolByMessageId?.hash;
        }

        this.notifier.sub(false);
    }

    private async importTokens(tokens: Token[], user: IOwner) {
        this.tokensResult = await importTokensByFiles(user, tokens, this.mode, this.notifier);
        this.tokenMapping = this.tokensResult.tokenMap;
    }

    private async importSchemas(schemas: Schema[], user: IOwner, userId: string | null) {
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
            this.notifier,
            userId
        );
        this.schemasMapping = this.schemasResult.schemasMap;
    }

    private async importArtifacts(artifacts: any[], user: IOwner) {
        this.artifactsResult = await importArtifactsByFiles(user, artifacts, this.mode, this.notifier);
        this.artifactsMapping = this.artifactsResult.artifactsMap;
    }

    private async importTests(tests: any[], user: IOwner) {
        this.notifier.completedAndStart('Import tests');

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
    }

    private async importFormulas(formulas: Formula[], user: IOwner) {
        this.notifier.completedAndStart('Import formulas');

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

    private async savePolicy(policy: Policy): Promise<Policy> {
        this.notifier.completedAndStart('Saving policy in DB');

        const dataBaseServer = new DatabaseServer();
        const model = dataBaseServer.create(Policy, policy as Policy);
        return await dataBaseServer.save(Policy, model);
    }

    private async saveTopic(policy: Policy) {
        this.notifier.completedAndStart('Saving topic in DB');

        const dataBaseServer = new DatabaseServer();

        const row = await dataBaseServer.findOne(Topic, { topicId: this.topicRow.topicId })
        row.policyId = policy.id.toString();
        row.policyUUID = policy.uuid;
        await dataBaseServer.update(Topic, null, row);
    }

    private async saveArtifacts(policy: Policy) {
        this.notifier.completedAndStart('Saving artifacts in DB');

        const artifactObjects = []

        for (const addedArtifact of this.artifactsResult.artifacts) {
            addedArtifact.policyId = policy.id;

            artifactObjects.push(addedArtifact);
        }

        await DatabaseServer.saveArtifacts(artifactObjects);
    }

    private async saveTests(policy: Policy) {
        this.notifier.completedAndStart('Saving tests in DB');
        for (const [test, data] of this.testsResult.files) {
            test.policyId = policy.id;
            await DatabaseServer.createPolicyTest(test, data);
        }
    }

    private async saveFormulas(policy: Policy) {
        this.notifier.completedAndStart('Saving formulas in DB');
        for (const formula of this.formulasResult.files) {
            formula.policyId = policy.id;
            formula.policyTopicId = policy.topicId;
            formula.policyInstanceTopicId = policy.instanceTopicId;
            formula.config = FormulaImportExport.validateConfig(formula.config);
            await DatabaseServer.createFormula(formula);
        }
    }

    private async saveHash(policy: Policy, logger: PinoLogger, userId: string | null) {
        this.notifier.completedAndStart('Updating hash');
        await PolicyImportExportHelper.updatePolicyComponents(policy, logger, userId);
    }

    private async setSuggestionsConfig(policy: Policy, user: IOwner) {
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
    }

    private async importTags(policy: Policy, tags: Tag[]) {
        this.notifier.completedAndStart('Import tags');
        if (!tags || !tags.length) {
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
        this.notifier.completed();
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

    public async import(options: ImportPolicyOptions, userId: string | null): Promise<ImportPolicyResult> {
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
            formulas
        } = options.policyComponents;
        const user = options.user;
        const versionOfTopicId = options.versionOfTopicId;
        const additionalPolicyConfig = options.additionalPolicyConfig;
        const metadata = options.metadata;
        const logger = options.logger;

        await this.resolveAccount(user, userId);
        await this.dataPreparation(policy, user, additionalPolicyConfig);
        await this.createPolicyTopic(policy, user, versionOfTopicId, userId);
        await this.publishSystemSchemas(systemSchemas, user, versionOfTopicId, userId);
        await this.importTools(tools, user, metadata, userId);
        await this.importTokens(tokens, user);
        await this.importSchemas(schemas, user, userId);
        await this.importArtifacts(artifacts, user);
        await this.importTests(tests, user);
        await this.importFormulas(formulas, user);

        await this.updateUUIDs(policy);

        const row = await this.savePolicy(policy);
        await this.saveTopic(row);
        await this.saveArtifacts(row);
        await this.saveTests(row);
        await this.saveFormulas(row);
        await this.saveHash(row, logger, userId);
        await this.setSuggestionsConfig(row, user);
        await this.importTags(row, tags);

        const errors = await this.getErrors();
        return { policy: row, errors };
    }
}
