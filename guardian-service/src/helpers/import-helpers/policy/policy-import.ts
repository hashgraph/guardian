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
    PolicyAvailability,
    RecordMethod,
    ModuleStatus,
    SchemaHelper,
    SchemaStatus,
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
    PolicyRecordMessage,
    Record,
    SchemaTemplate,
    SchemaTemplateImportExport,
    SchemaTemplateMessage,
    SchemaTemplateSnapshot,
} from '@guardian/common';
import { ImportMode } from '../common/import.interface.js';
import { ImportFormulaResult, ImportPolicyError, ImportPolicyOptions, ImportPolicyResult, ImportTestResult } from './policy-import.interface.js';
import { ImportSchemaMap, ImportSchemaResult } from '../schema/schema-import.interface.js';
import { PolicyImportExportHelper } from './policy-import-helper.js';
import { SchemaImportExportHelper } from '../schema/schema-import-helper.js';
import { importTag } from '../tag/tag-import-helper.js';
import { ImportToolMap, ImportToolResults } from '../tool/tool-import.interface.js';
import { importSubTools } from '../tool/tool-import-helper.js';
import { resolveToolOverrides } from '../tool/tool-override-resolver.js';
import { ImportTokenMap, ImportTokenResult } from '../token/token-import.interface.js';
import { ImportArtifactResult } from '../artifact/artifact-import.interface.js';
import { importTokensByFiles } from '../token/token-import-helper.js';
import { importArtifactsByFiles } from '../artifact/artifact-import-helper.js';
// import { publishSystemSchemas } from '../schema/schema-publish-helper.js';
import { FilterObject, ObjectId } from '@mikro-orm/mongodb';
import { publishSystemSchemasPackage } from '../schema/schema-publish-helper.js';

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
    private importRecords = false;
    /** Source template id -> the template that binding resolved to on this instance. */
    public schemaTemplates: Map<string, SchemaTemplate> = new Map();

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
            delete policy.discontinuedDate;
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
            delete policy.discontinuedDate;
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
                this.topicRow = await this.topicHelper.create(
                    {
                        type: TopicType.PolicyTopic,
                        name: policy.name || TopicType.PolicyTopic,
                        description: policy.topicDescription || TopicType.PolicyTopic,
                        owner: user.owner,
                        policyId: null,
                        policyUUID: null
                    },
                    {
                        admin: true,
                        submit: true
                    },
                    {
                        userId
                    }
                );
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
                await this.topicHelper.twoWayLink({
                    topic: this.topicRow,
                    parent: this.parentTopic,
                    rationale: createPolicyMessage.getId(),
                    userId: this.owner.id
                });
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

        const { toolsMapping, preResolvedTools, toolsToImport } = await resolveToolOverrides(tools, metadata);
        this.toolsMapping = toolsMapping;

        this.toolsResult = await importSubTools(this.root, toolsToImport, user, step, userId);
        this.toolsResult.tools = [...preResolvedTools, ...this.toolsResult.tools];

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
                    description: recordToImport.policyTest?.description,
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

    private async resolveSchemaTemplateByMessage(
        messageId: string,
        user: IOwner,
        userId: string | null
    ): Promise<SchemaTemplate | null> {
        if (!messageId) {
            return null;
        }

        const localTemplate = await DatabaseServer.getSchemaTemplate({
            messageId,
            status: ModuleStatus.PUBLISHED
        });
        if (localTemplate) {
            return localTemplate;
        }

        const message = await this.messageServer.tryGetMessage<SchemaTemplateMessage>({
            messageId,
            loadIPFS: true,
            userId,
            interception: null
        });
        if (!message || message.type !== MessageType.SchemaTemplate || !message.document) {
            return null;
        }

        const components = await SchemaTemplateImportExport.parseZipFile(message.document);
        const templatePayload: any = components.template || {};
        // same list as createSchemaTemplate's sanitizer - this zip is equally forgeable
        delete templatePayload._id;
        delete templatePayload.id;
        delete templatePayload.configFileId;
        delete templatePayload.contentFileId;
        delete templatePayload._configFileId;
        delete templatePayload.uuid;

        templatePayload.owner = message.owner;
        templatePayload.creator = message.owner;
        templatePayload.topicId = message.schemaTemplateTopicId?.toString();
        templatePayload.messageId = message.id;
        templatePayload.status = ModuleStatus.PUBLISHED;
        templatePayload.config = templatePayload.config || {};
        templatePayload.contentFileId = await DatabaseServer.saveFile(GenerateUUIDv4(), Buffer.from(message.document));

        const template = await DatabaseServer.saveSchemaTemplate(templatePayload);
        const schemas = components.schemas || [];
        const schemaObjects = [];
        for (const schema of schemas) {
            delete schema._id;
            delete schema.id;
            schema.topicId = template.topicId;
            schema.category = SchemaCategory.TEMPLATE;
            schema.templateId = template.id;
            schema.templateSchemaId = schema.templateSchemaId || GenerateUUIDv4();
            SchemaHelper.ensureTemplateFieldIds(schema.document);
            schema.status = SchemaStatus.PUBLISHED;
            schema.owner = message.owner;
            schema.creator = message.owner;
            schemaObjects.push(DatabaseServer.createSchema(schema));
        }
        if (schemaObjects.length) {
            await DatabaseServer.saveSchemas(schemaObjects);
        }
        return template;
    }

    /**
     * The caller's instruction for one binding.
     *
     * `templateId` on a detach entry names the binding to detach; on any other entry
     * it names the local template to bind to instead. Those readings coincide in the
     * ordinary case, so match on the id first and fall back to position, which is
     * what a single-binding file (and every file written before this change) relies
     * on.
     */
    private mapSchemaTemplateMetadata(
        metadata: PolicyToolMetadata | null | undefined,
        bindings: any[]
    ): any[] {
        const result: any[] = new Array(bindings.length).fill(undefined);
        const entries = metadata?.schemaTemplates;
        if (!entries?.length) {
            return result;
        }

        // An entry that names a binding claims it, wherever it sits in the list.
        const claimed = new Set<number>();
        bindings.forEach((binding, index) => {
            const entryIndex = entries.findIndex((entry, position) =>
                !claimed.has(position) &&
                entry?.templateId &&
                entry.templateId === binding?.templateId
            );
            if (entryIndex >= 0) {
                result[index] = entries[entryIndex];
                claimed.add(entryIndex);
            }
        });

        // Whatever is left lines up by position. An entry naming some other binding
        // is not up for grabs - it would detach or re-point the wrong template.
        bindings.forEach((_, index) => {
            if (result[index] || claimed.has(index)) {
                return;
            }
            const entry = entries[index];
            if (!entry) {
                return;
            }
            const namesAnotherBinding = entry.templateId &&
                bindings.some((binding) => binding?.templateId === entry.templateId);
            if (!namesAnotherBinding) {
                result[index] = entry;
                claimed.add(index);
            }
        });

        return result;
    }

    /**
     * Resolve every binding independently, keyed by the template id the file was
     * exported with. A template that cannot be resolved is left out rather than
     * failing the whole import: the policy keeps the templates that did resolve, and
     * the rest are detached by schemaTemplateBindingsToDrop.
     */
    public async resolveSchemaTemplates(
        metadata: PolicyToolMetadata | null,
        policy: Policy,
        user: IOwner,
        step: INotificationStep,
        userId: string | null
    ): Promise<void> {
        step.start();
        this.schemaTemplates = new Map<string, SchemaTemplate>();

        const bindings = policy.schemaTemplates || [];
        const overrides = this.mapSchemaTemplateMetadata(metadata, bindings);
        for (let index = 0; index < bindings.length; index++) {
            const binding = bindings[index];
            const sourceTemplateId = binding?.templateId;
            if (!sourceTemplateId) {
                continue;
            }
            const override = overrides[index];
            if (override?.detach) {
                continue;
            }
            const template = await this.resolveSchemaTemplateBinding(binding, override, user, userId);
            if (template) {
                this.schemaTemplates.set(String(sourceTemplateId), template);
            }
        }

        step.complete();
    }

    private async resolveSchemaTemplateBinding(
        binding: any,
        override: any,
        user: IOwner,
        userId: string | null
    ): Promise<SchemaTemplate | null> {
        const isAccessible = (template: SchemaTemplate | null) => !!template &&
            (template.status === ModuleStatus.PUBLISHED || template.owner === user.owner);

        if (override?.templateId) {
            const template = await DatabaseServer.getSchemaTemplateById(override.templateId);
            if (isAccessible(template)) {
                return template;
            }
            throw new Error('Selected schema template is inaccessible');
        }

        // An import that carries a snapshot keeps its binding, and no caller sets
        // metadata.schemaTemplates, so an unpublished but owned template would
        // otherwise never resolve. A clone has no snapshot and is dropped before this
        // runs, so it never reaches here.
        const local = await DatabaseServer.getSchemaTemplateById(binding.templateId);
        if (isAccessible(local)) {
            return local;
        }

        const messageId = override?.templateMessageId || binding.templateMessageId;
        if (messageId) {
            return await this.resolveSchemaTemplateByMessage(messageId, user, userId);
        }
        return null;
    }

    /**
     * A legacy file carries one binding under the singular `schemaTemplate` key.
     * Those files are frozen - anything published to IPFS cannot be rewritten - so
     * the key has to keep being understood. Normalising it here, before the rest of
     * the pipeline runs, is what stops an old policy importing as untemplated with no
     * error at all.
     */
    public normalizeSchemaTemplateBindings(policy: any): void {
        if (!policy) {
            return;
        }
        const legacy = policy.schemaTemplate;
        if (legacy && !policy.schemaTemplates?.length) {
            policy.schemaTemplates = [legacy];
        }
        delete policy.schemaTemplate;
    }

    /** The snapshot half of the same legacy shape. */
    public normalizeSchemaTemplateSnapshots(components: any): void {
        if (!components) {
            return;
        }
        const legacy = components.schemaTemplateSnapshot;
        if (legacy && !components.schemaTemplateSnapshots?.length) {
            components.schemaTemplateSnapshots = [legacy];
        }
        delete components.schemaTemplateSnapshot;
    }

    /**
     * Which bindings cannot survive the import: the ones the caller detached, and the
     * ones with no snapshot to carry them (what a clone produces). Deciding it per
     * binding is what keeps one unresolvable template from costing the policy the
     * rest of them.
     */
    public schemaTemplateBindingsToDrop(
        policy: Policy,
        snapshots: any[] | null | undefined,
        metadata: PolicyToolMetadata | null | undefined
    ): string[] {
        const bindings = policy?.schemaTemplates || [];
        const snapshotTemplateIds = new Set(
            (snapshots || [])
                .map((snapshot) => snapshot?.templateId)
                .filter((templateId) => !!templateId)
                .map((templateId) => String(templateId))
        );

        const overrides = this.mapSchemaTemplateMetadata(metadata, bindings);
        const dropped: string[] = [];
        for (let index = 0; index < bindings.length; index++) {
            const binding = bindings[index];
            const templateId = binding?.templateId;
            if (!templateId) {
                continue;
            }
            const override = overrides[index];
            if (override?.detach || !snapshotTemplateIds.has(String(templateId))) {
                dropped.push(String(templateId));
            }
        }
        return dropped;
    }

    /**
     * Detach the bindings whose template did not resolve, taking their schemas'
     * markers with them. Dropping the binding on its own would leave a policy
     * claiming no template over schemas that still claim one.
     */
    public dropUnresolvedSchemaTemplates(policy: Policy, schemas: Schema[]): void {
        const bindings = policy?.schemaTemplates || [];
        const unresolved = new Set(
            bindings
                .map((binding) => binding?.templateId ? String(binding.templateId) : '')
                .filter((templateId) => !!templateId && !this.schemaTemplates.has(templateId))
        );
        if (!unresolved.size) {
            return;
        }
        policy.schemaTemplates = bindings
            .filter((binding) => !unresolved.has(String(binding?.templateId)));
        this.clearTemplateMetadataFromSchemas(
            (schemas || []).filter((schema) => unresolved.has(String(schema?.templateId)))
        );
    }

    public clearTemplateMetadataFromSchemas(schemas: Schema[]): void {
        for (const schema of schemas) {
            schema.templateId = '';
            schema.templateSchemaId = '';
            SchemaHelper.removeTemplateFieldIds(schema.document);
        }
    }

    /**
     * A template id only means something on the instance that issued it. An imported
     * schema still carries the id of the instance it was exported from, while its
     * binding is re-pointed at the locally resolved template, so the two stop naming
     * the same template. Anything that resolves template locks by comparing them then
     * finds nothing and silently drops every lock, so the schemas have to be
     * re-pointed too.
     *
     * Only the template id is instance-specific. templateSchemaId and the per-field
     * templateFieldId markers are stable by design and are left alone.
     *
     * A schema whose template was detached has no entry in the map and keeps what it
     * has; clearTemplateMetadataFromSchemas is what strips those.
     */
    public remapSchemaTemplateIds(
        schemas: Schema[],
        templatesBySourceId: Map<string, SchemaTemplate>
    ): void {
        if (!templatesBySourceId?.size) {
            return;
        }
        for (const schema of schemas || []) {
            if (!schema?.templateId) {
                continue;
            }
            const localTemplateId = templatesBySourceId
                .get(String(schema.templateId))
                ?.id
                ?.toString();
            if (localTemplateId) {
                schema.templateId = localTemplateId;
            }
        }
    }

    private remapSchemaTemplateSnapshot(
        snapshot: SchemaTemplateSnapshot,
        policy: Policy,
        template: SchemaTemplate
    ): SchemaTemplateSnapshot {
        const next: any = { ...snapshot };
        delete next._id;
        delete next.id;
        delete next.configFileId;
        delete next.schemasFileId;
        delete next._configFileId;
        delete next._schemasFileId;

        const schemaIds = new Map<string, string>();
        for (const item of this.schemasMapping || []) {
            schemaIds.set(item.oldID, item.newID);
        }

        const schemaMap: { [key: string]: string } = {};
        const sourceSchemaMap = next.schemaMap || {};
        for (const [templateSchemaId, schemaId] of Object.entries(sourceSchemaMap)) {
            schemaMap[templateSchemaId] = schemaIds.get(String(schemaId)) || String(schemaId);
        }

        next.policyId = policy.id?.toString();
        next.policyUUID = policy.uuid;
        next.schemaMap = schemaMap;
        next.templateId = template.id?.toString();
        next.templateUUID = template.uuid;
        next.templateName = template.name;
        next.templateVersion = template.version;
        next.templateStatus = template.status;
        next.templateMessageId = template.messageId || next.templateMessageId;

        return next;
    }

    /**
     * Save one snapshot per surviving binding, each re-pointed at the template it
     * resolved to. A binding whose template did not resolve, or whose snapshot did
     * not travel with the file, is dropped here rather than kept half-bound.
     */
    private async saveSchemaTemplateSnapshots(
        policy: Policy,
        snapshots: SchemaTemplateSnapshot[] | null | undefined,
        step: INotificationStep
    ): Promise<void> {
        step.start();

        const snapshotByTemplateId = new Map<string, SchemaTemplateSnapshot>();
        for (const snapshot of snapshots || []) {
            if (snapshot?.templateId) {
                snapshotByTemplateId.set(String(snapshot.templateId), snapshot);
            }
        }

        const bindings: any[] = [];
        for (const binding of policy.schemaTemplates || []) {
            const sourceTemplateId = binding?.templateId ? String(binding.templateId) : '';
            const template = sourceTemplateId
                ? this.schemaTemplates.get(sourceTemplateId)
                : undefined;
            const snapshot = sourceTemplateId
                ? snapshotByTemplateId.get(sourceTemplateId)
                : undefined;
            if (!template || !snapshot) {
                continue;
            }

            const nextSnapshot = this.remapSchemaTemplateSnapshot(snapshot, policy, template);
            const savedSnapshot = await DatabaseServer.saveSchemaTemplateSnapshot(nextSnapshot);
            bindings.push({
                ...binding,
                templateId: template.id?.toString(),
                templateName: template.name,
                templateVersion: template.version,
                templateStatus: template.status,
                templateMessageId: template.messageId || binding.templateMessageId,
                templateStateHash: savedSnapshot.templateStateHash,
                snapshotId: savedSnapshot.id,
                schemaMap: savedSnapshot.schemaMap || {},
                appliedAt: savedSnapshot.appliedAt || new Date().toISOString()
            });
        }

        policy.schemaTemplates = bindings;
        await DatabaseServer.updatePolicy(policy);
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

        /*
         * A file written before the plural shape carries one binding under
         * `policy.schemaTemplate` and one snapshot under `schemaTemplateSnapshot`.
         * Normalise both before anything else reads them, so the rest of the pipeline
         * only ever sees the new shape.
         */
        this.normalizeSchemaTemplateBindings(policy);
        this.normalizeSchemaTemplateSnapshots(options.policyComponents);
        const schemaTemplateSnapshots = options.policyComponents.schemaTemplateSnapshots || [];

        const copySchemas = schemas.map((schema) => structuredClone(schema));

        const user = options.user;
        const versionOfTopicId = options.versionOfTopicId;
        const additionalPolicyConfig = options.additionalPolicyConfig;
        const metadata = options.metadata;
        const logger = options.logger;
        this.importRecords = !!options.importRecords;

        /*
         * Drop a binding whole, not half. saveSchemaTemplateSnapshots rewrites
         * policy.schemaTemplates after the schemas are persisted, so a binding
         * dropped there would leave its schemas still carrying template markers - a
         * policy claiming no template over schemas that do.
         *
         * Deciding it here, before the schemas are written, is what makes the strip
         * persist, and doing it per binding is what keeps one dropped template from
         * stripping the markers of the templates that survived.
         */
        const droppedTemplateIds = this.schemaTemplateBindingsToDrop(
            policy,
            schemaTemplateSnapshots,
            metadata
        );
        if (droppedTemplateIds.length) {
            const dropped = new Set(droppedTemplateIds);
            policy.schemaTemplates = (policy.schemaTemplates || [])
                .filter((binding) => !dropped.has(String(binding?.templateId)));
            this.clearTemplateMetadataFromSchemas(
                schemas.filter((schema) => dropped.has(String(schema?.templateId)))
            );
        }

        // <-- Steps
        const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
        const STEP_RESOLVE_TOPIC = 'Resolve topic';
        const STEP_PUBLISH_SYSTEM_SCHEMAS = 'Publish system schemas';
        const STEP_IMPORT_TOOLS = 'Import tools';
        const STEP_RESOLVE_SCHEMA_TEMPLATE = 'Resolve schema template';
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
        this.notifier.addStep(STEP_RESOLVE_SCHEMA_TEMPLATE, 1);
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
        await this.resolveSchemaTemplates(
            metadata,
            policy,
            user,
            this.notifier.getStep(STEP_RESOLVE_SCHEMA_TEMPLATE),
            userId
        );
        /*
         * A binding can survive the snapshot check above and still fail to resolve to
         * a local template. saveSchemaTemplateSnapshots would then leave it out, so
         * the binding has to go here instead - before the schemas are written - or its
         * schemas keep markers naming a template the policy no longer claims.
         */
        this.dropUnresolvedSchemaTemplates(policy, schemas);
        // The binding is about to point at a local template; the schemas must follow
        // it, and they have to do so before importSchemas persists them.
        this.remapSchemaTemplateIds(schemas, this.schemaTemplates);
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
        const STEP_SAVE_SCHEMA_TEMPLATE = 'Save schema template snapshot';
        const STEP_SAVE_HASH = 'Save hash';
        const STEP_SAVE_SUGGEST = 'Save suggestions';
        // Steps -->
        step.addStep(STEP_SAVE_POLICY);
        step.addStep(STEP_SAVE_TOPIC);
        step.addStep(STEP_SAVE_ARTIFACTS);
        step.addStep(STEP_SAVE_TESTS);
        step.addStep(STEP_SAVE_FORMULAS);
        step.addStep(STEP_SAVE_SCHEMA_TEMPLATE);
        step.addStep(STEP_SAVE_HASH);
        step.addStep(STEP_SAVE_SUGGEST);
        step.start();

        await this.updateUUIDs(policy);

        policy.autoRecordSteps = this.importRecords;

        const row = await this.savePolicy(policy, step.getStep(STEP_SAVE_POLICY));
        await this.saveTopic(row, step.getStep(STEP_SAVE_TOPIC));
        await this.saveArtifacts(row, step.getStep(STEP_SAVE_ARTIFACTS));
        await this.saveTests(row, step.getStep(STEP_SAVE_TESTS));
        await this.saveFormulas(row, step.getStep(STEP_SAVE_FORMULAS));
        await this.saveSchemaTemplateSnapshots(row, schemaTemplateSnapshots, step.getStep(STEP_SAVE_SCHEMA_TEMPLATE));
        await this.saveHash(row, logger, step.getStep(STEP_SAVE_HASH), userId);
        await this.setSuggestionsConfig(row, user, step.getStep(STEP_SAVE_SUGGEST));
        step.complete();

        await this.importTags(row, tags, this.notifier.getStep(STEP_IMPORT_TAGS));
        await this.copyPolicyRecords(row, logger, copySchemas);

        this.notifier.complete();

        const errors = await this.getErrors();
        return { policy: row, errors };
    }

    private async copyPolicyRecords(policy: Policy, logger: PinoLogger, copySchemas: Schema[]): Promise<void> {
        if (!this.importRecords) {
            return;
        }

        try {
            const targetPolicyId = policy?.id?.toString?.();
            if (!targetPolicyId) {
                return;
            }

            const sourceRecordsTopicId = policy.recordsTopicId;
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
                try {
                    await MessageServer.loadDocument(msg, null, {});
                } catch (e: any) {
                    await logger.error(
                        `copyPolicyRecords: failed to load record zip from IPFS for recordId=${msg.recordId}: ${e?.message || e}`,
                        ['POLICY_IMPORT'],
                        null
                    );
                    continue;
                }

                const zipBuffer = msg.getDocument?.() as Buffer | undefined;
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
                    if (!startRecotdTime) {
                        startRecotdTime = (Number(msg.time) || Date.now()) - 3000;
                    }
                    const clonedRecord = {
                        uuid: GenerateUUIDv4(),
                        policyId: targetPolicyId,
                        method: recordFromZip.method || msg.method,
                        action: recordFromZip.action || msg.actionName,
                        time: msg.time,
                        user: recordFromZip.user || msg.user,
                        target: recordFromZip.target || msg.target,
                        document: recordFromZip.document ?? null,
                        results: parsedResults.length ? parsedResults : null,
                        userRole: recordFromZip.userRole || null,
                        importedFrom: 'ipfs',
                        copiedRecordId: msg.recordId,
                        recordActionId: msg.recordActionId
                    } as FilterObject<Record>;

                    await DatabaseServer.createRecord(clonedRecord);
                }
            }

            const startRecord = {
                uuid: GenerateUUIDv4(),
                policyId: targetPolicyId,
                method: RecordMethod.Start,
                action: null,
                time: startRecotdTime || Date.now(),
                user: policy.owner,
                target: null,
                document: null,
                importedFrom: 'ipfs',
                results: copySchemas.map((schema) => {
                    let id: string;

                    if (schema.contextURL) {
                        id = schema.contextURL + schema.iri;
                    } else if (schema.iri) {
                        id = schema.iri;
                    } else {
                        id = schema.uuid;
                    }

                    return {
                        id,
                        type: 'schema',
                        document: schema.document
                    }
                }),
            } as FilterObject<Record>;
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
