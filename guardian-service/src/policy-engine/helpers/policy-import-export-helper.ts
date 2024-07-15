import { BlockType, ConfigType, GenerateUUIDv4, IOwner, IRootConfig, ModuleStatus, PolicyToolMetadata, PolicyType, SchemaCategory, SchemaEntity, SchemaStatus, TagType, TopicType } from '@guardian/interfaces';
import { DataBaseHelper, DatabaseServer, IPolicyComponents, Logger, MessageAction, MessageServer, MessageType, Policy, PolicyMessage, PolicyTool, regenerateIds, replaceAllEntities, replaceAllVariables, replaceArtifactProperties, Schema, SchemaFields, Tag, Token, Topic, TopicConfig, TopicHelper, Users } from '@guardian/common';
import { ImportArtifactResult, ImportTokenMap, ImportTokenResult, ImportToolMap, ImportToolResults, ImportSchemaMap, ImportSchemaResult, importArtifactsByFiles, importSubTools, importTokensByFiles, publishSystemSchemas, importTag, SchemaImportExportHelper } from '../../api/helpers/index.js';
import { PolicyConverterUtils } from '../policy-converter-utils.js';
import { INotifier, emptyNotifier } from '../../helpers/notifier.js';
import { HashComparator, PolicyLoader } from '../../analytics/index.js';

export interface ImportPolicyResult {
    /**
     * New Policy
     */
    policy: Policy,
    /**
     * Errors
     */
    errors: any[]
}

export class PolicyImport {
    private readonly demo: boolean;
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
    private topicId: string;

    constructor(demo: boolean, notifier: INotifier) {
        this.demo = demo;
        this.notifier = notifier;
    }

    private async resolveAccount(user: IOwner): Promise<IRootConfig> {
        this.notifier.start('Resolve Hedera account');
        const users = new Users();
        const userAccount = await users.getUser(user.username);
        this.root = await users.getHederaAccount(user.creator);
        this.topicHelper = new TopicHelper(
            this.root.hederaAccountId,
            this.root.hederaAccountKey,
            this.root.signOptions
        );
        this.messageServer = new MessageServer(
            this.root.hederaAccountId,
            this.root.hederaAccountKey,
            this.root.signOptions
        );
        this.owner = user;
        return this.root;
    }

    private async dataPreparation(
        policy: Policy,
        user: IOwner,
        additionalPolicyConfig: Partial<Policy> | null
    ): Promise<Policy> {
        delete policy._id;
        delete policy.id;
        delete policy.messageId;
        delete policy.version;
        delete policy.previousVersion;
        delete policy.createDate;
        policy.uuid = GenerateUUIDv4();
        policy.creator = user.creator;
        policy.owner = user.owner;
        policy.status = this.demo ? PolicyType.DEMO : PolicyType.DRAFT;
        policy.instanceTopicId = null;
        policy.synchronizationTopicId = null;
        policy.name = additionalPolicyConfig?.name || policy.name;
        policy.topicDescription = additionalPolicyConfig?.topicDescription || policy.topicDescription;
        policy.description = additionalPolicyConfig?.description || policy.description;
        policy.policyTag = additionalPolicyConfig?.policyTag || 'Tag_' + Date.now();
        return policy;
    }

    private async createPolicyTopic(policy: Policy, versionOfTopicId: string, user: IOwner) {
        this.notifier.completedAndStart('Resolve topic');
        this.parentTopic = await TopicConfig.fromObject(
            await DatabaseServer.getTopicByType(user.creator, TopicType.UserTopic), true
        );

        if (this.demo) {
            this.topicRow = new TopicConfig({
                name: policy.name || TopicType.PolicyTopic,
                description: policy.topicDescription || TopicType.PolicyTopic,
                owner: user.creator,
                policyId: null,
                policyUUID: null,
                topicId: GenerateUUIDv4()
            }, null, null)
        } else if (versionOfTopicId) {
            this.topicRow = await TopicConfig.fromObject(
                await DatabaseServer.getTopicById(versionOfTopicId), true
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
                owner: user.creator,
                policyId: null,
                policyUUID: null
            });
            await this.topicRow.saveKeys();
            await DatabaseServer.saveTopic(this.topicRow.toObject());

            this.notifier.completedAndStart('Link topic and policy');
            await this.topicHelper.twoWayLink(
                this.topicRow,
                this.parentTopic,
                createPolicyMessage.getId(),
                this.owner.id
            );
        }

