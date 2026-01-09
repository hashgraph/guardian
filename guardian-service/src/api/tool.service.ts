import { ApiResponse } from '../api/helpers/api-response.js';
import { BinaryMessageResponse, DatabaseServer, Hashing, INotificationStep, MessageAction, MessageError, MessageResponse, MessageServer, MessageType, NewNotifier, PinoLogger, Policy, PolicyTool, replaceAllEntities, replaceAllVariables, RunFunctionAsync, SchemaFields, ToolImportExport, ToolMessage, TopicConfig, TopicHelper, Users } from '@guardian/common';
import { IOwner, IRootConfig, MessageAPI, ModelHelper, ModuleStatus, PolicyEvents, PolicyStatus, SchemaStatus, TagType, TopicType } from '@guardian/interfaces';
import { ISerializedErrors } from '../policy-engine/policy-validation-results-container.js';
import { PolicyConverterUtils } from '../helpers/import-helpers/policy/policy-converter-utils.js';
import * as crypto from 'crypto';
import { FilterObject } from '@mikro-orm/core';
import { deleteSchema, findAndDryRunSchema, importToolByFile, importToolByMessage, importToolErrors, PolicyImportExportHelper, publishSchemasPackage, publishToolTags, updateToolConfig } from '../helpers/import-helpers/index.js'
import { escapeRegExp } from './helpers/api-helper.js';
import { GuardiansService } from '../helpers/guardians.js';

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
    notifier: INotificationStep
): Promise<any> {
    // <-- Steps
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_LOAD_FILE = 'Load file';
    const STEP_PARSE_FILE = 'Parse tool files';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_ACCOUNT);
    notifier.addStep(STEP_LOAD_FILE);
    notifier.addStep(STEP_PARSE_FILE);
    notifier.start();

    notifier.startStep(STEP_RESOLVE_ACCOUNT);
    if (!messageId) {
        throw new Error('Message ID in body is empty');
    }

    const users = new Users();
    const root = await users.getHederaAccount(user.creator, user.id);
    notifier.completeStep(STEP_RESOLVE_ACCOUNT);

    notifier.startStep(STEP_LOAD_FILE);
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    });
    const message = await messageServer
        .getMessage<ToolMessage>({
            messageId,
            loadIPFS: true,
            userId: user.id,
            interception: null
        });

    if (!message) {
        throw new Error('Invalid Message');
    }

    if (message.type !== MessageType.Tool) {
        throw new Error('Invalid Message Type');
    }

    if (!message.document) {
        throw new Error('file in body is empty');
    }
    notifier.completeStep(STEP_LOAD_FILE);

    notifier.startStep(STEP_PARSE_FILE);
    const result: any = await ToolImportExport.parseZipFile(message.document);
    result.messageId = messageId;
    result.toolTopicId = message.toolTopicId;
    notifier.completeStep(STEP_PARSE_FILE);

    notifier.complete();
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
    version: string,
    user: IOwner,
    notifier: INotificationStep,
    logger: PinoLogger
) {
    // <-- Steps
    const STEP_FIND_TOOL = 'Find and validate tool';
    const STEP_PUBLISH_TOOL = 'Publish tool';
    // Steps -->

    notifier.addStep(STEP_FIND_TOOL);
    notifier.addStep(STEP_PUBLISH_TOOL);
    notifier.start();

    notifier.startStep(STEP_FIND_TOOL);
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
    if (!ModelHelper.checkVersionFormat(version)) {
        throw new Error('Invalid version format');
    }
    if (ModelHelper.versionCompare(version, item.previousVersion) <= 0) {
        throw new Error('Version must be greater than ' + item.previousVersion);
    }

    const countModels = await DatabaseServer.getTools({
        version,
        topicId: item.topicId,
        owner: user.owner
    });
    if (countModels?.length > 0) {
        throw new Error('Tool with current version already was published');
    }

    const errors = await validateTool(item);
    const isValid = !errors.blocks.some(block => !block.isValid);
    notifier.completeStep(STEP_FIND_TOOL);

    if (isValid) {
        notifier.startStep(STEP_PUBLISH_TOOL);
        const newTool = await publishTool(
            item,
            user,
            version,
            notifier.getStep(STEP_PUBLISH_TOOL),
            logger
        );
        notifier.completeStep(STEP_PUBLISH_TOOL);
        notifier.complete();

        return { tool: newTool, isValid, errors };
    } else {
        notifier.skipStep(STEP_PUBLISH_TOOL);
        notifier.complete();

        return { tool: item, isValid, errors };
    }
}

