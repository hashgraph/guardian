import { ApiResponse } from '@api/api-response';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger, BinaryMessageResponse } from '@guardian/common';
import { GenerateUUIDv4, MessageAPI, ModuleStatus, TopicType } from '@guardian/interfaces';
import { DatabaseServer } from '@database-modules';
import { PolicyModule } from '@entity/module';
import JSZip from 'jszip';
import { emptyNotifier, INotifier } from '@helpers/notifier';
import { MessageAction, MessageServer, MessageType, ModuleMessage, TopicConfig } from '@hedera-modules';
import { Users } from '@helpers/users';
import { ISerializedErrors } from '@policy-engine/policy-validation-results-container';
import { ModuleValidator } from '@policy-engine/block-validators/module-validator';

/**
 * Generate Zip File
 * @param module module to pack
 *
 * @returns Zip file
 */
export async function generateZipFile(module: PolicyModule): Promise<JSZip> {
    const moduleObject = { ...module };
    delete moduleObject._id;
    delete moduleObject.id;
    delete moduleObject.uuid;
    delete moduleObject.messageId;
    delete moduleObject.status;
    delete moduleObject.topicId;
    delete moduleObject.createDate;
    const zip = new JSZip();
    zip.file('module.json', JSON.stringify(moduleObject));
    return zip;
}

/**
 * Parse zip module file
 * @param zipFile Zip file
 * @returns Parsed module
 */
export async function parseZipFile(zipFile: any): Promise<any> {
    const zip = new JSZip();
    const content = await zip.loadAsync(zipFile);
    if (!content.files['module.json'] || content.files['module.json'].dir) {
        throw new Error('Zip file is not a module');
    }
    const moduleString = await content.files['module.json'].async('string');
    const module = JSON.parse(moduleString);
    return { module };
}


/**
 * Prepare module for preview by message
 * @param messageId
 * @param owner
 * @param notifier
 */
export async function preparePreviewMessage(messageId: string, owner: string, notifier: INotifier): Promise<any> {
    notifier.start('Resolve Hedera account');
    if (!messageId) {
        throw new Error('Message ID in body is empty');
    }

    const users = new Users();
    const root = await users.getHederaAccount(owner);
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
    const message = await messageServer.getMessage<ModuleMessage>(messageId);
    if (message.type !== MessageType.Module) {
        throw new Error('Invalid Message Type');
    }

    if (!message.document) {
        throw new Error('file in body is empty');
    }

    notifier.completedAndStart('Parse module files');
    const json = await parseZipFile(message.document);

    notifier.completed();
    return json;
}



/**
 * Validate and publish module
 * @param model
 * @param policyId
 * @param owner
 * @param notifier
 */
export async function validateAndPublish(uuid: string, owner: string, notifier: INotifier) {
    notifier.start('Find and validate module');
    const item = await DatabaseServer.getModuleById(uuid);
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
    notifier.completed();
    if (isValid) {
        const newModule = await publishModule(item, owner, notifier);
        return { item: newModule, isValid, errors };
    } else {
        return { item, isValid, errors };
    }
}

/**
 * Validate Model
 * @param module
 */
export async function validateModel(module: PolicyModule): Promise<ISerializedErrors> {
    const moduleValidator = new ModuleValidator(module.config);
    await moduleValidator.validate();
    return moduleValidator.getSerializedErrors();
}

/**
 * Publish module
 * @param model
 * @param owner
 * @param version
 * @param notifier
 */
export async function publishModule(model: PolicyModule, owner: string, notifier: INotifier): Promise<PolicyModule> {
    const logger = new Logger();

    logger.info('Publish module', ['GUARDIAN_SERVICE']);
    notifier.start('Resolve Hedera account');
    const users = new Users();
    const root = await users.getHederaAccount(owner);
    notifier.completedAndStart('Find topic');

    const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicByType(owner, TopicType.UserTopic), true);
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey)
        .setTopicObject(topic);

    notifier.completedAndStart('Publish schemas');

    model.status = ModuleStatus.PUBLISHED;

    notifier.completedAndStart('Generate file');

    const zip = await generateZipFile(model);
    const buffer = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 3
        }
    });

    notifier.completedAndStart('Publish module');
    const message = new ModuleMessage(MessageType.Module, MessageAction.PublishModule);
    message.setDocument(model, buffer);
    const result = await messageServer
        .sendMessage(message);
    model.messageId = result.getId();

    logger.info('Published module', ['GUARDIAN_SERVICE']);

    notifier.completedAndStart('Saving in DB');
    const retVal = await DatabaseServer.updateModule(model);
    notifier.completed();
    return retVal
}

/**
 * Connect to the message broker methods of working with modules.
 *
 * @param channel - channel
 */