        policy.topicId = this.topicRow.topicId;
        this.topicId = policy.topicId;
    }

    private async publishSystemSchemas(versionOfTopicId: string, user: IOwner) {
        if (this.demo) {
            const systemSchemas = await PolicyImportExportHelper.getSystemSchemas();
            this.schemasResult = await SchemaImportExportHelper.importSchemaByFiles(
                systemSchemas,
                user,
                {
                    category: SchemaCategory.SYSTEM,
                    topicId: this.topicRow.topicId,
                    skipGenerateId: false,
                    demo: this.demo
                },
                this.notifier
            );
        } else if (versionOfTopicId) {
            this.notifier.completedAndStart('Skip publishing schemas');
        } else {
            this.notifier.completedAndStart('Publishing schemas');
            const systemSchemas = await PolicyImportExportHelper.getSystemSchemas();
            this.notifier.info(`Found ${systemSchemas.length} schemas`);
            this.messageServer.setTopicObject(this.topicRow);
            await publishSystemSchemas(systemSchemas, this.messageServer, user, this.notifier);
        }
    }

    private async importTools(
        tools: PolicyTool[],
        metadata: PolicyToolMetadata | null,
        user: IOwner
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

        this.toolsResult = await importSubTools(this.root, tools, user, this.notifier);

        for (const toolMapping of this.toolsMapping) {
            const toolByMessageId = this.toolsResult.tools.find((tool) => tool.messageId === toolMapping.messageId);
            toolMapping.newHash = toolByMessageId?.hash;
        }

        this.notifier.sub(false);
    }

    private async importTokens(tokens: Token[], user: IOwner) {
        this.tokensResult = await importTokensByFiles(user, tokens, this.notifier);
        this.tokenMapping = this.tokensResult.tokenMap;
    }

    private async importSchemas(schemas: Schema[], user: IOwner) {
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
                demo: this.demo
            },
            this.notifier
        );
        this.schemasMapping = this.schemasResult.schemasMap;
    }

    private async importArtifacts(artifacts: any[], user: IOwner) {
        this.artifactsResult = await importArtifactsByFiles(user, artifacts, this.notifier);
        this.artifactsMapping = this.artifactsResult.artifactsMap;
    }

    private async updateUUIDs(policy: Policy): Promise<Policy> {
        await PolicyImportExportHelper.replaceConfig(
            policy,
            this.schemasMapping,
            this.artifactsMapping,
            this.tokenMapping,
            this.toolsMapping
        );
        return policy;
    }

    private async savePolicy(policy: Policy): Promise<Policy> {
        this.notifier.completedAndStart('Saving policy in DB');
        const model = new DataBaseHelper(Policy).create(policy as Policy);
        return await new DataBaseHelper(Policy).save(model);
    }

    private async saveTopic(policy: Policy) {
        if(!this.demo) {
            this.notifier.completedAndStart('Saving topic in DB');
            const row = await new DataBaseHelper(Topic).findOne({ topicId: this.topicRow.topicId })
            row.policyId = policy.id.toString();
            row.policyUUID = policy.uuid;
            await new DataBaseHelper(Topic).update(row);
        }
    }

    private async saveArtifacts(policy: Policy) {
        this.notifier.completedAndStart('Saving artifacts in DB');
        for (const addedArtifact of this.artifactsResult.artifacts) {
            addedArtifact.policyId = policy.id;
            await DatabaseServer.saveArtifact(addedArtifact);
        }
    }

    private async saveHash(policy: Policy) {
        this.notifier.completedAndStart('Updating hash');
        await PolicyImportExportHelper.updatePolicyComponents(policy);
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

    private async getErrors() {
        const errors: any[] = [];
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
        return errors;
    }

    public async import(
        policyComponents: IPolicyComponents,
        user: IOwner,
        versionOfTopicId: string,
        additionalPolicyConfig: Partial<Policy> | null,
        metadata: PolicyToolMetadata | null,
    ): Promise<ImportPolicyResult> {
        console.log('---- import ---')

        const { policy, tokens, schemas, artifacts, tags, tools } = policyComponents;
        console.log('---- resolveAccount ---')
        await this.resolveAccount(user);
        console.log('---- dataPreparation ---')
        await this.dataPreparation(policy, user, additionalPolicyConfig);
        console.log('---- createPolicyTopic ---')
        await this.createPolicyTopic(policy, versionOfTopicId, user);
        console.log('---- publishSystemSchemas ---')
        await this.publishSystemSchemas(versionOfTopicId, user);
        console.log('---- importTools ---')
        await this.importTools(tools, metadata, user);
        console.log('---- importTokens ---')
        await this.importTokens(tokens, user);
        console.log('---- importSchemas ---')
        await this.importSchemas(schemas, user);
        console.log('---- importArtifacts ---')
        await this.importArtifacts(artifacts, user);
        console.log('---- updateUUIDs ---')
        await this.updateUUIDs(policy);

        console.log('---- savePolicy ---', policy)
        const row = await this.savePolicy(policy);
        console.log('---- saveTopic ---')
        await this.saveTopic(row);
        console.log('---- saveArtifacts ---')
        await this.saveArtifacts(row);
        console.log('---- saveHash ---')
        await this.saveHash(row);
        console.log('---- setSuggestionsConfig ---')
        await this.setSuggestionsConfig(row, user);
        console.log('---- importTags ---')
        await this.importTags(row, tags);

        const errors = await this.getErrors();
        return { policy: row, errors };
    }
}

