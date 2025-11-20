import { BlockType, GenerateUUIDv4, IOwner, IRootConfig, ModuleStatus, PolicyToolMetadata, SchemaCategory, SchemaStatus, TagType, TopicType } from '@guardian/interfaces';
import { DatabaseServer, INotificationStep, IToolComponents, MessageAction, MessageServer, MessageType, PolicyTool, replaceAllEntities, replaceAllVariables, SchemaFields, TagMessage, ToolImportExport, ToolMessage, TopicConfig, TopicHelper, Users } from '@guardian/common';
import { importTag } from '../tag/tag-import-helper.js';
import { SchemaImportExportHelper } from '../schema/schema-import-helper.js';
import { ImportToolMap, ImportToolResult, ImportToolResults } from './tool-import.interface.js';

/**
 * Import tools by messages
 * @param owner
 * @param messages
 * @param notifier
 */
export async function importSubTools(
    hederaAccount: IRootConfig,
    messages: {
        name?: string,
        messageId?: string
    }[],
    user: IOwner,
    notifier: INotificationStep,
    userId: string | null
): Promise<ImportToolResults> {
    notifier.start();

    if (!messages?.length) {
        notifier.complete();
        return { tools: [], errors: [] };
    }

    const errors: any[] = [];
    const tools: any[] = [];
    notifier.setEstimate(messages.length);
    let index = 0;
    for (const message of messages) {
        try {
            const step = notifier.addStep(`${message.name || '-'}`);
            const importResult = await importToolByMessage(
                hederaAccount,
                message.messageId,
                user,
                step,
                userId
            );
            if (importResult.tool) {
                tools.push(importResult.tool);
            }
            if (importResult.errors) {
                for (const error of importResult.errors) {
                    errors.push(error);
                }
            }
            index++;
        } catch (error) {
            errors.push({
                type: 'tool',
                name: message.name,
                messageId: message.messageId,
                error: 'Invalid tool'
            });
        }
    }

    notifier.complete();
    return {
        tools,
        errors
    };
}

/**
 * Import tool by message
 * @param owner
 * @param messages
 * @param notifier
 */