/**
 * Validate tool
 * @param tool
 */
export async function validateTool(tool: PolicyTool): Promise<ISerializedErrors> {
    const result = await (new GuardiansService())
        .sendMessageWithTimeout<any>(PolicyEvents.VALIDATE_TOOL, 60 * 1000, {
            module
        });
    return result;
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
    version: string,
    notifier: INotificationStep,
    logger: PinoLogger
): Promise<PolicyTool> {
    try {
        // <-- Steps
        const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
        const STEP_RESOLVE_TOPIC = 'Find topic';
        const STEP_PUBLISH_SCHEMAS = 'Publish schemas';
        const STEP_CREATE_TAGS_TOPIC = 'Create tags topic';
        const STEP_GENERATE_FILE = 'Generate file';
        const STEP_PUBLISH_TOOL = 'Publish tool';
        const STEP_PUBLISH_TAGS = 'Publish tags';
        const STEP_SAVE = 'Save';
        // Steps -->

        notifier.addStep(STEP_RESOLVE_ACCOUNT);
        notifier.addStep(STEP_RESOLVE_TOPIC);
        notifier.addStep(STEP_PUBLISH_SCHEMAS);
        notifier.addStep(STEP_CREATE_TAGS_TOPIC);
        notifier.addStep(STEP_GENERATE_FILE);
        notifier.addStep(STEP_PUBLISH_TOOL);
        notifier.addStep(STEP_PUBLISH_TAGS);
        notifier.addStep(STEP_SAVE);
        notifier.start();

        await logger.info('Publish tool', ['GUARDIAN_SERVICE'], user.id);

        notifier.startStep(STEP_RESOLVE_ACCOUNT);
        const users = new Users();
        const root = await users.getHederaAccount(user.creator, user.id);
        notifier.completeStep(STEP_RESOLVE_ACCOUNT);

        notifier.startStep(STEP_RESOLVE_TOPIC);
        const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(tool.topicId), true, user.id);
        const messageServer = new MessageServer({
            operatorId: root.hederaAccountId,
            operatorKey: root.hederaAccountKey,
            signOptions: root.signOptions
        }).setTopicObject(topic);
        notifier.completeStep(STEP_RESOLVE_TOPIC);

        tool.version = version;

        notifier.startStep(STEP_PUBLISH_SCHEMAS);
        tool = await publishSchemas(
            tool,
            user,
            root,
            messageServer,
            notifier.getStep(STEP_PUBLISH_SCHEMAS)
        );
        notifier.completeStep(STEP_PUBLISH_SCHEMAS);

        notifier.startStep(STEP_CREATE_TAGS_TOPIC);
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
        notifier.completeStep(STEP_CREATE_TAGS_TOPIC);

        notifier.startStep(STEP_GENERATE_FILE);
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
        notifier.completeStep(STEP_GENERATE_FILE);

        notifier.startStep(STEP_PUBLISH_TOOL);
        const message = new ToolMessage(MessageType.Tool, MessageAction.PublishTool);
        message.setDocument(tool, buffer);
        const result = await messageServer
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId: user.id,
                interception: user.id
            });
        notifier.completeStep(STEP_PUBLISH_TOOL);

        notifier.startStep(STEP_PUBLISH_TAGS);
        try {
            await publishToolTags(tool, user, root, user.id);
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE, TAGS'], user.id);
        }
        notifier.completeStep(STEP_PUBLISH_TAGS);

        notifier.startStep(STEP_SAVE);
        tool.messageId = result.getId();
        tool.status = ModuleStatus.PUBLISHED;
        const retVal = await DatabaseServer.updateTool(tool);
        notifier.completeStep(STEP_SAVE);

        notifier.complete();

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
    server: MessageServer,
    notifier: INotificationStep,
    userId?: string
): Promise<PolicyTool> {
    const schemaMap = new Map<string, string>();
    const schemas = await DatabaseServer.getSchemas({ topicId: tool.topicId });
    await publishSchemasPackage({
        name: tool.name,
        version: '1.0.0',
        type: MessageAction.PublishSchemas,
        schemas,
        owner,
        server,
        schemaMap,
        notifier
    })

    // notifier.setEstimate(schemas.length);

    // let num: number = 0;
    // for (const row of schemas) {
    //     const step = notifier.addStep(`${row.name || '-'}`);
    //     step.setId(row.id);
    //     step.minimize(true);
    //     num++;
    // }

    // const schemaMap = new Map<string, string>();
    // for (const row of schemas) {
    //     const step = notifier.getStepById(row.id);

    //     const schema = await incrementSchemaVersion(row.topicId, row.iri, owner);
    //     if (!schema || schema.status === SchemaStatus.PUBLISHED) {
    //         step.skip();
    //         continue;
    //     }

    //     step.start();
    //     const newSchema = await findAndPublishSchema(
    //         schema.id,
    //         schema.version,
    //         owner,
    //         root,
    //         step,
    //         schemaMap,
    //         userId
    //     );
    //     if (Array.isArray(tool.config?.variables)) {
    //         for (const variable of tool.config?.variables) {
    //             if (variable.baseSchema === row.iri) {
    //                 variable.baseSchema = newSchema.iri;
    //             }
    //         }
    //     }
    //     step.complete();
    // }

    for (const [oldId, newId] of schemaMap.entries()) {
        replaceAllEntities(tool.config, SchemaFields, oldId, newId);
        replaceAllVariables(tool.config, 'Schema', oldId, newId);
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
    notifier: INotificationStep,
    logger: PinoLogger
): Promise<PolicyTool> {
    // <-- Steps
    const STEP_SAVE = 'Save in DB';
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_CREATE_TOPIC = 'Create topic';
    const STEP_CREATE_TOOL = 'Create tool in Hedera';
    const STEP_LINK_TOPIC = 'Link topic and tool';
    // Steps -->

    notifier.addStep(STEP_SAVE);
    notifier.addStep(STEP_RESOLVE_ACCOUNT);
    notifier.addStep(STEP_CREATE_TOPIC);
    notifier.addStep(STEP_CREATE_TOOL);
    notifier.addStep(STEP_LINK_TOPIC);
    notifier.start();

    await logger.info('Create Policy', ['GUARDIAN_SERVICE'], user.id);

    notifier.startStep(STEP_SAVE);
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
    notifier.completeStep(STEP_SAVE);

    try {
        if (!tool.topicId) {
            notifier.startStep(STEP_RESOLVE_ACCOUNT);
            const users = new Users();
            const root = await users.getHederaAccount(user.creator, user.id);
            notifier.completeStep(STEP_RESOLVE_ACCOUNT);

            notifier.startStep(STEP_CREATE_TOPIC);
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
                    userId: user.id,
                    interception: null
                });
            notifier.completeStep(STEP_CREATE_TOOL);

            notifier.startStep(STEP_LINK_TOPIC);
            await topicHelper.twoWayLink(topic, parent, messageStatus.getId(), user.id);

            await DatabaseServer.saveTopic(topic.toObject());
            tool.topicId = topic.topicId;
            await DatabaseServer.updateTool(tool);
            notifier.completeStep(STEP_LINK_TOPIC);
        } else {
            notifier.skipStep(STEP_RESOLVE_ACCOUNT);
            notifier.skipStep(STEP_CREATE_TOPIC);
            notifier.skipStep(STEP_CREATE_TOOL);
            notifier.skipStep(STEP_LINK_TOPIC);
        }

        notifier.complete();

        return tool;
    } catch (error) {
        notifier.fail(error);
        await DatabaseServer.removeTool(tool);
        throw error;
    }
}

