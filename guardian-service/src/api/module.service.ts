import { ApiResponse } from '../api/helpers/api-response.js';
import { BinaryMessageResponse, DatabaseServer, INotificationStep, MessageAction, MessageError, MessageResponse, MessageServer, MessageType, ModuleImportExport, ModuleMessage, NewNotifier, PinoLogger, PolicyModule, TagMessage, TopicConfig, TopicHelper, Users } from '@guardian/common';
import { GenerateUUIDv4, IOwner, MessageAPI, ModuleStatus, PolicyEvents, SchemaCategory, TagType, TopicType } from '@guardian/interfaces';
import { ISerializedErrors } from '../policy-engine/policy-validation-results-container.js';
import { importTag } from '../helpers/import-helpers/index.js';
import { GuardiansService } from '../helpers/guardians.js';

/**
 * Check and update config file
 * @param module module
 *
 * @returns module
 */
export function updateModuleConfig(module: PolicyModule): PolicyModule {
    module.config = module.config || {};
    module.config.permissions = module.config.permissions || [];
    module.config.children = module.config.children || [];
    module.config.events = module.config.events || [];
    module.config.artifacts = module.config.artifacts || [];
    module.config.variables = module.config.variables || [];
    module.config.inputEvents = module.config.inputEvents || [];
    module.config.outputEvents = module.config.outputEvents || [];
    module.config.innerEvents = module.config.innerEvents || [];
    return module;
}

/**
 * Prepare module for preview by message
 * @param messageId
 * @param user
 * @param notifier
 */
export async function preparePreviewMessage(
    messageId: string,
    user: IOwner,
    notifier: INotificationStep
): Promise<any> {
    // <-- Steps
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_PARSE_FILES = 'Parse module files';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_ACCOUNT);
    notifier.addStep(STEP_PARSE_FILES);
    notifier.start();

    notifier.startStep(STEP_RESOLVE_ACCOUNT);
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
        .getMessage<ModuleMessage>({
            messageId,
            loadIPFS: true,
            userId: user.id,
            interception: null
        });
    if (message.type !== MessageType.Module) {
        throw new Error('Invalid Message Type');
    }

    if (!message.document) {
        throw new Error('file in body is empty');
    }
    notifier.completeStep(STEP_RESOLVE_ACCOUNT);

    notifier.startStep(STEP_PARSE_FILES);
    const result: any = await ModuleImportExport.parseZipFile(message.document);
    result.messageId = messageId;
    result.moduleTopicId = message.moduleTopicId;
    notifier.completeStep(STEP_PARSE_FILES);

    notifier.complete();
    return result;
}

/**
 * Validate and publish module
 * @param model
 * @param policyId
 * @param owner
 * @param notifier
 * @param logger
 */
export async function validateAndPublish(
    uuid: string,
    user: IOwner,
    notifier: INotificationStep,
    logger: PinoLogger
) {
    // <-- Steps
    const STEP_VALIDATE_MODULE = 'Find and validate module';
    const STEP_PUBLISH_MODULE = 'Publish module';
    // Steps -->

    notifier.addStep(STEP_VALIDATE_MODULE);
    notifier.addStep(STEP_PUBLISH_MODULE);
    notifier.start();

    notifier.startStep(STEP_VALIDATE_MODULE);
    const item = await DatabaseServer.getModuleByUUID(uuid);
    if (!item) {
        throw new Error('Unknown module');
    }
    if (!item.config) {
        throw new Error('The module is empty');
    }
    if (item.status === ModuleStatus.PUBLISHED) {
        throw new Error(`Module already published`);
    }

    const errors = await validateModel(item);
    const isValid = !errors.blocks.some(block => !block.isValid);
    notifier.completeStep(STEP_VALIDATE_MODULE);

    if (isValid) {
        notifier.startStep(STEP_PUBLISH_MODULE);
        const newModule = await publishModule(
            item,
            user,
            notifier.getStep(STEP_PUBLISH_MODULE),
            logger
        );
        notifier.completeStep(STEP_PUBLISH_MODULE);

        notifier.complete();
        return { item: newModule, isValid, errors };
    } else {
        notifier.complete();
        return { item, isValid, errors };
    }
}

/**
 * Validate Model
 * @param module
 */