export async function importToolByMessage(
    hederaAccount: IRootConfig,
    messageId: string,
    user: IOwner,
    notifier: INotificationStep,
    userId: string | null
): Promise<ImportToolResult> {
    // <-- Steps
    const STEP_LOAD_FILE = 'Load tool file';
    const STEP_PARSE_FILE = 'Parse tool file';
    const STEP_IMPORT_SCHEMAS = 'Import tool schemas';
    const STEP_IMPORT_TAGS = 'Import tool tags';
    // Steps -->

    notifier.addStep(STEP_LOAD_FILE);
    notifier.addStep(STEP_PARSE_FILE);
    notifier.addStep(STEP_IMPORT_SCHEMAS);
    notifier.addStep(STEP_IMPORT_TAGS);
    notifier.start();

    notifier.startStep(STEP_LOAD_FILE);

    const messageServer = new MessageServer({
        operatorId: hederaAccount.hederaAccountId,
        operatorKey: hederaAccount.hederaAccountKey,
        signOptions: hederaAccount.signOptions
    });
    if (!messageId || typeof messageId !== 'string') {
        throw new Error('Invalid Message Id');
    }
    messageId = messageId.trim();
    const message = await messageServer
        .getMessage<ToolMessage>({
            messageId,
            loadIPFS: true,
            userId,
            interception: null
        });
    if (!message) {
        throw new Error('Invalid Message');
    }
    if (message.type !== MessageType.Tool) {
        throw new Error('Invalid Message Type');
    }
    if (message.action !== MessageAction.PublishTool) {
        throw new Error('Invalid Message Action');
    }
    if (!message.document) {
        throw new Error('File in body is empty');
    }
    const oldTool = await DatabaseServer.getTool({ messageId });
    if (oldTool) {
        if (
            oldTool.hash === message.hash &&
            oldTool.owner === message.owner
        ) {
            notifier.completeStep(STEP_LOAD_FILE);
            notifier.complete();
            return {
                tool: oldTool,
                errors: []
            };
        } else {
            throw new Error('Incorrect file hash');
        }
    }
    notifier.completeStep(STEP_LOAD_FILE);

    notifier.startStep(STEP_PARSE_FILE);
    const components = await ToolImportExport.parseZipFile(message.document);

    // Import Tools
    const toolsResults = await importSubTools(hederaAccount, components.tools, user, notifier, userId);

    delete components.tool._id;
    delete components.tool.id;

    components.tool.hash = message.hash;
    components.tool.uuid = message.uuid;
    components.tool.creator = message.owner;
    components.tool.owner = message.owner;
    components.tool.topicId = message.topicId.toString();
    components.tool.messageId = message.id;
    components.tool.status = ModuleStatus.PUBLISHED;

    await updateToolConfig(components.tool);
    const result = await DatabaseServer.createTool(components.tool);
    notifier.completeStep(STEP_PARSE_FILE);

    notifier.startStep(STEP_IMPORT_SCHEMAS);
    if (Array.isArray(components.schemas)) {
        const schemaObjects = []

        for (const schema of components.schemas) {
            const schemaObject = DatabaseServer.createSchema(schema);
            components.tool.creator = message.owner;
            components.tool.owner = message.owner;
            components.tool.topicId = message.topicId.toString();
            schemaObject.status = SchemaStatus.PUBLISHED;
            schemaObject.category = SchemaCategory.TOOL;

            schemaObjects.push(schemaObject);
        }

        await DatabaseServer.saveSchemas(schemaObjects);
    }

    const toolTags = components.tags?.filter((t: any) => t.entity === TagType.Tool) || [];
    if (message.tagsTopicId) {
        const tagMessages = await messageServer.getMessages<TagMessage>(
            message.tagsTopicId,
            userId,
            MessageType.Tag,
            MessageAction.PublishTag
        );
        for (const tag of tagMessages) {
            if (tag.entity === TagType.Tool && tag.target === messageId) {
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
    notifier.completeStep(STEP_IMPORT_SCHEMAS);

    notifier.startStep(STEP_IMPORT_TAGS);
    await importTag(toolTags, result.id.toString());

    const errors: any[] = [];
    if (toolsResults.errors) {
        for (const error of toolsResults.errors) {
            errors.push(error);
        }
    }
    notifier.completeStep(STEP_IMPORT_TAGS);

    notifier.complete();
    return {
        tool: result,
        errors
    };
}

/**
 * Check and update config file
 * @param tool
 *
 * @returns tool
 */
export async function updateToolConfig(tool: PolicyTool): Promise<PolicyTool> {
    tool.config = tool.config || {};
    tool.config.permissions = tool.config.permissions || [];
    tool.config.children = tool.config.children || [];
    tool.config.events = tool.config.events || [];
    tool.config.artifacts = tool.config.artifacts || [];
    tool.config.variables = tool.config.variables || [];
    tool.config.inputEvents = tool.config.inputEvents || [];
    tool.config.outputEvents = tool.config.outputEvents || [];
    tool.config.innerEvents = tool.config.innerEvents || [];

    const toolIds = new Set<string>()
    findSubTools(tool.config, toolIds, true);
    const tools = await DatabaseServer.getTools({
        status: ModuleStatus.PUBLISHED,
        messageId: { $in: Array.from(toolIds.values()) }
    }, { fields: ['name', 'version', 'topicId', 'messageId', 'tools'] });
    const list = [];
    for (const row of tools) {
        list.push({
            name: row.name,
            version: row.version,
            topicId: row.topicId,
            messageId: row.messageId
        })
        if (row.tools) {
            for (const subTool of row.tools) {
                list.push(subTool);
            }
        }
    }
    tool.tools = list;

    return tool;
}

export function findSubTools(block: any, result: Set<string>, isRoot: boolean = false) {
    if (!block) {
        return;
    }
    if (block.blockType === BlockType.Tool && !isRoot) {
        if (block.messageId && typeof block.messageId === 'string') {
            result.add(block.messageId);
        }
    } else {
        if (Array.isArray(block.children)) {
            for (const child of block.children) {
                findSubTools(child, result);
            }
        }
    }
}

/**
 * Import tool by file
 * @param components
 */
export async function importToolByFile(
    user: IOwner,
    components: IToolComponents,
    metadata: PolicyToolMetadata,
    notifier: INotificationStep,
    userId: string | null
): Promise<ImportToolResult> {
    // <-- Steps
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_CREATE_TOPIC = 'Create topic';
    const STEP_CREATE_TOOL = 'Create tool in Hedera';
    const STEP_LINK_TOPIC = 'Link topic and tool';
    const STEP_IMPORT_SUB_SCHEMAS = 'Import sub-tools';
    const STEP_IMPORT_SCHEMAS = 'Import schemas';
    const STEP_SAVE = 'Save';
    const STEP_IMPORT_TAGS = 'Import tags';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_ACCOUNT);
    notifier.addStep(STEP_CREATE_TOPIC);
    notifier.addStep(STEP_CREATE_TOOL);
    notifier.addStep(STEP_LINK_TOPIC);
    notifier.addStep(STEP_IMPORT_SUB_SCHEMAS);
    notifier.addStep(STEP_IMPORT_SCHEMAS);
    notifier.addStep(STEP_SAVE);
    notifier.addStep(STEP_IMPORT_TAGS);
    notifier.start();

    const {
        tool,
        tags,
        tools,
        schemas
    } = components;

    notifier.startStep(STEP_RESOLVE_ACCOUNT);
    const users = new Users();
    const root = await users.getHederaAccount(user.creator, userId);

    const toolsMapping: {
        oldMessageId: string;
        messageId: string;
        oldHash: string;
        newHash?: string;
    }[] = [];
    if (metadata?.tools) {
        // tslint:disable-next-line:no-shadowed-variable
        for (const tool of tools) {
            if (
                metadata.tools[tool.messageId] &&
                tool.messageId !== metadata.tools[tool.messageId]
            ) {
                toolsMapping.push({
                    oldMessageId: tool.messageId,
                    messageId: metadata.tools[tool.messageId],
                    oldHash: tool.hash,
                });
                tool.messageId = metadata.tools[tool.messageId];
            }
        }
    }

    delete tool._id;
    delete tool.id;
    delete tool.messageId;
    delete tool.version;
    delete tool.createDate;

    tool.uuid = GenerateUUIDv4();
    tool.creator = user.creator;
    tool.owner = user.owner;
    tool.status = ModuleStatus.DRAFT;

    await updateToolConfig(tool);
    notifier.completeStep(STEP_RESOLVE_ACCOUNT);

    notifier.startStep(STEP_CREATE_TOPIC);
    const parent = await TopicConfig.fromObject(
        await DatabaseServer.getTopicByType(user.owner, TopicType.UserTopic), true, userId
    );
    const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
    const topic = await topicHelper.create({
        type: TopicType.ToolTopic,
        name: tool.name || TopicType.ToolTopic,
        description: tool.description || TopicType.ToolTopic,
        owner: user.owner,
        targetId: null,
        targetUUID: null
    }, userId, { admin: true, submit: true });
    await topic.saveKeys(userId);
    notifier.completeStep(STEP_CREATE_TOPIC);

    notifier.startStep(STEP_CREATE_TOOL);
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    });
    const message = new ToolMessage(MessageType.Tool, MessageAction.CreateTool);
    message.setDocument(tool);
    const messageStatus = await messageServer
        .setTopicObject(parent)
        .sendMessage(message, {
            sendToIPFS: true,
            memo: null,
            userId,
            interception: null
        });

    notifier.completeStep(STEP_CREATE_TOOL);

    notifier.startStep(STEP_LINK_TOPIC);
    await topicHelper.twoWayLink(topic, parent, messageStatus.getId(), userId);

    await DatabaseServer.saveTopic(topic.toObject());
    tool.topicId = topic.topicId;
    await DatabaseServer.updateTool(tool);
    notifier.completeStep(STEP_LINK_TOPIC);

    // Import Tools
    notifier.startStep(STEP_IMPORT_SUB_SCHEMAS);
    const toolsResult = await importSubTools(
        root,
        tools,
        user,
        notifier.getStep(STEP_IMPORT_SUB_SCHEMAS),
        userId
    );

    for (const toolMapping of toolsMapping) {
        const toolByMessageId = toolsResult.tools.find(
            // tslint:disable-next-line:no-shadowed-variable
            (tool) => tool.messageId === toolMapping.messageId
        );
        toolMapping.newHash = toolByMessageId?.hash;
    }

    const toolsSchemas = (await DatabaseServer.getSchemas(
        {
            category: SchemaCategory.TOOL,
            // tslint:disable-next-line:no-shadowed-variable
            topicId: { $in: toolsResult.tools.map((tool) => tool.topicId) },
        },
        {
            fields: ['name', 'iri'],
        }
    ));
    notifier.completeStep(STEP_IMPORT_SUB_SCHEMAS);

    // Import Schemas
    notifier.startStep(STEP_IMPORT_SCHEMAS);
    const schemasResult = await SchemaImportExportHelper.importSchemaByFiles(
        schemas,
        user,
        {
            category: SchemaCategory.TOOL,
            topicId: tool.topicId,
            skipGenerateId: false,
            outerSchemas: toolsSchemas as { name: string; iri: string }[]
        },
        notifier.getStep(STEP_IMPORT_SCHEMAS),
        userId
    );
    const schemasMap = schemasResult.schemasMap;
    notifier.completeStep(STEP_IMPORT_SCHEMAS);

    notifier.startStep(STEP_SAVE);

    // Replace id
    await replaceConfig(tool, schemasMap, toolsMapping);

    const item = await DatabaseServer.createTool(tool);
    const _topicRow = await DatabaseServer.getTopicById(topic.topicId);
    _topicRow.targetId = item.id.toString();
    _topicRow.targetUUID = item.uuid;
    await DatabaseServer.updateTopic(_topicRow);

    notifier.completeStep(STEP_SAVE);

    notifier.startStep(STEP_IMPORT_TAGS);
    if (Array.isArray(tags)) {
        const toolTags = tags.filter((t: any) => t.entity === TagType.Tool);
        await importTag(toolTags, item.id.toString());
    }

    const errors: any[] = [];
    if (schemasResult.errors) {
        for (const error of schemasResult.errors) {
            errors.push(error);
        }
    }
    if (toolsResult.errors) {
        for (const error of toolsResult.errors) {
            errors.push(error);
        }
    }
    notifier.completeStep(STEP_IMPORT_TAGS);
    notifier.complete();

    return {
        tool: item,
        errors
    };
}