/**
 * Policy import export helper
 */
export class PolicyImportExportHelper {
    /**
     * Get system schemas
     *
     * @returns Array of schemas
     */
    public static async getSystemSchemas(): Promise<Schema[]> {
        const schemas = await Promise.all([
            DatabaseServer.getSystemSchema(SchemaEntity.POLICY),
            DatabaseServer.getSystemSchema(SchemaEntity.MINT_TOKEN),
            DatabaseServer.getSystemSchema(SchemaEntity.MINT_NFTOKEN),
            DatabaseServer.getSystemSchema(SchemaEntity.WIPE_TOKEN),
            DatabaseServer.getSystemSchema(SchemaEntity.ISSUER),
            DatabaseServer.getSystemSchema(SchemaEntity.USER_ROLE),
            DatabaseServer.getSystemSchema(SchemaEntity.CHUNK),
            DatabaseServer.getSystemSchema(SchemaEntity.ACTIVITY_IMPACT),
            DatabaseServer.getSystemSchema(SchemaEntity.TOKEN_DATA_SOURCE)
        ]);

        for (const schema of schemas) {
            if (!schema) {
                throw new Error('One of system schemas is not exist');
            }
        }
        return schemas;
    }

    /**
     * Import policy
     * @param policyToImport
     * @param user
     * @param versionOfTopicId
     * @param additionalPolicyConfig
     * @param metadata
     * @param demo
     * @param notifier
     *
     * @returns import result
     */
    public static async importPolicy(
        policyToImport: IPolicyComponents,
        user: IOwner,
        versionOfTopicId: string,
        additionalPolicyConfig: Partial<Policy> = null,
        metadata: PolicyToolMetadata = null,
        demo: boolean = false,
        notifier: INotifier = emptyNotifier()
    ): Promise<ImportPolicyResult> {
        const helper = new PolicyImport(demo, notifier);
        return helper.import(
            policyToImport,
            user,
            versionOfTopicId,
            additionalPolicyConfig,
            metadata
        )
    }