export async function validateModel(module: PolicyModule): Promise<ISerializedErrors> {
    const result = await (new GuardiansService())
        .sendMessageWithTimeout<any>(PolicyEvents.VALIDATE_MODULE, 60 * 1000, { module });
    return result;
}

/**
 * Publish module
 * @param model
 * @param owner
 * @param version
 * @param notifier
 * @param logger
 */
export async function publishModule(
    model: PolicyModule,
    user: IOwner,
    notifier: INotificationStep,
    logger: PinoLogger
): Promise<PolicyModule> {
    // <-- Steps
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_RESOLVE_TOPIC = 'Find topic';
    const STEP_CREATE_TOPIC = 'Create module topic';
    const STEP_GENERATE_FILE = 'Generate file';
    const STEP_SAVE_FILE_IN_DB = 'Save file in database';
    const STEP_PUBLISH_MODULE = 'Publish module';
    const STEP_LINK_TOPIC = 'Link topic and module';
    const STEP_SAVE = 'Save';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_ACCOUNT);
    notifier.addStep(STEP_RESOLVE_TOPIC);
    notifier.addStep(STEP_CREATE_TOPIC);
    notifier.addStep(STEP_GENERATE_FILE);
    notifier.addStep(STEP_SAVE_FILE_IN_DB);
    notifier.addStep(STEP_PUBLISH_MODULE);
    notifier.addStep(STEP_LINK_TOPIC);
    notifier.addStep(STEP_SAVE);
    notifier.start();

    logger.info('Publish module', ['GUARDIAN_SERVICE'], user.id);

    notifier.startStep(STEP_RESOLVE_ACCOUNT);
    const users = new Users();
    const root = await users.getHederaAccount(user.owner, user.id);
    notifier.completeStep(STEP_RESOLVE_ACCOUNT);

    notifier.startStep(STEP_RESOLVE_TOPIC);
    const userTopic = await TopicConfig.fromObject(
        await DatabaseServer.getTopicByType(user.owner, TopicType.UserTopic),
        true, user.id
    );
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    }).setTopicObject(userTopic);
    notifier.completeStep(STEP_RESOLVE_TOPIC);

    notifier.startStep(STEP_CREATE_TOPIC);
    const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
    const rootTopic = await topicHelper.create({
        type: TopicType.ModuleTopic,
        name: model.name || TopicType.ModuleTopic,
        description: TopicType.ModuleTopic,
        owner: user.owner,
        policyId: null,
        policyUUID: null
    }, user.id);
    await rootTopic.saveKeys(user.id);
    await DatabaseServer.saveTopic(rootTopic.toObject());

    model.topicId = rootTopic.topicId;
    notifier.completeStep(STEP_CREATE_TOPIC);

    notifier.startStep(STEP_GENERATE_FILE);
    model = updateModuleConfig(model);
    const zip = await ModuleImportExport.generate(model);
    const buffer = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 3
        },
        platform: 'UNIX',
    });
    notifier.completeStep(STEP_GENERATE_FILE);

    notifier.startStep(STEP_SAVE_FILE_IN_DB);
    model.contentFileId = await DatabaseServer.saveFile(GenerateUUIDv4(), Buffer.from(buffer));
    notifier.completeStep(STEP_SAVE_FILE_IN_DB);

    notifier.startStep(STEP_PUBLISH_MODULE);
    const message = new ModuleMessage(MessageType.Module, MessageAction.PublishModule);
    message.setDocument(model, buffer);
    const result = await messageServer
        .sendMessage(message, {
            sendToIPFS: true,
            memo: null,
            userId: user.id,
            interception: null
        });
    model.messageId = result.getId();
    model.status = ModuleStatus.PUBLISHED;
    notifier.completeStep(STEP_PUBLISH_MODULE);

    notifier.startStep(STEP_LINK_TOPIC);
    await topicHelper.twoWayLink(rootTopic, userTopic, result.getId(), user.id);
    notifier.completeStep(STEP_LINK_TOPIC);

    logger.info('Published module', ['GUARDIAN_SERVICE'], user.id);

    notifier.startStep(STEP_SAVE);
    const retVal = await DatabaseServer.updateModule(model);
    notifier.completeStep(STEP_SAVE);

    notifier.complete();
    return retVal
}

/**
 * Connect to the message broker methods of working with modules.
 */