/**
 * Convert errors to string
 * @param errors
 */
export function importToolErrors(errors: any[]): string {
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

/**
 * Replace config
 * @param tool
 * @param schemasMap
 */
export async function replaceConfig(
    tool: PolicyTool,
    schemasMap: any[],
    tools: ImportToolMap[]
) {
    if (await DatabaseServer.getTool({ name: tool.name })) {
        tool.name = tool.name + '_' + Date.now();
    }

    for (const item of schemasMap) {
        replaceAllEntities(tool.config, SchemaFields, item.oldIRI, item.newIRI);
        replaceAllVariables(tool.config, 'Schema', item.oldIRI, item.newIRI);
    }

    for (const item of tools) {
        if (!item.newHash || !item.messageId) {
            continue;
        }
        replaceAllEntities(tool.config, ['messageId'], item.oldMessageId, item.messageId);
        replaceAllEntities(tool.config, ['hash'], item.oldHash, item.newHash);
    }
}

/**
 * Import tool by message
 * @param owner
 * @param messages
 * @param notifier
 */
export async function previewToolByMessage(messageId: string, userId: string | null): Promise<IToolComponents> {
    const oldTool = await DatabaseServer.getTool({ messageId });
    if (oldTool) {
        const subSchemas = await DatabaseServer.getSchemas({ topicId: oldTool.topicId });
        return {
            tool: oldTool,
            schemas: subSchemas,
            tags: [],
            tools: []
        }
    }

    messageId = messageId.trim();
    const message = await MessageServer
        .getMessage<ToolMessage>({
            messageId,
            loadIPFS: true,
            userId,
            interception: null
        });

    if (!message) {
        throw new Error('Invalid Message');
    }
    if (message.type !== MessageType.Tool) {
        throw new Error('Invalid Message Type');
    }
    if (message.action !== MessageAction.PublishTool) {
        throw new Error('Invalid Message Action');
    }
    if (!message.document) {
        throw new Error('File in body is empty');
    }

    return await ToolImportExport.parseZipFile(message.document);
}
