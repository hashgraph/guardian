import { DatabaseServer, IToolComponents, MessageAction, MessageServer, MessageType, PolicyTool, replaceAllEntities, replaceAllVariables, SchemaFields, TagMessage, ToolImportExport, ToolMessage, TopicConfig, TopicHelper, Users } from '@guardian/common';
import { BlockType, GenerateUUIDv4, IRootConfig, ModuleStatus, PolicyToolMetadata, SchemaCategory, SchemaStatus, TagType, TopicType } from '@guardian/interfaces';
import { INotifier } from '../../helpers/notifier.js';
import { importTag } from './tag-import-export-helper.js';
import { importSchemaByFiles } from './schema-import-export-helper.js';

/**
 * Import Result
 */
interface ImportResult {
    /**
     * Tool
     */
    tool: PolicyTool;
    /**
     * Errors
     */
    errors: any[];
}

/**
 * Import Results
 */
interface ImportResults {
    /**
     * Tool
     */
    tools: PolicyTool[];
    /**
     * Errors
     */
    errors: any[];
}

/**
 * Replace config
 * @param tool
 * @param schemasMap
 */
export async function replaceConfig(
    tool: PolicyTool,
    schemasMap: any[],
    tools: { oldMessageId: string, messageId: string, oldHash: string, newHash?: string }[]
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
    notifier: INotifier,
): Promise<ImportResults> {
    if (!messages?.length) {
        return { tools: [], errors: [] };
    }

    const errors: any[] = [];
    const tools: any[] = [];
    for (const message of messages) {
        try {
            notifier.completedAndStart(`Import tool: ${message.name}`);
            const importResult = await importToolByMessage(
                hederaAccount,
                message.messageId,
                notifier
            );
            if (importResult.tool) {
                tools.push(importResult.tool);
            }
            if (importResult.errors) {
                for (const error of importResult.errors) {
                    errors.push(error);
                }
            }
        } catch (error) {
            errors.push({
                type: 'tool',
                name: message.name,
                messageId: message.messageId,
                error: 'Invalid tool'
            });
        }
    }

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
export async function previewToolByMessage(messageId: string): Promise<IToolComponents> {
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
    const message = await MessageServer.getMessage<ToolMessage>(messageId);
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

/**
 * Import tool by message
 * @param owner
 * @param messages
 * @param notifier
 */
export async function importToolByMessage(
    hederaAccount: IRootConfig,
    messageId: string,
    notifier: INotifier
): Promise<ImportResult> {
    notifier.completedAndStart('Load tool file');

    const messageServer = new MessageServer(
        hederaAccount.hederaAccountId,
        hederaAccount.hederaAccountKey,
        hederaAccount.signOptions
    );
    if (!messageId || typeof messageId !== 'string') {
        throw new Error('Invalid Message Id');
    }
    messageId = messageId.trim();
    const message = await messageServer.getMessage<ToolMessage>(messageId);
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
            return {
                tool: oldTool,
                errors: []
            };
        } else {
            throw new Error('Incorrect file hash');
        }
    }

    notifier.completedAndStart('Parse tool file');

    const components = await ToolImportExport.parseZipFile(message.document);

    // Import Tools
    const toolsResults = await importSubTools(hederaAccount, components.tools, notifier);

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

    notifier.completedAndStart('Import tool schemas');

    if (Array.isArray(components.schemas)) {
        for (const schema of components.schemas) {
            const schemaObject = DatabaseServer.createSchema(schema);
            components.tool.creator = message.owner;
            components.tool.owner = message.owner;
            components.tool.topicId = message.topicId.toString();
            schemaObject.status = SchemaStatus.PUBLISHED;
            schemaObject.category = SchemaCategory.TOOL;
            await DatabaseServer.saveSchema(schemaObject);
        }
    }

    const toolTags = components.tags?.filter((t: any) => t.entity === TagType.Tool) || [];
    if (message.tagsTopicId) {
        const tagMessages = await messageServer.getMessages<TagMessage>(
            message.tagsTopicId,
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
    notifier.completedAndStart('Import tool tags');

    await importTag(toolTags, result.id.toString());

    const errors: any[] = [];
    if (toolsResults.errors) {
        for (const error of toolsResults.errors) {
            errors.push(error);
        }
    }

    return {
        tool: result,
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
 * Import tool by file
 * @param components
 */
export async function importToolByFile(
    owner: string,
    components: IToolComponents,
    notifier: INotifier,
    metadata?: PolicyToolMetadata
): Promise<ImportResult> {
    notifier.start('Import tool');

    const {
        tool,
        tags,
        tools,
        schemas
    } = components;

    notifier.completedAndStart('Resolve Hedera account');
    const users = new Users();
    const root = await users.getHederaAccount(owner);

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
    delete tool.createDate;
    tool.uuid = GenerateUUIDv4();
    tool.creator = owner;
    tool.owner = owner;
    tool.status = ModuleStatus.DRAFT;

    await updateToolConfig(tool);

    notifier.completedAndStart('Create topic');
    const parent = await TopicConfig.fromObject(
        await DatabaseServer.getTopicByType(owner, TopicType.UserTopic), true
    );
    const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
    const topic = await topicHelper.create({
        type: TopicType.ToolTopic,
        name: tool.name || TopicType.ToolTopic,
        description: tool.description || TopicType.ToolTopic,
        owner,
        targetId: null,
        targetUUID: null
    }, { admin: true, submit: true });
    await topic.saveKeys();

    notifier.completedAndStart('Create tool in Hedera');
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
    const message = new ToolMessage(MessageType.Tool, MessageAction.CreateTool);
    message.setDocument(tool);
    const messageStatus = await messageServer
        .setTopicObject(parent)
        .sendMessage(message);

    notifier.completedAndStart('Link topic and tool');
    await topicHelper.twoWayLink(topic, parent, messageStatus.getId());

    await DatabaseServer.saveTopic(topic.toObject());
    tool.topicId = topic.topicId;
    await DatabaseServer.updateTool(tool);

    if (Array.isArray(schemas)) {
        for (const schema of schemas) {
            const schemaObject = DatabaseServer.createSchema(schema);
            schemaObject.category = SchemaCategory.TOOL;
            await DatabaseServer.saveSchema(schemaObject);
        }
    }

    // Import Tools
    notifier.completedAndStart('Import sub-tools');
    notifier.sub(true);
    const toolsResult = await importSubTools(root, tools, notifier);
    notifier.sub(true);

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
    )) as { name: string; iri: string }[];

    // Import Schemas
    const schemasResult = await importSchemaByFiles(
        SchemaCategory.TOOL,
        owner,
        schemas,
        tool.topicId,
        notifier,
        false,
        toolsSchemas
    );
    const schemasMap = schemasResult.schemasMap;

    notifier.completedAndStart('Saving in DB');

    // Replace id
    await replaceConfig(tool, schemasMap, toolsMapping);

    const item = await DatabaseServer.createTool(tool);
    const _topicRow = await DatabaseServer.getTopicById(topic.topicId);
    _topicRow.targetId = item.id.toString();
    _topicRow.targetUUID = item.uuid;
    await DatabaseServer.updateTopic(_topicRow);

    notifier.completedAndStart('Import tags');
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

    notifier.completed();

    return {
        tool: item,
        errors
    };
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
    tool.tools = list;

    return tool;
}
