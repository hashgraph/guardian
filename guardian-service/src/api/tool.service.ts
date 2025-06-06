import { ApiResponse } from '../api/helpers/api-response.js';
import { BinaryMessageResponse, DatabaseServer, Hashing, MessageAction, MessageError, MessageResponse, MessageServer, MessageType, PinoLogger, PolicyTool, replaceAllEntities, replaceAllVariables, RunFunctionAsync, SchemaFields, ToolImportExport, ToolMessage, TopicConfig, TopicHelper, Users } from '@guardian/common';
import { IOwner, IRootConfig, MessageAPI, ModuleStatus, SchemaStatus, TopicType } from '@guardian/interfaces';
import { emptyNotifier, initNotifier, INotifier } from '../helpers/notifier.js';
import { ISerializedErrors } from '../policy-engine/policy-validation-results-container.js';
import { ToolValidator } from '../policy-engine/block-validators/tool-validator.js';
import { PolicyConverterUtils } from '../helpers/import-helpers/policy/policy-converter-utils.js';
import * as crypto from 'crypto';
import { FilterObject } from '@mikro-orm/core';
import { deleteSchema, findAndPublishSchema, importToolByFile, importToolByMessage, importToolErrors, incrementSchemaVersion, publishToolTags, updateToolConfig } from '../helpers/import-helpers/index.js'

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
    user: IOwner,
    notifier: INotifier
): Promise<any> {
    notifier.start('Resolve Hedera account');
    if (!messageId) {
        throw new Error('Message ID in body is empty');
    }

    const users = new Users();
    const root = await users.getHederaAccount(user.creator, user.id);
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    });
    const message = await messageServer
        .getMessage<ToolMessage>({
            messageId,
            loadIPFS: true,
            userId: user.id
        });
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
 * @param logger
 */
