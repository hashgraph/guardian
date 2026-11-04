import { BlockType, GenerateUUIDv4, IOwner, IRootConfig, ModelHelper, ModuleStatus, PolicyToolMetadata, SchemaCategory, SchemaStatus, TagType, TopicType } from '@guardian/interfaces';
import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { INotificationStep } from '@guardian/common/notification/notification-step.interface';
import { IToolComponents, ToolImportExport } from '@guardian/common/import-export/tool';
import { PolicyTool } from '@guardian/common/entity/tool';
import { replaceAllEntities, replaceAllVariables, SchemaFields } from '@guardian/common/helpers/utils';
import { Hashing } from '@guardian/common/helpers/hashing';
import { Users } from '@guardian/common/helpers/users';
import { MessageAction } from '@guardian/hedera/message/message-action';
import { MessageServer } from '@guardian/hedera/message/message-server';
import { MessageType } from '@guardian/hedera/message/message-type';
import { TagMessage } from '@guardian/hedera/message/tag-message';
import { ToolMessage } from '@guardian/hedera/message/tool-message';
import { TopicConfig } from '@guardian/hedera/topic';
import { TopicHelper } from '@guardian/hedera/topic-helper';
import { importTag } from '../tag/tag-import-helper.js';
import { SchemaImportExportHelper } from '../schema/schema-import-helper.js';
import { ImportToolMap, ImportToolResult, ImportToolResults, ToolEmbeddedRegistry, ToolImportEntry } from './tool-import.interface.js';
import { resolveToolOverrides } from './tool-override-resolver.js';

// backstop only - `visited` is what catches cycles
const MAX_TOOL_IMPORT_DEPTH = 32;

export async function getToolSchemas(tools: PolicyTool[]): Promise<{ name: string; iri: string }[]> {
    const toolsSchemas = await DatabaseServer.getSchemas(
        {
            category: SchemaCategory.TOOL,
            topicId: { $in: tools.map((tool) => tool.topicId) },
        },
        {
            fields: ['name', 'iri'],
        }
    );
    const directTopicIds = new Set(tools.map((subTool) => subTool.topicId));
    const nestedTopicIds = new Set<string>();
    for (const subTool of tools) {
        for (const nestedTool of subTool.tools || []) {
            if (nestedTool?.topicId && !directTopicIds.has(nestedTool.topicId)) {
                nestedTopicIds.add(nestedTool.topicId);
            }
        }
    }
    if (nestedTopicIds.size) {
        const nestedSchemas = await DatabaseServer.getSchemas(
            {
                category: SchemaCategory.TOOL,
                topicId: { $in: Array.from(nestedTopicIds) },
            },
            {
                fields: ['name', 'iri'],
            }
        );
        const directNames = new Set(toolsSchemas.map((schema) => schema.name));
        const nestedIrisByName = new Map<string, Set<string>>();
        for (const schema of nestedSchemas) {
            if (directNames.has(schema.name)) {
                continue;
            }
            const iris = nestedIrisByName.get(schema.name) || new Set<string>();
            iris.add(schema.iri);
            nestedIrisByName.set(schema.name, iris);
        }
        for (const schema of nestedSchemas) {
            if (nestedIrisByName.get(schema.name)?.size === 1) {
                toolsSchemas.push(schema);
                nestedIrisByName.delete(schema.name);
            }
        }
    }
    return toolsSchemas.map(({ name, iri }) => ({ name, iri }));
}

/**
 * Import tools by messages
 * @param owner
 * @param messages
 * @param notifier
 * @param visited message ids on the current import path
 */