    /**
     * Replace config
     * @param policy
     * @param schemasMap
     */
    public static async replaceConfig(
        policy: Policy,
        schemasMap: ImportSchemaMap[],
        artifactsMap: Map<string, string>,
        tokenMap: any[],
        tools: { oldMessageId: string, messageId: string, oldHash: string, newHash?: string }[]
    ) {
        if (await new DataBaseHelper(Policy).findOne({ name: policy.name })) {
            policy.name = policy.name + '_' + Date.now();
        }

        for (const item of schemasMap) {
            replaceAllEntities(policy.config, SchemaFields, item.oldIRI, item.newIRI);
            replaceAllVariables(policy.config, 'Schema', item.oldIRI, item.newIRI);

            if (policy.projectSchema === item.oldIRI) {
                policy.projectSchema = item.newIRI
            }
        }

        for (const item of tokenMap) {
            replaceAllEntities(policy.config, ['tokenId'], item.oldTokenID, item.newTokenID);
            replaceAllVariables(policy.config, 'Token', item.oldTokenID, item.newTokenID);
        }

        for (const item of tools) {
            if (!item.newHash || !item.messageId) {
                continue;
            }
            replaceAllEntities(policy.config, ['messageId'], item.oldMessageId, item.messageId);
            replaceAllEntities(policy.config, ['hash'], item.oldHash, item.newHash);
        }

        // compatibility with older versions
        policy = PolicyConverterUtils.PolicyConverter(policy);
        policy.codeVersion = PolicyConverterUtils.VERSION;
        regenerateIds(policy.config);

        replaceArtifactProperties(policy.config, 'uuid', artifactsMap);
    }

    /**
     * Convert errors to string
     * @param errors
     */
    public static errorsMessage(errors: any[]): string {
        const schemas: string[] = [];
        const tools: string[] = [];
        const others: string[] = []
        for (const e of errors) {
            if (e.type === 'schema') {
                schemas.push(e.name);
            } else if (e.type === 'tool') {
                tools.push(e.name);
            } else {
                others.push(e.name);
            }
        }
        let message: string = 'Failed to import components:';
        if (schemas.length) {
            message += ` schemas: ${JSON.stringify(schemas)};`
        }
        if (tools.length) {
            message += ` tools: ${JSON.stringify(tools)};`
        }
        if (others.length) {
            message += ` others: ${JSON.stringify(others)};`
        }
        return message;
    }

    public static findTools(block: any, result: Set<string>) {
        if (!block) {
            return;
        }
        if (block.blockType === BlockType.Tool) {
            if (block.messageId && typeof block.messageId === 'string') {
                result.add(block.messageId);
            }
        } else {
            if (Array.isArray(block.children)) {
                for (const child of block.children) {
                    PolicyImportExportHelper.findTools(child, result);
                }
            }
        }
    }

    /**
     * Update policy components
     * @param policy
     */
    public static async updatePolicyComponents(policy: Policy): Promise<Policy> {
        try {
            const raw = await PolicyLoader.load(policy.id.toString());
            const compareModel = await PolicyLoader.create(raw, HashComparator.options);
            const { hash, hashMap } = await HashComparator.createHashMap(compareModel);
            policy.hash = hash;
            policy.hashMap = hashMap;
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE, HASH']);
        }
        const toolIds = new Set<string>()
        PolicyImportExportHelper.findTools(policy.config, toolIds);
        const tools = await DatabaseServer.getTools({
            status: ModuleStatus.PUBLISHED,
            messageId: { $in: Array.from(toolIds.values()) }
        }, { fields: ['name', 'topicId', 'messageId', 'tools'] });
        const list = [];
        for (const row of tools) {
            list.push({
                name: row.name,
                topicId: row.topicId,
                messageId: row.messageId
            })
            if (row.tools) {
                for (const subTool of row.tools) {
                    list.push(subTool);
                }
            }
        }
        policy.tools = list;
        policy = await DatabaseServer.updatePolicy(policy);

        return policy;
    }
}
