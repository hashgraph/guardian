import {
    DatabaseServer,
    IToolComponents,
    MessageAction,
    MessageServer,
    MessageType,
    PolicyTool,
    TagMessage,
    ToolImportExport,
    ToolMessage
} from '@guardian/common';
import { BlockType, GenerateUUIDv4, IRootConfig, ModuleStatus, SchemaCategory, SchemaStatus, TagType } from '@guardian/interfaces';
import { INotifier } from '@helpers/notifier';
import { importTag } from './tag-import-export-helper';

/**
 * Import Result
 */
interface ImportResult {
    /**
     * Errors
     */
    errors: any[];
}

/**
 * Import tools by messages
 * @param owner
 * @param messages
 * @param notifier
 */
export async function importToolsByPolicy(
    hederaAccount: IRootConfig,
    messages: PolicyTool[] = [],
    notifier: INotifier
): Promise<ImportResult> {
    const errors: any[] = [];
    notifier.start('Import tools');

    for (const message of messages) {
        try {
            notifier.start(`Import tool: ${message.name}`);
            await importToolByMessage(hederaAccount, message.messageId, notifier);
        } catch (error) {
            errors.push({
                type: 'tool',
                hash: message.uuid,
                name: message.name,
                error: 'Invalid tool'
            });
        }
    }

    notifier.completed();
    return { errors };
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
): Promise<PolicyTool> {
    notifier.start('Load from IPFS');
    const messageServer = new MessageServer(
        hederaAccount.hederaAccountId,
        hederaAccount.hederaAccountKey
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
            return oldTool;
        } else {
            throw new Error('Incorrect file hash');
        }
    }

    notifier.completedAndStart('File parsing');
    const components = await ToolImportExport.parseZipFile(message.document);

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
    await importTag(toolTags, result.id.toString());

    notifier.completed();

    return result;
}

/**
 * Import tool by file
 * @param components
 */
export async function importToolByFile(
    owner: string,
    components: IToolComponents
): Promise<PolicyTool> {
    const {
        tool,
        tags,
        schemas
    } = components;

    delete tool._id;
    delete tool.id;
    delete tool.messageId;
    delete tool.createDate;
    tool.uuid = GenerateUUIDv4();
    tool.creator = owner;
    tool.owner = owner;
    tool.status = ModuleStatus.DRAFT;

    if (await DatabaseServer.getTool({ name: tool.name })) {
        tool.name = tool.name + '_' + Date.now();
    }

    await updateToolConfig(tool);
    const item = await DatabaseServer.createTool(tool);

    if (Array.isArray(schemas)) {
        for (const schema of schemas) {
            const schemaObject = DatabaseServer.createSchema(schema);
            schemaObject.category = SchemaCategory.TOOL;
            await DatabaseServer.saveSchema(schemaObject);
        }
    }

    if (Array.isArray(tags)) {
        const toolTags = tags.filter((t: any) => t.entity === TagType.Tool);
        await importTag(toolTags, item.id.toString());
    }

    return item;
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
    }, {
        fields: ['name', 'topicId', 'messageId']
    });
    tool.tools = tools.map((row) => {
        return {
            name: row.name,
            topicId: row.topicId,
            messageId: row.messageId
        }
    })

    return tool;
}