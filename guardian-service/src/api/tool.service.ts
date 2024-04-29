import { ApiResponse } from '../api/helpers/api-response.js';
import { BinaryMessageResponse, DatabaseServer, Hashing, Logger, MessageAction, MessageError, MessageResponse, MessageServer, MessageType, PolicyTool, replaceAllEntities, replaceAllVariables, RunFunctionAsync, SchemaFields, ToolImportExport, ToolMessage, TopicConfig, TopicHelper, Users } from '@guardian/common';
import { IRootConfig, MessageAPI, ModuleStatus, SchemaStatus, TopicType } from '@guardian/interfaces';
import { emptyNotifier, initNotifier, INotifier } from '../helpers/notifier.js';
import { findAndPublishSchema } from '../api/helpers/schema-publish-helper.js';
import { incrementSchemaVersion } from '../api/helpers/schema-helper.js';
import { ISerializedErrors } from '../policy-engine/policy-validation-results-container.js';
import { ToolValidator } from '../policy-engine/block-validators/tool-validator.js';
import { PolicyConverterUtils } from '../policy-engine/policy-converter-utils.js';
import { importToolByFile, importToolByMessage, importToolErrors, updateToolConfig } from './helpers/index.js';
import * as crypto from 'crypto';
import { publishToolTags } from './tag.service.js';

/**
 * Sha256
 * @param data
 * @public
 * @static
 */
export function sha256(data: ArrayBuffer): string {
    try {
        const array = new Uint8Array(data);
        const buffer = crypto
            .createHash('sha256')
            .update(array)
            .digest();
        return Hashing.base58.encode(buffer);
    } catch (error) {
        return '';
    }
}

/**
 * Prepare tool for preview by message
 * @param messageId
 * @param owner
 * @param notifier
 */
export async function preparePreviewMessage(
    messageId: string,
    owner: string,
    notifier: INotifier
): Promise<any> {
    notifier.start('Resolve Hedera account');
    if (!messageId) {
        throw new Error('Message ID in body is empty');
    }

    const users = new Users();
    const root = await users.getHederaAccount(owner);
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
    const message = await messageServer.getMessage<ToolMessage>(messageId);
    if (message.type !== MessageType.Tool) {
        throw new Error('Invalid Message Type');
    }

    if (!message.document) {
        throw new Error('file in body is empty');
    }

    notifier.completedAndStart('Parse tool files');
    const result: any = await ToolImportExport.parseZipFile(message.document);
    result.messageId = messageId;
    result.toolTopicId = message.toolTopicId;

    notifier.completed();
    return result;
}

/**
 * Validate and publish tool
 * @param id
 * @param owner
 * @param notifier
 */
export async function validateAndPublish(id: string, owner: string, notifier: INotifier) {
    notifier.start('Find and validate tool');
    const item = await DatabaseServer.getToolById(id);
    if (!item) {
        throw new Error('Unknown tool');
    }
    if (!item.config) {
        throw new Error('The tool is empty');
    }
    if (item.status === ModuleStatus.PUBLISHED) {
        throw new Error(`Tool already published`);
    }

    const errors = await validateTool(item);
    const isValid = !errors.blocks.some(block => !block.isValid);
    notifier.completed();

    if (isValid) {
        const newTool = await publishTool(item, owner, notifier);
        return { tool: newTool, isValid, errors };
    } else {
        return { tool: item, isValid, errors };
    }
}

/**
 * Validate tool
 * @param tool
 */
export async function validateTool(tool: PolicyTool): Promise<ISerializedErrors> {
    const toolValidator = new ToolValidator(tool.config);
    await toolValidator.build(tool);
    await toolValidator.validate();
    return toolValidator.getSerializedErrors();
}

/**
 * Publish tool
 * @param tool
 * @param owner
 * @param version
 * @param notifier
 */