export async function modulesAPI(logger: PinoLogger): Promise<void> {
    /**
     * Create new module
     *
     * @param payload - module
     *
     * @returns {PolicyModule} new module
     */
    ApiResponse(MessageAPI.CREATE_MODULE,
        async (msg: { module: PolicyModule, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid Params');
                }
                const { module, owner } = msg;
                module.creator = owner.creator;
                module.owner = owner.owner;
                module.type = 'CUSTOM';
                module.status = ModuleStatus.DRAFT;
                updateModuleConfig(module);

                const item = await DatabaseServer.createModules(module);
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_MODULES,
        async (msg: { filters: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid load modules parameter');
                }

                const { filters, owner } = msg;
                const filter: any = {}
                if (owner) {
                    filter.owner = owner.owner;
                }

                const otherOptions: any = {};
                const _pageSize = parseInt(filters?.pageSize, 10);
                const _pageIndex = parseInt(filters?.pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = _pageSize;
                    otherOptions.offset = _pageIndex * _pageSize;
                } else {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = 100;
                }

                const [items, count] = await DatabaseServer.getModulesAndCount(filter, otherOptions);

                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get Modules V2 06.06.2024
     */
    ApiResponse(MessageAPI.GET_MODULES_V2,
        async (msg: { filters: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid load modules parameter');
                }

                const { filters, owner } = msg;
                const { fields, pageIndex, pageSize } = filters ?? {};
                const filter: any = {}
                if (owner) {
                    filter.owner = owner.owner;
                }

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

                const [items, count] = await DatabaseServer.getModulesAndCount(filter, otherOptions);

                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.DELETE_MODULES,
        async (msg: { uuid: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { uuid, owner } = msg;
                if (!uuid || !owner) {
                    return new MessageError('Invalid load modules parameter');
                }
                const item = await DatabaseServer.getModuleByUUID(uuid);
                if (!item || item.owner !== owner.owner) {
                    throw new Error('Invalid module');
                }
                await DatabaseServer.removeModule(item);
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_MENU_MODULES,
        async (msg: { owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { owner } = msg;
                if (!owner) {
                    return new MessageError('Invalid load modules parameter');
                }
                const items = await DatabaseServer.getModules({
                    owner: owner.owner
                });
                for (const item of items) {
                    if (item.config?.variables) {
                        for (const variable of item.config.variables) {
                            if (variable.baseSchema) {
                                variable.baseSchema = await DatabaseServer.getSchema({ iri: variable.baseSchema });
                            }
                        }
                    }
                }
                return new MessageResponse(items);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.UPDATE_MODULES,
        async (msg: { uuid: string, module: PolicyModule, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    return new MessageError('Invalid load modules parameter');
                }
                const { uuid, module, owner } = msg;
                const item = await DatabaseServer.getModuleByUUID(uuid);
                if (!item || item.owner !== owner.owner) {
                    throw new Error('Invalid module');
                }
                if (item.status === ModuleStatus.PUBLISHED) {
                    throw new Error('Module published');
                }

                item.config = module.config;
                item.name = module.name;
                item.description = module.description;
                updateModuleConfig(item);

                const result = await DatabaseServer.updateModule(item);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_MODULE,
        async (msg: { uuid: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { uuid, owner } = msg;
                if (!uuid || !owner) {
                    return new MessageError('Invalid load modules parameter');
                }
                const item = await DatabaseServer.getModuleByUUID(uuid);
                if (!item || item.owner !== owner.owner) {
                    throw new Error('Invalid module');
                }
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.MODULE_EXPORT_FILE,
        async (msg: { uuid: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { uuid, owner } = msg;
                if (!uuid || !owner) {
                    return new MessageError('Invalid load modules parameter');
                }

                const item = await DatabaseServer.getModuleByUUID(uuid);
                if (!item || item.owner !== owner.owner) {
                    throw new Error('Invalid module');
                }

                if (item.status === ModuleStatus.PUBLISHED && item.contentFileId) {
                    const buffer = await DatabaseServer.loadFile(item.contentFileId);
                    const arrayBuffer = Uint8Array.from(buffer).buffer;

                    return new BinaryMessageResponse(arrayBuffer);
                }

                updateModuleConfig(item);
                const zip = await ModuleImportExport.generate(item);
                const file = await zip.generateAsync({
                    type: 'arraybuffer',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 3,
                    },
                    platform: 'UNIX',
                });
                return new BinaryMessageResponse(file);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.MODULE_EXPORT_MESSAGE,
        async (msg: { uuid: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { uuid, owner } = msg;
                if (!uuid || !owner) {
                    return new MessageError('Invalid load modules parameter');
                }

                const item = await DatabaseServer.getModuleByUUID(uuid);
                if (!item || item.owner !== owner.owner) {
                    throw new Error('Invalid module');
                }

                return new MessageResponse({
                    uuid: item.uuid,
                    name: item.name,
                    description: item.description,
                    messageId: item.messageId,
                    owner: item.owner
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.MODULE_IMPORT_FILE_PREVIEW,
        async (msg: { zip: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { zip } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }
                const preview = await ModuleImportExport.parseZipFile(Buffer.from(zip.data));
                return new MessageResponse(preview);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.MODULE_IMPORT_MESSAGE_PREVIEW,
        async (msg: { messageId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { messageId, owner } = msg;
                const preview = await preparePreviewMessage(messageId, owner, NewNotifier.empty());
                return new MessageResponse(preview);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.MODULE_IMPORT_FILE,
        async (msg: { zip: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { zip, owner } = msg;
                if (!zip) {
                    throw new Error('file in body is empty');
                }

                const preview = await ModuleImportExport.parseZipFile(Buffer.from(zip.data));

                const { module, tags, schemas } = preview;
                delete module._id;
                delete module.id;
                delete module.messageId;
                delete module.createDate;
                module.uuid = GenerateUUIDv4();
                module.creator = owner.creator;
                module.owner = owner.owner;
                module.status = ModuleStatus.DRAFT;
                module.type = 'CUSTOM';
                if (await DatabaseServer.getModule({ name: module.name })) {
                    module.name = module.name + '_' + Date.now();
                }
                const item = await DatabaseServer.createModules(module);

                if (Array.isArray(tags)) {
                    const moduleTags = tags.filter((t: any) => t.entity === TagType.Module);
                    await importTag(moduleTags, item.id.toString());
                }

                if (Array.isArray(schemas)) {
                    const schemaObjects = []

                    for (const schema of schemas) {
                        const schemaObject = DatabaseServer.createSchema(schema);
                        schemaObject.category = SchemaCategory.MODULE;

                        schemaObjects.push(schemaObject);
                    }
                    await DatabaseServer.saveSchemas(schemaObjects);
                }

                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.MODULE_IMPORT_MESSAGE,
        async (msg: { messageId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { messageId, owner } = msg;
                if (!messageId) {
                    throw new Error('Message ID in body is empty');
                }

                const notifier = NewNotifier.empty();
                const preview = await preparePreviewMessage(messageId, owner, notifier);

                const { module, tags, moduleTopicId } = preview;
                delete module._id;
                delete module.id;
                delete module.messageId;
                delete module.createDate;
                module.uuid = GenerateUUIDv4();
                module.creator = owner.creator;
                module.owner = owner.owner;
                module.status = ModuleStatus.DRAFT;
                module.type = 'CUSTOM';
                if (await DatabaseServer.getModule({ name: module.name })) {
                    module.name = module.name + '_' + Date.now();
                }
                const item = await DatabaseServer.createModules(module);

                if (moduleTopicId) {
                    const messageServer = new MessageServer(null);
                    const tagMessages = await messageServer.getMessages<TagMessage>(
                        moduleTopicId,
                        userId,
                        MessageType.Tag,
                        MessageAction.PublishTag
                    );
                    for (const tag of tagMessages) {
                        if (tag.entity === TagType.Module && tag.target === messageId) {
                            tags.push({
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
                            });
                        }
                    }
                }
                if (tags.length) {
                    const moduleTags = tags.filter((t: any) => t.entity === TagType.Module);
                    await importTag(moduleTags, item.id.toString());
                }
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.PUBLISH_MODULES,
        async (msg: { uuid: string, owner: IOwner, module: PolicyModule, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { uuid, owner } = msg;
                const result = await validateAndPublish(uuid, owner, NewNotifier.empty(), logger);
                return new MessageResponse({
                    module: result.item,
                    isValid: result.isValid,
                    errors: result.errors,
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.VALIDATE_MODULES,
        async (msg: { owner: IOwner, module: PolicyModule, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { module } = msg;
                const results = await validateModel(module);
                return new MessageResponse({
                    results,
                    module
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });
}