export async function modulesAPI(
    channel: MessageBrokerChannel
): Promise<void> {
    /**
     * Create new module
     *
     * @param payload - module
     * 
     * @returns {PolicyModule} new module
     */
    ApiResponse(channel, MessageAPI.CREATE_MODULE, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid Params');
            }

            const { module, owner } = msg;
            module.creator = owner;
            module.owner = owner;
            module.type = 'CUSTOM';
            const item = await DatabaseServer.createModules(module);
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });


    ApiResponse(channel, MessageAPI.GET_MODULES, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load modules parameter');
            }

            const { pageIndex, pageSize, owner } = msg;
            const filter: any = {}
            if (owner) {
                filter.owner = owner;
            }

            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = _pageSize;
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.limit = 100;
            }

            const [items, count] = await DatabaseServer.getModulesAndCount(filter, otherOptions);

            return new MessageResponse({ items, count });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.DELETE_MODULES, async (msg) => {
        try {
            if (!msg.uuid || !msg.owner) {
                return new MessageError('Invalid load modules parameter');
            }
            const item = await DatabaseServer.getModuleById(msg.uuid);
            if (!item || item.owner !== msg.owner) {
                throw new Error('Invalid module');
            }
            await DatabaseServer.removeModule(item);
            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.GET_MENU_MODULES, async (msg) => {
        try {
            if (!msg.owner) {
                return new MessageError('Invalid load modules parameter');
            }
            const items = await DatabaseServer.getModules({
                owner: msg.owner
            });
            return new MessageResponse(items);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });


    ApiResponse(channel, MessageAPI.UPDATE_MODULES, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load modules parameter');
            }
            const { uuid, module, owner } = msg;
            const item = await DatabaseServer.getModuleById(uuid);
            if (!item || item.owner !== owner) {
                throw new Error('Invalid module');
            }
            if (item.status === ModuleStatus.PUBLISHED) {
                throw new Error('Module published');
            }

            item.config = module.config;
            item.name = module.name;
            item.description = module.description;

            const result = await DatabaseServer.updateModule(item);
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.GET_MODULE, async (msg) => {
        try {
            if (!msg.uuid || !msg.owner) {
                return new MessageError('Invalid load modules parameter');
            }
            const item = await DatabaseServer.getModuleById(msg.uuid);
            if (!item || item.owner !== msg.owner) {
                throw new Error('Invalid module');
            }
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });



    ApiResponse(channel, MessageAPI.MODULE_EXPORT_FILE, async (msg) => {
        try {
            if (!msg.uuid || !msg.owner) {
                return new MessageError('Invalid load modules parameter');
            }

            const item = await DatabaseServer.getModuleById(msg.uuid);
            if (!item || item.owner !== msg.owner) {
                throw new Error('Invalid module');
            }

            const zip = await generateZipFile(item);
            const file = await zip.generateAsync({
                type: 'arraybuffer',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 3,
                },
            });
            console.log('File size: ' + file.byteLength);
            return new BinaryMessageResponse(file);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.MODULE_EXPORT_MESSAGE, async (msg) => {
        try {
            if (!msg.uuid || !msg.owner) {
                return new MessageError('Invalid load modules parameter');
            }

            const item = await DatabaseServer.getModuleById(msg.uuid);
            if (!item || item.owner !== msg.owner) {
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.MODULE_IMPORT_FILE_PREVIEW, async (msg) => {
        try {
            const { zip } = msg;
            if (!zip) {
                throw new Error('file in body is empty');
            }
            const preview = await parseZipFile(Buffer.from(zip.data));
            return new MessageResponse(preview);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.MODULE_IMPORT_MESSAGE_PREVIEW, async (msg) => {
        try {
            const { messageId, owner } = msg;
            const preview = await preparePreviewMessage(messageId, owner, emptyNotifier());
            return new MessageResponse(preview);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.MODULE_IMPORT_FILE, async (msg) => {
        try {
            const { zip, owner } = msg;
            if (!zip) {
                throw new Error('file in body is empty');
            }

            const preview = await parseZipFile(Buffer.from(zip.data));

            const { module } = preview;
            delete module._id;
            delete module.id;
            delete module.messageId;
            delete module.createDate;
            module.uuid = GenerateUUIDv4();
            module.creator = owner;
            module.owner = owner;
            module.status = 'DRAFT';
            module.type = 'CUSTOM';
            if (await DatabaseServer.getModule({ name: module.name })) {
                module.name = module.name + '_' + Date.now();
            }
            const item = await DatabaseServer.createModules(module);

            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.MODULE_IMPORT_MESSAGE, async (msg) => {
        try {
            const { messageId, owner } = msg;
            if (!messageId) {
                throw new Error('Message ID in body is empty');
            }

            const notifier = emptyNotifier();
            const preview = await preparePreviewMessage(messageId, owner, notifier);

            const { module } = preview;
            delete module._id;
            delete module.id;
            delete module.messageId;
            delete module.createDate;
            module.uuid = GenerateUUIDv4();
            module.creator = owner;
            module.owner = owner;
            module.status = 'DRAFT';
            module.type = 'CUSTOM';
            if (await DatabaseServer.getModule({ name: module.name })) {
                module.name = module.name + '_' + Date.now();
            }
            const item = await DatabaseServer.createModules(module);

            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.PUBLISH_MODULES, async (msg) => {
        try {
            const { uuid, owner, module } = msg;
            const result = await validateAndPublish(uuid, owner, emptyNotifier());
            return new MessageResponse({
                module: result.item,
                isValid: result.isValid,
                errors: result.errors,
            });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