export async function publishTool(
    tool: PolicyTool,
    owner: string,
    notifier: INotifier
): Promise<PolicyTool> {
    try {
        const logger = new Logger();
        logger.info('Publish tool', ['GUARDIAN_SERVICE']);

        notifier.start('Resolve Hedera account');
        const users = new Users();
        const root = await users.getHederaAccount(owner);

        notifier.completedAndStart('Find topic');
        const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(tool.topicId), true);
        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, root.signOptions)
            .setTopicObject(topic);

        notifier.completedAndStart('Publish schemas');
        tool = await publishSchemas(tool, owner, root, notifier);

        notifier.completedAndStart('Create tags topic');
        const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
        const tagsTopic = await topicHelper.create({
            type: TopicType.TagsTopic,
            name: tool.name || TopicType.TagsTopic,
            description: tool.description || TopicType.TagsTopic,
            owner,
            policyId: tool.id.toString(),
            policyUUID: tool.uuid
        }, { admin: true, submit: false });
        await tagsTopic.saveKeys();
        await DatabaseServer.saveTopic(tagsTopic.toObject());
        tool.tagsTopicId = tagsTopic.topicId;

        notifier.completedAndStart('Generate file');
        tool = await updateToolConfig(tool);
        const zip = await ToolImportExport.generate(tool);
        const buffer = await zip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 3
            }
        });
        tool.hash = sha256(buffer);

        notifier.completedAndStart('Publish tool');
        const message = new ToolMessage(MessageType.Tool, MessageAction.PublishTool);
        message.setDocument(tool, buffer);
        const result = await messageServer
            .sendMessage(message);

        notifier.completedAndStart('Publish tags');
        try {
            await publishToolTags(tool, root);
        } catch (error) {
            logger.error(error, ['GUARDIAN_SERVICE, TAGS']);
        }

        notifier.completedAndStart('Saving in DB');
        tool.messageId = result.getId();
        tool.status = ModuleStatus.PUBLISHED;
        const retVal = await DatabaseServer.updateTool(tool);

        notifier.completed();

        logger.info('Published tool', ['GUARDIAN_SERVICE']);

        return retVal
    } catch (error) {
        tool.status = ModuleStatus.PUBLISH_ERROR;
        await DatabaseServer.updateTool(tool);
        throw error;
    }
}

/**
 * Policy schemas
 * @param tool
 * @param owner
 * @param root
 * @param notifier
 */
export async function publishSchemas(
    tool: PolicyTool,
    owner: string,
    root: IRootConfig,
    notifier: INotifier
): Promise<PolicyTool> {
    const schemas = await DatabaseServer.getSchemas({ topicId: tool.topicId });

    notifier.info(`Found ${schemas.length} schemas`);
    const schemaIRIs = schemas.map(s => s.iri);
    let num: number = 0;
    let skipped: number = 0;
    for (const schemaIRI of schemaIRIs) {
        const schema = await incrementSchemaVersion(schemaIRI, owner);
        if (!schema || schema.status === SchemaStatus.PUBLISHED) {
            skipped++;
            continue;
        }
        const newSchema = await findAndPublishSchema(
            schema.id,
            schema.version,
            owner,
            root,
            emptyNotifier()
        );
        if (Array.isArray(tool.config?.variables)) {
            for (const variable of tool.config?.variables) {
                if (variable.baseSchema === schemaIRI) {
                    variable.baseSchema = newSchema.iri;
                }
            }
        }
        replaceAllEntities(tool.config, SchemaFields, schemaIRI, newSchema.iri);
        replaceAllVariables(tool.config, 'Schema', schemaIRI, newSchema.iri);

        const name = newSchema.name;
        num++;
        notifier.info(`Schema ${num} (${name || '-'}) published`);
    }

    if (skipped) {
        notifier.info(`Skip published ${skipped}`);
    }
    return tool;
}

/**
 * Create tool
 * @param tool
 * @param owner
 * @param version
 * @param notifier
 */