/**
 * Dry Run tool
 * @param model
 * @param user
 * @param version
 * @param demo
 * @param logger
 */
export async function dryRunTool(
    tool: PolicyTool,
    user: IOwner,
    version: string,
    logger: PinoLogger
): Promise<PolicyTool> {

    try {
        await logger.info('Dry-run tool', ['GUARDIAN_SERVICE'], user.id);

        const dryRunId = tool.id.toString();
        const databaseServer = new DatabaseServer(dryRunId);

        const users = new Users();
        const root = await users.getHederaAccount(user.creator, user.id);

        const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(tool.topicId), true, user.id);
        const messageServer = new MessageServer({
            operatorId: root.hederaAccountId,
            operatorKey: root.hederaAccountKey,
            signOptions: root.signOptions,
            dryRun: dryRunId
        }).setTopicObject(topic);

        tool = await dryRunSchemas(tool, user);

        const oldToolHash = tool.hash;

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

        const message = new ToolMessage(MessageType.Tool, MessageAction.PublishTool);
        message.setDocument(tool, buffer);
        const result = await messageServer
            .sendMessage(message, {
                sendToIPFS: true,
                memo: null,
                userId: user.id,
                interception: null
            });

        if (tool.messageId) {
            const policies = await DatabaseServer.getPolicies({
                tools: { $elemMatch: { messageId: tool.messageId } }
            })

            for (const item of policies) {
                if (item.status === PolicyStatus.DRAFT) {
                    replaceAllEntities(item.config, ['hash'], oldToolHash, tool.hash);
                    replaceAllEntities(item.config, ['messageId'], tool.messageId, result.getId());

                    const policy = PolicyConverterUtils.PolicyConverter(item);

                    await databaseServer.save(Policy, policy);
                    await PolicyImportExportHelper.updatePolicyComponents(policy, logger, user.id);
                }
            }
        }

        tool.status = ModuleStatus.DRY_RUN;
        tool.messageId = result.getId();
        tool.version = version;
        tool.tagsTopicId = null;
        const retVal = await DatabaseServer.updateTool(tool);

        await logger.info('Dry-run mode for tool enabled', ['GUARDIAN_SERVICE'], user.id);

        return retVal
    } catch (error) {
        tool.status = ModuleStatus.PUBLISH_ERROR;
        await DatabaseServer.updateTool(tool);
        throw error;
    }
}