export async function importSubTools(
    hederaAccount: IRootConfig,
    messages: ToolImportEntry[],
    user: IOwner,
    notifier: INotificationStep,
    userId: string | null,
    visited: Set<string> = new Set<string>(),
    embeddedRegistry: ToolEmbeddedRegistry = new Map<string, ToolImportEntry>()
): Promise<ImportToolResults> {
    notifier.start();

    if (!messages?.length) {
        notifier.complete();
        return { tools: [], errors: [], maps: [] };
    }

    const errors: any[] = [];
    const tools: any[] = [];
    const maps: ImportToolMap[] = [];
    notifier.setEstimate(messages.length);
    let index = 0;
    for (const entry of messages) {
        try {
            const step = notifier.addStep(`${entry.name || '-'}`);
            /*
             * An entry carrying a `config` is a self-contained tool document,
             * and a ref the registry can resolve is one as well: import
             * re-publishes the content locally instead of re-fetching a
             * consensus message that only exists on the source network.
             */
            const embeddedEntry = entry.config
                ? entry
                : entry.messageId ? embeddedRegistry.get(entry.messageId.trim()) : undefined;
            const importResult = embeddedEntry
                ? await importToolByEmbedded(
                    hederaAccount, embeddedEntry, user, step, userId, visited, embeddedRegistry
                )
                : await importToolByMessage(
                    hederaAccount,
                    entry.messageId,
                    user,
                    step,
                    userId,
                    visited
                );
            if (importResult.map) {
                maps.push(importResult.map);
            } else if (
                importResult.tool &&
                entry.messageId &&
                importResult.tool.messageId &&
                entry.messageId !== importResult.tool.messageId
            ) {
                // The identity of a freshly created by-message tool changed, so
                // report the mapping for config substitution as well.
                maps.push({
                    oldMessageId: entry.messageId,
                    messageId: importResult.tool.messageId,
                    oldHash: entry.hash,
                    newHash: importResult.tool.hash
                });
            }
            if (importResult.maps?.length) {
                maps.push(...importResult.maps);
            }
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
            // Keep the underlying cause. Flattening every failure to 'Invalid
            // tool' makes a transient IPFS/Hedera error undiagnosable - the real
            // status only survives as an unattributed worker log line.
            errors.push({
                type: 'tool',
                name: entry.name,
                messageId: entry.messageId,
                error: error?.message || String(error) || 'Invalid tool'
            });
        }
    }

    notifier.complete();
    return {
        tools,
        errors,
        maps
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
    userId: string | null,
    visited: Set<string> = new Set<string>(),
    embeddedRegistry: ToolEmbeddedRegistry = new Map<string, ToolImportEntry>()
): Promise<ImportToolResult> {
    // <-- Steps
    const STEP_LOAD_FILE = 'Load tool file';
    const STEP_SAVE_FILE_IN_DB = 'Save file in database';
    const STEP_PARSE_FILE = 'Parse tool file';
    const STEP_IMPORT_SCHEMAS = 'Import tool schemas';
    const STEP_IMPORT_TAGS = 'Import tool tags';
    // Steps -->

    notifier.addStep(STEP_LOAD_FILE);
    notifier.addStep(STEP_SAVE_FILE_IN_DB);
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

    /*
     * The getTool dedup below cannot catch this: createTool writes that row only
     * after the recursion returns, so a tool on the current path is invisible to
     * its own check and a self-referencing archive recursed without end.
     * `visited` is the path, not everything seen - the id is popped on the way
     * out, so a diamond still resolves twice instead of reading as a cycle.
     */
    if (visited.has(messageId)) {
        throw new Error(
            `Circular tool reference: "${messageId}" is already being imported further up the chain.`
        );
    }
    if (visited.size >= MAX_TOOL_IMPORT_DEPTH) {
        throw new Error(
            `Tool import nested deeper than ${MAX_TOOL_IMPORT_DEPTH} levels; refusing to continue.`
        );
    }
    visited.add(messageId);

    try {
    const message = await messageServer
        .getMessage<ToolMessage>({
            messageId,
            loadIPFS: true,
            userId,
            interception: null
        });
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
            if (message.tagsTopicId) {
                const topic = await DatabaseServer.getTopicById(message.tagsTopicId);
                if (!topic) {
                    const tagsTopic = {
                        type: TopicType.TagsTopic,
                        topicId: message.tagsTopicId,
                        name: message.name || TopicType.TagsTopic,
                        description: message.description || TopicType.TagsTopic,
                        owner: user.owner,
                        policyId: message.id.toString(),
                        policyUUID: message.uuid
                    };
                    await DatabaseServer.saveTopic(tagsTopic);
                }
            }

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
    const toolsResults = await importSubTools(hederaAccount, components.tools, user, notifier, userId, visited, embeddedRegistry);

    // saved after the recursion: a blob written before it is orphaned by anything
    // that throws in between, with no reference and no cleanup path
    notifier.startStep(STEP_SAVE_FILE_IN_DB);
    const buffer = Buffer.from(message.document);
    const contentFileId = await DatabaseServer.saveFile(GenerateUUIDv4(), buffer);
    notifier.completeStep(STEP_SAVE_FILE_IN_DB);

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
    components.tool.contentFileId = contentFileId;
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
        const tagsTopic = {
            type: TopicType.TagsTopic,
            topicId: message.tagsTopicId,
            name: message.name || TopicType.TagsTopic,
            description: message.description || TopicType.TagsTopic,
            owner: user.owner,
            policyId: message.id.toString(),
            policyUUID: message.uuid
        };
        await DatabaseServer.saveTopic(tagsTopic);

        const tagMessages = await messageServer.getMessages<TagMessage>({
            topicId: message.tagsTopicId,
            type: MessageType.Tag,
            action: MessageAction.PublishTag,
            userId
        });
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
    } finally {
        visited.delete(messageId);
    }
}

/**
 * Import a tool whose full document is embedded in the archive entry
 * (the self-contained, v2 entry format).
 *
 * Re-fetching by messageId is impossible here: the document was published on
 * the source network, and this network has no such consensus message. Instead
 * the content is re-published locally - a new tool topic, a new PublishTool
 * consensus message, a new messageId - and the row is saved PUBLISHED, the
 * only status the policy engine will execute.
 *
 * The hash is computed from the embedded bytes (never from reloaded entities,
 * whose ids would drift), so the same embedded content always produces the
 * same hash on every network. That is what the (hash, owner) dedup keys on:
 * two archives embedding the same tool republish it once.
 *
 * The returned ImportToolMap carries the old-to-new identity so the importing
 * policy can substitute the new ids across its config and `tools` list.
 */
export async function importToolByEmbedded(
    hederaAccount: IRootConfig,
    entry: ToolImportEntry,
    user: IOwner,
    notifier: INotificationStep,
    userId: string | null,
    visited: Set<string> = new Set<string>(),
    embeddedRegistry: ToolEmbeddedRegistry = new Map<string, ToolImportEntry>()
): Promise<ImportToolResult> {
    // <-- Steps
    const STEP_LOAD_FILE = 'Load tool file';
    const STEP_CHECK_DEDUP = 'Check for existing tool';
    const STEP_CREATE_TOPIC = 'Create topic';
    const STEP_IMPORT_SUB_TOOLS = 'Import sub-tools';
    const STEP_IMPORT_SCHEMAS = 'Import schemas';
    const STEP_CREATE_TAGS_TOPIC = 'Create tags topic';
    const STEP_UPDATE_CONFIG = 'Update config';
    const STEP_PUBLISH_TOOL = 'Publish tool';
    const STEP_SAVE = 'Save tool';
    const STEP_LINK_TOPIC = 'Link topic and tool';
    const STEP_IMPORT_TAGS = 'Import tags';
    // Steps -->

    notifier.addStep(STEP_LOAD_FILE);
    notifier.addStep(STEP_CHECK_DEDUP);
    notifier.addStep(STEP_CREATE_TOPIC);
    notifier.addStep(STEP_IMPORT_SUB_TOOLS);
    notifier.addStep(STEP_IMPORT_SCHEMAS);
    notifier.addStep(STEP_CREATE_TAGS_TOPIC);
    notifier.addStep(STEP_UPDATE_CONFIG);
    notifier.addStep(STEP_PUBLISH_TOOL);
    notifier.addStep(STEP_SAVE);
    notifier.addStep(STEP_LINK_TOPIC);
    notifier.addStep(STEP_IMPORT_TAGS);
    notifier.start();

    notifier.startStep(STEP_LOAD_FILE);

    /*
     * Deep-clone the entry before mutating anything: the registry shares the
     * same objects across parents, and every step below mutates in place
     * (ref enrichment, replaceConfig, updateToolConfig). Without the clone, a
     * diamond lets one parent's import change the bytes another parent
     * re-zips - different hash, dedup miss, double re-publish.
     */
    const cloned = structuredClone(entry);
    const components: IToolComponents = {
        // The entry is parsed JSON, not an entity instance; the casts are
        // compile-time only - nothing below calls entity methods on it.
        tool: cloned as unknown as PolicyTool,
        tools: (Array.isArray(cloned.tools) ? cloned.tools : []) as unknown as PolicyTool[],
        schemas: Array.isArray(cloned.schemas) ? cloned.schemas : [],
        tags: Array.isArray(cloned.tags) ? cloned.tags : []
    };

    if (!components.tool.config) {
        throw new Error('The embedded tool entry has no config; nothing to re-publish.');
    }

    const oldMessageId = typeof components.tool.messageId === 'string' ? components.tool.messageId.trim() : '';
    const oldHash = typeof entry.hash === 'string' && entry.hash ? entry.hash : undefined;

    /*
     * Same cycle protection as importToolByMessage. The entry's original
     * messageId is the preferred key; an entry without one falls back to its
     * content hash, so a hash-keyed self-reference is caught as well.
     */
    const visitedKey = oldMessageId || `hash:${components.tool.hash || components.tool.name}`;
    if (visited.has(visitedKey)) {
        throw new Error(
            `Circular tool reference: "${visitedKey}" is already being imported further up the chain.`
        );
    }
    if (visited.size >= MAX_TOOL_IMPORT_DEPTH) {
        throw new Error(
            `Tool import nested deeper than ${MAX_TOOL_IMPORT_DEPTH} levels; refusing to continue.`
        );
    }
    visited.add(visitedKey);

    try {
        // Enrich the 3-field nested refs with the registry's identity so the
        // stubs the zip emits are complete and uniquely named. A ref not
        // embedded in the archive keeps the name fallback.
        for (const ref of components.tools) {
            const embedded = typeof ref.messageId === 'string'
                ? embeddedRegistry.get(ref.messageId.trim())
                : undefined;
            if (!embedded) {
                continue;
            }
            if (!ref.description) {
                ref.description = embedded.description;
            }
            if (!ref.creator) {
                ref.creator = embedded.creator;
            }
            if (!ref.hash) {
                ref.hash = embedded.hash;
            }
        }

        // The zip (and thus the hash) must be generated before any identity
        // mutation below: the published document and the dedup key are both
        // derived from the embedded bytes as they appear in the archive.
        const zip = await ToolImportExport.generateZipFile(components);
        const buffer = Buffer.from(await zip.generateAsync({ type: 'arraybuffer' }));
        const hash = Hashing.base58.encode(Hashing.sha256.digest(buffer));

        // The consensus message document must be exactly the embedded content,
        // so the message hash keeps covering it after the row is mutated.
        const documentTool = structuredClone(components.tool);
        documentTool.hash = hash;
        notifier.completeStep(STEP_LOAD_FILE);

        notifier.startStep(STEP_CHECK_DEDUP);
        // Same (hash, owner) key the dedup was built on: a re-import of an
        // archive embedding an already re-published tool reuses the existing row.
        const existing = await DatabaseServer.getTool({ hash, owner: user.owner });
        notifier.completeStep(STEP_CHECK_DEDUP);
        if (existing) {
            notifier.complete();
            return {
                tool: existing,
                errors: [],
                map: {
                    oldMessageId,
                    messageId: existing.messageId,
                    oldHash,
                    newHash: existing.hash
                }
            };
        }

        notifier.startStep(STEP_CREATE_TOPIC);
        const messageServer = new MessageServer({
            operatorId: hederaAccount.hederaAccountId,
            operatorKey: hederaAccount.hederaAccountKey,
            signOptions: hederaAccount.signOptions
        });
        const parent = await TopicConfig.fromObject(
            await DatabaseServer.getTopicByType(user.owner, TopicType.UserTopic), true, userId
        );
        const topicHelper = new TopicHelper(
            hederaAccount.hederaAccountId,
            hederaAccount.hederaAccountKey,
            hederaAccount.signOptions
        );
        const topic = await topicHelper.create({
            type: TopicType.ToolTopic,
            name: components.tool.name || TopicType.ToolTopic,
            description: components.tool.description || TopicType.ToolTopic,
            owner: user.owner,
            targetId: null,
            targetUUID: null
        }, {
            admin: true,
            submit: true
        }, {
            userId
        });
        await topic.saveKeys(userId);
        await topicHelper.twoWayLink({ topic, parent, rationale: null, userId });
        await DatabaseServer.saveTopic(topic.toObject());
        documentTool.topicId = topic.topicId;
        notifier.completeStep(STEP_CREATE_TOPIC);

        // Row mutation: the identity the archive carried is source-network
        // data, and every field below is assigned fresh for this network.
        const tool = components.tool;
        delete tool._id;
        delete tool.id;
        delete tool.uuid;
        delete tool.messageId;
        delete tool.topicId;
        delete tool.status;
        delete tool.tagsTopicId;
        delete tool.createDate;
        delete tool.updateDate;
        tool.uuid = GenerateUUIDv4();
        tool.creator = user.creator;
        tool.owner = user.owner;
        if (!ModelHelper.checkVersionFormat(tool.version || '')) {
            tool.version = '1.0.0';
        }
        if (!ModelHelper.checkVersionFormat(tool.previousVersion || '')) {
            tool.previousVersion = '0.0.0';
        }
        tool.status = ModuleStatus.PUBLISHED;
        tool.hash = hash;
        tool.topicId = topic.topicId;

        notifier.startStep(STEP_IMPORT_SUB_TOOLS);
        const toolsResults = await importSubTools(
            hederaAccount,
            components.tools,
            user,
            notifier.getStep(STEP_IMPORT_SUB_TOOLS),
            userId,
            visited,
            embeddedRegistry
        );
        const childMaps = toolsResults.maps;
        const toolsSchemas = await getToolSchemas(toolsResults.tools);
        notifier.completeStep(STEP_IMPORT_SUB_TOOLS);

        notifier.startStep(STEP_IMPORT_SCHEMAS);
        const schemasResult = await SchemaImportExportHelper.importSchemaByFiles(
            components.schemas,
            user,
            {
                category: SchemaCategory.TOOL,
                topicId: topic.topicId,
                skipGenerateId: false,
                outerSchemas: toolsSchemas
            },
            notifier.getStep(STEP_IMPORT_SCHEMAS),
            userId
        );
        const schemasMap = schemasResult.schemasMap;
        notifier.completeStep(STEP_IMPORT_SCHEMAS);

        notifier.startStep(STEP_CREATE_TAGS_TOPIC);
        const tagsTopic = await topicHelper.create({
            type: TopicType.TagsTopic,
            name: tool.name || TopicType.TagsTopic,
            description: tool.description || TopicType.TagsTopic,
            owner: user.owner,
            policyId: null,
            policyUUID: tool.uuid
        }, {
            admin: true,
            submit: false
        }, {
            userId
        });
        await tagsTopic.saveKeys(userId);
        await DatabaseServer.saveTopic(tagsTopic.toObject());
        tool.tagsTopicId = tagsTopic.topicId;
        documentTool.tagsTopicId = tagsTopic.topicId;
        notifier.completeStep(STEP_CREATE_TAGS_TOPIC);

        notifier.startStep(STEP_UPDATE_CONFIG);
        // Nested refs and schema IRIs now point at the new local identities.
        await replaceConfig(tool, schemasMap, childMaps);
        await updateToolConfig(tool);
        notifier.completeStep(STEP_UPDATE_CONFIG);

        // Saved after the recursion: a blob written before it is orphaned by
        // anything that throws in between, with no reference and no cleanup path
        tool.contentFileId = await DatabaseServer.saveFile(GenerateUUIDv4(), buffer);

        notifier.startStep(STEP_PUBLISH_TOOL);
        const message = new ToolMessage(MessageType.Tool, MessageAction.PublishTool);
        message.setDocument(documentTool, buffer);
        const result = await messageServer
            .setTopicObject(topic)
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId,
                interception: userId
            });
        tool.messageId = result.getId();
        notifier.completeStep(STEP_PUBLISH_TOOL);

        notifier.startStep(STEP_SAVE);
        // The row only exists once the consensus message does: a failed
        // publish must not leave behind a PUBLISHED row with no messageId.
        const item = await DatabaseServer.createTool(tool);
        notifier.completeStep(STEP_SAVE);

        notifier.startStep(STEP_LINK_TOPIC);
        const topicRow = await DatabaseServer.getTopicById(topic.topicId);
        topicRow.targetId = item.id.toString();
        topicRow.targetUUID = item.uuid;
        await DatabaseServer.updateTopic(topicRow);
        notifier.completeStep(STEP_LINK_TOPIC);

        notifier.startStep(STEP_IMPORT_TAGS);
        const toolTags = components.tags.filter((t: any) => t.entity === TagType.Tool);
        await importTag(toolTags, item.id.toString());
        notifier.completeStep(STEP_IMPORT_TAGS);

        const errors: any[] = [];
        for (const error of toolsResults.errors) {
            errors.push(error);
        }
        if (schemasResult.errors) {
            for (const error of schemasResult.errors) {
                errors.push(error);
            }
        }

        notifier.complete();
        return {
            tool: item,
            errors,
            map: {
                oldMessageId,
                messageId: item.messageId,
                oldHash,
                newHash: hash
            },
            maps: childMaps
        };
    } finally {
        visited.delete(visitedKey);
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
    const root = await users.getHederaAccount(user.owner, userId);

    const { toolsMapping, preResolvedTools, toolsToImport } = await resolveToolOverrides(tools, metadata);

    delete tool._id;
    delete tool.id;
    delete tool.messageId;
    delete tool.version;
    delete tool.createDate;
    delete tool.tagsTopicId;

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
    }, {
        admin: true,
        submit: true
    }, {
        userId
    });
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
    await topicHelper.twoWayLink({
        topic,
        parent,
        rationale: messageStatus.getId(),
        userId
    });

    await DatabaseServer.saveTopic(topic.toObject());
    tool.topicId = topic.topicId;
    await DatabaseServer.updateTool(tool);
    notifier.completeStep(STEP_LINK_TOPIC);

    // Import Tools
    notifier.startStep(STEP_IMPORT_SUB_SCHEMAS);
    const toolsResult = await importSubTools(
        root,
        toolsToImport,
        user,
        notifier.getStep(STEP_IMPORT_SUB_SCHEMAS),
        userId
    );
    toolsResult.tools = [...preResolvedTools, ...toolsResult.tools];

    for (const toolMapping of toolsMapping) {
        const toolByMessageId = toolsResult.tools.find(
            (t) => t.messageId === toolMapping.messageId
        );
        toolMapping.newHash = toolByMessageId?.hash;
    }

    const toolsSchemas = await getToolSchemas(toolsResult.tools);
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
            outerSchemas: toolsSchemas
        },
        notifier.getStep(STEP_IMPORT_SCHEMAS),
        userId
    );
    const schemasMap = schemasResult.schemasMap;
    notifier.completeStep(STEP_IMPORT_SCHEMAS);

    notifier.startStep(STEP_SAVE);

    // Replace id
    await replaceConfig(tool, schemasMap, toolsMapping);
    await updateToolConfig(tool);

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
        errors,
        warnings: schemasResult.warnings || []
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
        if (!item.messageId) {
            continue;
        }
        if (item.oldMessageId && item.oldMessageId !== item.messageId) {
            replaceAllEntities(tool.config, ['messageId'], item.oldMessageId, item.messageId);
        }
        if (item.oldHash && item.newHash && item.oldHash !== item.newHash) {
            replaceAllEntities(tool.config, ['hash'], item.oldHash, item.newHash);
        }
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