export async function createTool(
    json: any,
    owner: string,
    notifier: INotifier
): Promise<PolicyTool> {
    const logger = new Logger();
    logger.info('Create Policy', ['GUARDIAN_SERVICE']);
    notifier.start('Save in DB');
    if (json) {
        delete json._id;
        delete json.id;
        delete json.status;
        delete json.owner;
        delete json.version;
        delete json.messageId;
    }
    json.creator = owner;
    json.owner = owner;
    json.type = 'CUSTOM';
    json.status = ModuleStatus.DRAFT;
    json.codeVersion = PolicyConverterUtils.VERSION;

    json = await updateToolConfig(json);
    const tool = await DatabaseServer.createTool(json);

    try {
        if (!tool.topicId) {
            notifier.completedAndStart('Resolve Hedera account');
            const users = new Users();
            const root = await users.getHederaAccount(owner);

            notifier.completedAndStart('Create topic');
            logger.info('Create Tool: Create New Topic', ['GUARDIAN_SERVICE']);
            const parent = await TopicConfig.fromObject(
                await DatabaseServer.getTopicByType(owner, TopicType.UserTopic), true
            );
            const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
            const topic = await topicHelper.create({
                type: TopicType.ToolTopic,
                name: tool.name || TopicType.ToolTopic,
                description: tool.description || TopicType.ToolTopic,
                owner,
                targetId: tool.id.toString(),
                targetUUID: tool.uuid
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
            notifier.completed();
        }

        return tool;
    } catch (error) {
        await DatabaseServer.removeTool(tool);
        throw error;
    }
}

/**
 * Connect to the message broker methods of working with tools.
 */
export async function toolsAPI(): Promise<void> {
    /**
     * Create new tool
     *
     * @param payload - tool
     *
     * @returns {PolicyTool} new tool
     */
    ApiResponse(MessageAPI.CREATE_TOOL, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid Params');
            }
            const { tool, owner } = msg;
            const item = await createTool(tool, owner, emptyNotifier());
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Create new tool
     *
     * @param payload - tool
     *
     * @returns {PolicyTool} new tool
     */
    ApiResponse(MessageAPI.CREATE_TOOL_ASYNC, async (msg) => {
        if (!msg) {
            throw new Error('Invalid Params');
        }
        const { tool, owner, task } = msg;
        const notifier = await initNotifier(task);
        RunFunctionAsync(async () => {
            const item = await createTool(tool, owner, notifier);
            notifier.result(item.id);
        }, async (error) => {
            notifier.error(error);
        });
        return new MessageResponse(task);
    });

    ApiResponse(MessageAPI.GET_TOOLS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load tools parameter');
            }

            const { pageIndex, pageSize, owner } = msg;
            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = _pageSize;
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = 100;
            }
            otherOptions.fields = [
                'id',
                'creator',
                'owner',
                'name',
                'description',
                'uuid',
                'topicId',
                'messageId',
                'hash',
                'status'
            ];
            const [items, count] = await DatabaseServer.getToolsAndCount({
                $or: [{
                    owner
                }, {
                    status: ModuleStatus.PUBLISHED
                }]
            }, otherOptions);
            return new MessageResponse({ items, count });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.DELETE_TOOL, async (msg) => {
        try {
            if (!msg.id || !msg.owner) {
                return new MessageError('Invalid load tools parameter');
            }
            const item = await DatabaseServer.getToolById(msg.id);
            if (!item || item.owner !== msg.owner) {
                throw new Error('Invalid tool');
            }
            if (item.status === ModuleStatus.PUBLISHED) {
                throw new Error('Tool published');
            }
            await DatabaseServer.removeTool(item);
            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.GET_MENU_TOOLS, async (msg) => {
        try {
            const tools: any[] = await DatabaseServer.getTools({
                status: ModuleStatus.PUBLISHED
            }, {
                fields: [
                    'id',
                    'name',
                    'description',
                    'topicId',
                    'hash',
                    'messageId',
                    'owner',
                    'config',
                    'configFileId',
                    'tools'
                ]
            });
            const ids = tools.map(t => t.topicId);
            const schemas = await DatabaseServer.getSchemas(
                { topicId: { $in: ids } },
                {
                    fields: [
                        'id',
                        'name',
                        'description',
                        'topicId',
                        'iri',
                    ]
                }
            );
            const map = new Map<string, any>();
            for (const tool of tools) {
                delete tool.configFileId;
                if (tool.config) {
                    tool.config = {
                        inputEvents: tool.config.inputEvents,
                        outputEvents: tool.config.outputEvents,
                        variables: tool.config.variables
                    }
                }
                tool.schemas = [];
                map.set(tool.topicId, tool);
            }
            for (const schema of schemas) {
                if (map.has(schema.topicId)) {
                    map.get(schema.topicId).schemas.push(schema);
                }
            }
            return new MessageResponse(tools);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.UPDATE_TOOL, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load tools parameter');
            }
            const { id, tool, owner } = msg;
            const item = await DatabaseServer.getToolById(id);
            if (!item || item.owner !== owner) {
                throw new Error('Invalid tool');
            }
            if (item.status === ModuleStatus.PUBLISHED) {
                throw new Error('Tool published');
            }

            item.config = tool.config;
            item.name = tool.name;
            item.description = tool.description;

            await updateToolConfig(item);
            const result = await DatabaseServer.updateTool(item);
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.GET_TOOL, async (msg) => {
        try {
            if (!msg.id || !msg.owner) {
                return new MessageError('Invalid load tools parameter');
            }
            const item = await DatabaseServer.getToolById(msg.id);
            if (!item) {
                throw new Error('Invalid tool');
            }
            if (item.status !== ModuleStatus.PUBLISHED && item.owner !== msg.owner) {
                throw new Error('Invalid tool');
            }
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.TOOL_EXPORT_FILE, async (msg) => {
        try {
            if (!msg.id || !msg.owner) {
                return new MessageError('Invalid load tools parameter');
            }

            const item = await DatabaseServer.getToolById(msg.id);
            if (!item) {
                throw new Error('Invalid tool');
            }
            if (item.status !== ModuleStatus.PUBLISHED && item.owner !== msg.owner) {
                throw new Error('Invalid tool');
            }

            await updateToolConfig(item);
            const zip = await ToolImportExport.generate(item);
            const file = await zip.generateAsync({
                type: 'arraybuffer',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 3,
                },
            });
            return new BinaryMessageResponse(file);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.TOOL_EXPORT_MESSAGE, async (msg) => {
        try {
            if (!msg.id || !msg.owner) {
                return new MessageError('Invalid load tools parameter');
            }

            const item = await DatabaseServer.getToolById(msg.id);
            if (!item) {
                throw new Error('Invalid tool');
            }

            return new MessageResponse({
                id: item.id,
                uuid: item.uuid,
                name: item.name,
                description: item.description,
                messageId: item.messageId,
                owner: item.owner
            });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.TOOL_IMPORT_FILE_PREVIEW, async (msg) => {
        try {
            const { zip } = msg;
            if (!zip) {
                throw new Error('file in body is empty');
            }
            const preview = await ToolImportExport.parseZipFile(Buffer.from(zip.data));
            return new MessageResponse(preview);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.TOOL_IMPORT_MESSAGE_PREVIEW, async (msg) => {
        try {
            const { messageId, owner } = msg;
            const preview = await preparePreviewMessage(messageId, owner, emptyNotifier());
            return new MessageResponse(preview);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.TOOL_IMPORT_FILE, async (msg) => {
        try {
            const { zip, owner, metadata } = msg;
            if (!zip) {
                throw new Error('file in body is empty');
            }
            const preview = await ToolImportExport.parseZipFile(Buffer.from(zip.data));
            const { tool, errors } = await importToolByFile(owner, preview, emptyNotifier(), metadata);
            if (errors?.length) {
                const message = importToolErrors(errors);
                new Logger().warn(message, ['GUARDIAN_SERVICE']);
                return new MessageError(message);
            } else {
                return new MessageResponse(tool);
            }
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.TOOL_IMPORT_MESSAGE, async (msg) => {
        try {
            const { messageId, owner } = msg;
            if (!messageId || typeof messageId !== 'string') {
                throw new Error('Message ID in body is empty');
            }
            const id = messageId.trim();
            const oldTool = await DatabaseServer.getTool({ messageId: id });
            if (oldTool) {
                throw new Error('The tool already exists');
            }
            const notifier = emptyNotifier();
            const users = new Users();
            const root = await users.getHederaAccount(owner);
            const item = await importToolByMessage(root, id, notifier);
            notifier.completed();
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.TOOL_IMPORT_FILE_ASYNC, async (msg) => {
        const { zip, owner, task, metadata} = msg;
        const notifier = await initNotifier(task);
        RunFunctionAsync(async () => {
            if (!zip) {
                throw new Error('file in body is empty');
            }
            const preview = await ToolImportExport.parseZipFile(Buffer.from(zip.data));
            const { tool, errors } = await importToolByFile(owner, preview, notifier, metadata);
            if (errors?.length) {
                const message = importToolErrors(errors);
                notifier.error(message);
                new Logger().warn(message, ['GUARDIAN_SERVICE']);
            } else {
                notifier.result({
                    toolId: tool.id,
                    errors: []
                });
            }
        }, async (error) => {
            notifier.error(error);
        });
        return new MessageResponse(task);
    });

    ApiResponse(MessageAPI.TOOL_IMPORT_MESSAGE_ASYNC, async (msg) => {
        const { messageId, owner, task } = msg;
        const notifier = await initNotifier(task);
        RunFunctionAsync(async () => {
            if (!messageId || typeof messageId !== 'string') {
                throw new Error('Message ID in body is empty');
            }
            const id = messageId.trim();
            const oldTool = await DatabaseServer.getTool({ messageId: id });
            if (oldTool) {
                throw new Error('The tool already exists');
            }
            const users = new Users();
            const root = await users.getHederaAccount(owner);
            const { tool, errors } = await importToolByMessage(root, id, notifier);
            notifier.completed();
            if (errors?.length) {
                const message = importToolErrors(errors);
                notifier.error(message);
                new Logger().warn(message, ['GUARDIAN_SERVICE']);
            } else {
                notifier.result({
                    toolId: tool.id,
                    errors: []
                });
            }
        }, async (error) => {
            notifier.error(error);
        });
        return new MessageResponse(task);
    });

    ApiResponse(MessageAPI.PUBLISH_TOOL, async (msg) => {
        try {
            const { id, owner } = msg;
            const result = await validateAndPublish(id, owner, emptyNotifier());
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.PUBLISH_TOOL_ASYNC, async (msg) => {
        try {
            const { id, owner, task } = msg;
            const notifier = await initNotifier(task);

            RunFunctionAsync(async () => {
                const result = await validateAndPublish(id, owner, notifier);
                notifier.result(result);
            }, async (error) => {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                notifier.error(error);
            });

            return new MessageResponse(task);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.VALIDATE_TOOL, async (msg) => {
        try {
            const { tool } = msg;
            const results = await validateTool(tool);
            return new MessageResponse({
                results,
                tool
            });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