/**
 * Dry run Policy schemas
 * @param model
 * @param user
 */
export async function dryRunSchemas(
    model: PolicyTool,
    user: IOwner
): Promise<PolicyTool> {
    const schemas = await DatabaseServer.getSchemas({ topicId: model.topicId });
    for (const schema of schemas) {
        if (schema.status === SchemaStatus.PUBLISHED) {
            continue;
        }
        await findAndDryRunSchema(schema, schema.version, user);
    }
    return model;
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
                const item = await createTool(tool, owner, NewNotifier.empty(), logger);
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
            const notifier = await NewNotifier.create(task);
            RunFunctionAsync(async () => {
                const item = await createTool(tool, owner, notifier, logger);
                notifier.result(item.id);
            }, async (error) => {
                notifier.fail(error);
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
                    'status',
                    'version',
                    'previousVersion'
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
                const { pageIndex, pageSize, search, tag } = filters;

                const otherOptions: any = { fields };

                const filter: any = {
                    $or: [
                        {
                            owner: owner.owner
                        },
                        {
                            status: ModuleStatus.PUBLISHED
                        }
                    ]
                }

                if (search) {
                    const sanitizedSearch = escapeRegExp(search.trim());
                    filter.name = { $regex: `.*${sanitizedSearch}.*`, $options: 'i' };
                }

                if (tag) {
                    const filterTags: any = {
                        name: tag,
                        entity: TagType.Tool
                    }
                    const tags = await DatabaseServer.getTags(filterTags);
                    const toolTagIds = tags.map((t) => t.localTarget);
                    filter.id = { $in: toolTagIds };
                }

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

                const [items, count] = await DatabaseServer.getToolsAndCount(filter, otherOptions);

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
                        await deleteSchema(schema.id, owner, NewNotifier.empty());
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
                    status: { $in: [ModuleStatus.PUBLISHED, ModuleStatus.DRY_RUN] }
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
                const preview = await preparePreviewMessage(messageId, owner, NewNotifier.empty());
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
                const { tool, errors } = await importToolByFile(
                    owner, preview, metadata, NewNotifier.empty(), owner.id
                );
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
                const notifier = NewNotifier.empty();
                const users = new Users();
                const root = await users.getHederaAccount(owner.creator, owner?.id);
                const item = await importToolByMessage(root, id, owner, notifier, owner.id);
                notifier.complete();
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
            const notifier = await NewNotifier.create(task);
            RunFunctionAsync(async () => {
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const preview = await ToolImportExport.parseZipFile(Buffer.from(zip.data));
                const { tool, errors } = await importToolByFile(owner, preview, metadata, notifier, owner.id);
                if (errors?.length) {
                    const message = importToolErrors(errors);
                    notifier.fail(message);
                    await logger.warn(message, ['GUARDIAN_SERVICE'], owner?.id);
                } else {
                    notifier.result({
                        toolId: tool.id,
                        errors: []
                    });
                }
            }, async (error) => {
                notifier.fail(error);
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
            const notifier = await NewNotifier.create(task);
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
                notifier.complete();
                if (errors?.length) {
                    const message = importToolErrors(errors);
                    notifier.fail(message);
                    await logger.warn(message, ['GUARDIAN_SERVICE'], owner?.id);
                } else {
                    notifier.result({
                        toolId: tool.id,
                        errors: []
                    });
                }
            }, async (error) => {
                notifier.fail(error);
            });
            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.PUBLISH_TOOL,
        async (msg: {
            id: string,
            owner: IOwner,
            body: { toolVersion: string },
        }) => {
            try {
                const { id, owner, body } = msg;
                if (!body || !body.toolVersion) {
                    throw new Error('Tool version in body is empty');
                }
                const result = await validateAndPublish(id, body.toolVersion, owner, NewNotifier.empty(), logger);
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
            body: { toolVersion: string },
            task: any
        }) => {
            const { id, owner, body, task } = msg;
            try {
                const notifier = await NewNotifier.create(task);

                RunFunctionAsync(async () => {
                    if (!body || !body.toolVersion) {
                        throw new Error('Tool version in body is empty');
                    }
                    const result = await validateAndPublish(id, body.toolVersion, owner, notifier, logger);
                    notifier.result(result);
                }, async (error) => {
                    await logger.error(error, ['GUARDIAN_SERVICE'], owner?.id);
                    notifier.fail(error);
                });

                return new MessageResponse(task);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.DRY_RUN_TOOL,
        async (msg: {
            id: string,
            owner: IOwner
        }) => {
            try {
                const { id, owner } = msg;
                const model = await DatabaseServer.getToolById(id);

                if (!model.config) {
                    throw new Error('The tool is empty');
                }
                if (model.status === ModuleStatus.PUBLISHED) {
                    throw new Error(`Tool published`);
                }
                if (model.status === ModuleStatus.DRY_RUN) {
                    throw new Error(`Tool already in Dry Run`);
                }
                if (model.status === ModuleStatus.PUBLISH_ERROR) {
                    throw new Error(`Failed tool cannot be started in dry run mode`);
                }

                const errors = await validateTool(model);
                const isValid = !errors.blocks.some(block => !block.isValid);
                if (isValid) {
                    await dryRunTool(model, owner, 'Dry Run', logger);
                }

                return new MessageResponse({
                    isValid,
                    errors
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.DRAFT_TOOL,
        async (msg: {
            id: string,
            owner: IOwner
        }) => {
            try {
                const { id } = msg;
                const model = await DatabaseServer.getToolById(id);

                if (!model.config) {
                    throw new Error('The tool is empty');
                }
                if (model.status === ModuleStatus.PUBLISHED) {
                    throw new Error(`Tool published`);
                }
                if (model.status === ModuleStatus.DRAFT) {
                    throw new Error(`Tool already in draft`);
                }

                if (model.messageId) {
                    const policies = await DatabaseServer.getPolicies({
                        tools: { $elemMatch: { messageId: model.messageId } }
                    })

                    if (policies.length > 0 && policies.find(policy => policy.status === PolicyStatus.DRY_RUN)) {
                        throw new Error(`Tool used in running policy`);
                    }
                }

                model.status = ModuleStatus.DRAFT;
                model.version = null;
                model.hash = null;
                model.messageId = null;
                model.tagsTopicId = null;

                await DatabaseServer.updateTool(model);

                return new MessageResponse(true);
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

    ApiResponse(MessageAPI.CHECK_TOOL,
        async (msg: {
            messageId: string,
            owner: IOwner
        }) => {
            try {
                const { messageId, owner } = msg;
                const tool = await DatabaseServer.getTool({
                    messageId,
                    status: ModuleStatus.PUBLISHED
                });
                if (tool) {
                    return new MessageResponse(true);
                }
                const preview = await preparePreviewMessage(messageId, owner, NewNotifier.empty());
                return new MessageResponse(!!preview);
            } catch (error) {
                return new MessageResponse(false);
            }
        });
}