export async function validateAndPublish(
    id: string,
    user: IOwner,
    notifier: INotifier,
    logger: PinoLogger
) {
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
        const newTool = await publishTool(item, user, notifier, logger);
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
 * @param user
 * @param notifier
 * @param logger
 */
export async function publishTool(
    tool: PolicyTool,
    user: IOwner,
    notifier: INotifier,
    logger: PinoLogger
): Promise<PolicyTool> {
    try {
        await logger.info('Publish tool', ['GUARDIAN_SERVICE'], user.id);

        notifier.start('Resolve Hedera account');
        const users = new Users();
        const root = await users.getHederaAccount(user.creator, user.id);

        notifier.completedAndStart('Find topic');
        const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(tool.topicId), true, user.id);
        const messageServer = new MessageServer({
            operatorId: root.hederaAccountId,
            operatorKey: root.hederaAccountKey,
            signOptions: root.signOptions
        }).setTopicObject(topic);

        notifier.completedAndStart('Publish schemas');
        tool = await publishSchemas(tool, user, root, notifier);

        notifier.completedAndStart('Create tags topic');
        const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
        const tagsTopic = await topicHelper.create({
            type: TopicType.TagsTopic,
            name: tool.name || TopicType.TagsTopic,
            description: tool.description || TopicType.TagsTopic,
            owner: user.owner,
            policyId: tool.id.toString(),
            policyUUID: tool.uuid
        }, user.id, { admin: true, submit: false });
        await tagsTopic.saveKeys(user.id);
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
            .sendMessage(message, true, null, user.id);

        notifier.completedAndStart('Publish tags');
        try {
            await publishToolTags(tool, user, root, user.id);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE, TAGS'], user.id);
        }

        notifier.completedAndStart('Saving in DB');
        tool.messageId = result.getId();
        tool.status = ModuleStatus.PUBLISHED;
        const retVal = await DatabaseServer.updateTool(tool);

        notifier.completed();

        await logger.info('Published tool', ['GUARDIAN_SERVICE'], user.id);

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
 * @param userId
 */
export async function publishSchemas(
    tool: PolicyTool,
    owner: IOwner,
    root: IRootConfig,
    notifier: INotifier,
    userId?: string
): Promise<PolicyTool> {
    const schemas = await DatabaseServer.getSchemas({ topicId: tool.topicId });

    notifier.info(`Found ${schemas.length} schemas`);

    let num: number = 0;
    let skipped: number = 0;
    const schemaMap = new Map<string, string>();
    for (const row of schemas) {
        const schema = await incrementSchemaVersion(row.topicId, row.iri, owner);
        if (!schema || schema.status === SchemaStatus.PUBLISHED) {
            skipped++;
            continue;
        }
        const newSchema = await findAndPublishSchema(
            schema.id,
            schema.version,
            owner,
            root,
            emptyNotifier(),
            schemaMap,
            userId
        );
        if (Array.isArray(tool.config?.variables)) {
            for (const variable of tool.config?.variables) {
                if (variable.baseSchema === row.iri) {
                    variable.baseSchema = newSchema.iri;
                }
            }
        }
        const name = newSchema.name;
        num++;
        notifier.info(`Schema ${num} (${name || '-'}) published`);
    }

    for (const [oldId, newId] of schemaMap.entries()) {
        replaceAllEntities(tool.config, SchemaFields, oldId, newId);
        replaceAllVariables(tool.config, 'Schema', oldId, newId);
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
 * @param logger
 */
export async function createTool(
    json: PolicyTool,
    user: IOwner,
    notifier: INotifier,
    logger: PinoLogger
): Promise<PolicyTool> {
    await logger.info('Create Policy', ['GUARDIAN_SERVICE'], user.id);
    notifier.start('Save in DB');
    if (json) {
        delete json._id;
        delete json.id;
        delete json.status;
        delete json.owner;
        delete json.messageId;
    }
    json.creator = user.creator;
    json.owner = user.owner;
    json.status = ModuleStatus.DRAFT;
    json.codeVersion = PolicyConverterUtils.VERSION;

    json = await updateToolConfig(json);
    const tool = await DatabaseServer.createTool(json);

    try {
        if (!tool.topicId) {
            notifier.completedAndStart('Resolve Hedera account');
            const users = new Users();
            const root = await users.getHederaAccount(user.creator, user.id);

            notifier.completedAndStart('Create topic');
            await logger.info('Create Tool: Create New Topic', ['GUARDIAN_SERVICE'], user.id);
            const parent = await TopicConfig.fromObject(
                await DatabaseServer.getTopicByType(user.owner, TopicType.UserTopic), true, user.id
            );
            const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
            const topic = await topicHelper.create({
                type: TopicType.ToolTopic,
                name: tool.name || TopicType.ToolTopic,
                description: tool.description || TopicType.ToolTopic,
                owner: user.owner,
                targetId: tool.id.toString(),
                targetUUID: tool.uuid
            }, user.id, { admin: true, submit: true });
            await topic.saveKeys(user.id);

            notifier.completedAndStart('Create tool in Hedera');
            const messageServer = new MessageServer({
                operatorId: root.hederaAccountId,
                operatorKey: root.hederaAccountKey,
                signOptions: root.signOptions
            });
            const message = new ToolMessage(MessageType.Tool, MessageAction.CreateTool);
            message.setDocument(tool);
            const messageStatus = await messageServer
                .setTopicObject(parent)
                .sendMessage(message, true, null, user.id);

            notifier.completedAndStart('Link topic and tool');
            await topicHelper.twoWayLink(topic, parent, messageStatus.getId(), user.id);

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
export async function toolsAPI(logger: PinoLogger): Promise<void> {
    /**
     * Create new tool
     *
     * @param payload - tool
     *
     * @returns {PolicyTool} new tool
     */
    ApiResponse(MessageAPI.CREATE_TOOL,
        async (msg: {
            tool: PolicyTool,
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid Params');
                }
                const { tool, owner } = msg;
                const item = await createTool(tool, owner, emptyNotifier(), logger);
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
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
    ApiResponse(MessageAPI.CREATE_TOOL_ASYNC,
        async (msg: {
            tool: PolicyTool,
            owner: IOwner,
            task: any
        }) => {
            if (!msg) {
                throw new Error('Invalid Params');
            }
            const { tool, owner, task } = msg;
            const notifier = await initNotifier(task);
            RunFunctionAsync(async () => {
                const item = await createTool(tool, owner, notifier, logger);
                notifier.result(item.id);
            }, async (error) => {
                notifier.error(error);
            });
            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.GET_TOOLS,
        async (msg: {
            filters: any,
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tools parameter');
                }
                const { filters, owner } = msg;
                const { pageIndex, pageSize } = filters;

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
                        owner: owner.owner
                    }, {
                        status: ModuleStatus.PUBLISHED
                    }]
                } as FilterObject<PolicyTool>, otherOptions);
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    /**
     * Get tools V2 05.06.2024
     */
    ApiResponse(MessageAPI.GET_TOOLS_V2,
        async (msg: {
            fields: string[],
            filters: any,
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tools parameter');
                }
                const { fields, filters, owner } = msg;
                const { pageIndex, pageSize } = filters;

                const otherOptions: any = { fields };

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

                const [items, count] = await DatabaseServer.getToolsAndCount({
                    $or: [{
                        owner: owner.owner
                    }, {
                        status: ModuleStatus.PUBLISHED
                    }]
                } as FilterObject<PolicyTool>, otherOptions);

                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.DELETE_TOOL,
        async (msg: {
            id: string,
            owner: IOwner
        }) => {
            try {
                const { id, owner } = msg;
                if (!id || !owner) {
                    return new MessageError('Invalid load tools parameter');
                }
                const item = await DatabaseServer.getToolById(id);
                if (!item || item.owner !== owner.owner) {
                    throw new Error('Invalid tool');
                }
                if (item.status === ModuleStatus.PUBLISHED) {
                    throw new Error('Tool published');
                }
                await DatabaseServer.removeTool(item);
                const schemasToDelete = await DatabaseServer.getSchemas({
                    topicId: item.topicId,
                    readonly: false
                });
                for (const schema of schemasToDelete) {
                    if (schema.status === SchemaStatus.DRAFT) {
                        await deleteSchema(schema.id, owner, emptyNotifier());
                    }
                }
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_MENU_TOOLS,
        async (msg: {
            owner: IOwner
        }) => {
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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.UPDATE_TOOL,
        async (msg: {
            id: string,
            tool: PolicyTool,
            owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tools parameter');
                }
                const { id, tool, owner } = msg;
                const item = await DatabaseServer.getToolById(id);
                if (!item || item.owner !== owner.owner) {
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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_TOOL,
        async (msg: {
            id: string,
            owner: IOwner
        }) => {
            try {
                const { id, owner } = msg;
                if (!id || !owner) {
                    return new MessageError('Invalid load tools parameter');
                }
                const item = await DatabaseServer.getToolById(id);
                if (!item) {
                    throw new Error('Invalid tool');
                }
                if (item.status !== ModuleStatus.PUBLISHED && item.owner !== owner.owner) {
                    throw new Error('Invalid tool');
                }
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.TOOL_EXPORT_FILE,
        async (msg: {
            id: string,
            owner: IOwner
        }) => {
            try {
                const { id, owner } = msg;
                if (!id || !owner) {
                    return new MessageError('Invalid load tools parameter');
                }

                const item = await DatabaseServer.getToolById(id);
                if (!item) {
                    throw new Error('Invalid tool');
                }
                if (item.status !== ModuleStatus.PUBLISHED && item.owner !== owner.owner) {
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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.TOOL_EXPORT_MESSAGE,
        async (msg: {
            id: string,
            owner: IOwner
        }) => {
            try {
                const { id, owner } = msg;
                if (!id || !owner) {
                    return new MessageError('Invalid load tools parameter');
                }

                const item = await DatabaseServer.getToolById(id);
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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.TOOL_IMPORT_FILE_PREVIEW,
        async (msg: {
            zip: any,
            owner: IOwner
        }) => {
            try {
                const { zip } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const preview = await ToolImportExport.parseZipFile(Buffer.from(zip.data));
                return new MessageResponse(preview);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.TOOL_IMPORT_MESSAGE_PREVIEW,
        async (msg: {
            messageId: string,
            owner: IOwner
        }) => {
            try {
                const { messageId, owner } = msg;
                const preview = await preparePreviewMessage(messageId, owner, emptyNotifier());
                return new MessageResponse(preview);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.TOOL_IMPORT_FILE,
        async (msg: {
            zip: any,
            owner: IOwner,
            metadata: any
        }) => {
            try {
                const { zip, owner, metadata } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const preview = await ToolImportExport.parseZipFile(Buffer.from(zip.data));
                const { tool, errors } = await importToolByFile(owner, preview, emptyNotifier(), metadata, owner.id);
                if (errors?.length) {
                    const message = importToolErrors(errors);
                    await logger.warn(message, ['GUARDIAN_SERVICE'], owner?.id);
                    return new MessageError(message);
                } else {
                    return new MessageResponse(tool);
                }
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.TOOL_IMPORT_MESSAGE,
        async (msg: {
            messageId: string,
            owner: IOwner,
        }) => {
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
                const root = await users.getHederaAccount(owner.creator, owner?.id);
                const item = await importToolByMessage(root, id, owner, notifier, owner.id);
                notifier.completed();
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.TOOL_IMPORT_FILE_ASYNC,
        async (msg: {
            zip: any,
            owner: IOwner,
            metadata: any,
            task: any
        }) => {
            const { zip, owner, task, metadata } = msg;
            const notifier = await initNotifier(task);
            RunFunctionAsync(async () => {
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const preview = await ToolImportExport.parseZipFile(Buffer.from(zip.data));
                const { tool, errors } = await importToolByFile(owner, preview, notifier, metadata, owner.id);
                if (errors?.length) {
                    const message = importToolErrors(errors);
                    notifier.error(message);
                    await logger.warn(message, ['GUARDIAN_SERVICE'], owner?.id);
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

    ApiResponse(MessageAPI.TOOL_IMPORT_MESSAGE_ASYNC,
        async (msg: {
            messageId: string,
            owner: IOwner,
            task: any
        }) => {
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
                const root = await users.getHederaAccount(owner.creator, owner?.id);
                const { tool, errors } = await importToolByMessage(root, id, owner, notifier, owner.id);
                notifier.completed();
                if (errors?.length) {
                    const message = importToolErrors(errors);
                    notifier.error(message);
                    await logger.warn(message, ['GUARDIAN_SERVICE'], owner?.id);
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

    ApiResponse(MessageAPI.PUBLISH_TOOL,
        async (msg: {
            id: string,
            owner: IOwner,
            tool: PolicyTool
        }) => {
            try {
                const { id, owner } = msg;
                const result = await validateAndPublish(id, owner, emptyNotifier(), logger);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.PUBLISH_TOOL_ASYNC,
        async (msg: {
            id: string,
            owner: IOwner,
            tool: PolicyTool,
            task: any
        }) => {
            const { id, owner, task } = msg;
            try {
                const notifier = await initNotifier(task);

                RunFunctionAsync(async () => {
                    const result = await validateAndPublish(id, owner, notifier, logger);
                    notifier.result(result);
                }, async (error) => {
                    await logger.error(error, ['GUARDIAN_SERVICE'], owner?.id);
                    notifier.error(error);
                });

                return new MessageResponse(task);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.VALIDATE_TOOL,
        async (msg: {
            owner: IOwner,
            tool: PolicyTool
        }) => {
            const { tool } = msg;
            try {
                const results = await validateTool(tool);
                return new MessageResponse({
                    results,
                    tool
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });
}
