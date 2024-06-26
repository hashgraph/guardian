import { ApiResponse } from '../api/helpers/api-response.js';
import { DatabaseServer, Logger, MessageAction, MessageError, MessageResponse, MessageServer, MessageType, Policy as PolicyCollection, PolicyModule as ModuleCollection, PolicyTool as PolicyToolCollection, Schema as SchemaCollection, Tag, TagMessage, Token as TokenCollection, TopicConfig, UrlType, Users, VcHelper, } from '@guardian/common';
import { GenerateUUIDv4, IOwner, IRootConfig, MessageAPI, Schema, SchemaCategory, SchemaHelper, SchemaStatus, TagType } from '@guardian/interfaces';

/**
 * Publish schema tags
 * @param schema
 * @param user
 * @param userId
 */
export async function publishSchemaTags(
    schema: SchemaCollection,
    user: IRootConfig,
    userId?: string
): Promise<void> {
    const filter: any = {
        localTarget: schema.id,
        entity: TagType.Schema,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);

    const topic = await DatabaseServer.getTopicById(schema.topicId);
    const topicConfig = await TopicConfig.fromObject(topic, true);
    const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey, user.signOptions)
        .setTopicObject(topicConfig);

    for (const tag of tags) {
        tag.target = schema.messageId;
        await publishTag(tag, messageServer, userId);
        await DatabaseServer.updateTag(tag);
    }
}

/**
 * Publish policy tags
 * @param policy
 * @param user
 * @param userId
 */
export async function publishPolicyTags(
    policy: PolicyCollection,
    user: IRootConfig,
    userId?: string
): Promise<void> {
    const filter: any = {
        localTarget: policy.id,
        entity: TagType.Policy,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);

    const topic = await DatabaseServer.getTopicById(policy.topicId);
    const topicConfig = await TopicConfig.fromObject(topic, true);
    const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey, user.signOptions)
        .setTopicObject(topicConfig);

    for (const tag of tags) {
        tag.target = policy.messageId;
        await publishTag(tag, messageServer, userId);
        await DatabaseServer.updateTag(tag);
    }
}

/**
 * Publish token tags
 * @param token
 * @param user
 * @param userId
 */
export async function publishTokenTags(
    token: TokenCollection,
    user: IRootConfig,
    userId?: string
): Promise<void> {
    const filter: any = {
        localTarget: token.id,
        entity: TagType.Token,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);

    const topic = await DatabaseServer.getTopicById(token.topicId);
    const topicConfig = await TopicConfig.fromObject(topic, true);
    const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey, user.signOptions)
        .setTopicObject(topicConfig);

    for (const tag of tags) {
        tag.target = token.tokenId;
        await publishTag(tag, messageServer, userId);
        await DatabaseServer.updateTag(tag);
    }
}

/**
 * Publish tool tags
 * @param tool
 * @param user
 * @param userId
 */
export async function publishToolTags(
    tool: PolicyToolCollection,
    user: IRootConfig,
    userId?: string
): Promise<void> {
    const filter: any = {
        localTarget: tool.id,
        entity: TagType.Tool,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);
    const topic = await DatabaseServer.getTopicById(tool.tagsTopicId);
    const topicConfig = await TopicConfig.fromObject(topic, true);
    const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey, user.signOptions)
        .setTopicObject(topicConfig);
    for (const tag of tags) {
        tag.target = tool.tagsTopicId;
        await publishTag(tag, messageServer, userId);
        await DatabaseServer.updateTag(tag);
    }
}

/**
 * Publish module tags
 * @param module
 * @param user
 * @param userId
 */
export async function publishModuleTags(
    module: ModuleCollection,
    user: IRootConfig,
    userId?: string
): Promise<void> {
    const filter: any = {
        localTarget: module.id,
        entity: TagType.Module,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);

    const topic = await DatabaseServer.getTopicById(module.topicId);
    const topicConfig = await TopicConfig.fromObject(topic, true);
    const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey, user.signOptions)
        .setTopicObject(topicConfig);

    for (const tag of tags) {
        tag.target = module.messageId;
        await publishTag(tag, messageServer, userId);
        await DatabaseServer.updateTag(tag);
    }
}

/**
 * Publish tag
 * @param item
 * @param messageServer
 * @param userId
 */
export async function publishTag(
    item: Tag,
    messageServer: MessageServer,
    userId?: string
): Promise<any> {
    item.operation = 'Create';
    item.status = 'Published';
    item.date = item.date || (new Date()).toISOString();
    const message = new TagMessage(MessageAction.PublishTag);
    message.setDocument(item);
    const result = await messageServer
        .sendMessage(message, true, null, userId);
    const messageId = result.getId();
    const topicId = result.getTopicId();
    item.messageId = messageId;
    item.topicId = topicId;
    item.uri = result.getDocumentUrl(UrlType.url);
    return item;
}

/**
 * Delete tag
 * @param item
 * @param messageServer
 * @param userId
 */
export async function deleteTag(
    item: Tag,
    messageServer: MessageServer,
    userId?: string
): Promise<any> {
    item.operation = 'Delete';
    item.status = 'Published';
    item.date = item.date || (new Date()).toISOString();
    const message = new TagMessage(MessageAction.DeleteTag);
    message.setDocument(item);
    const result = await messageServer
        .sendMessage(message, true, null, userId);
    const messageId = result.getId();
    const topicId = result.getTopicId();
    item.messageId = messageId;
    item.topicId = topicId;
    return item;
}

/**
 * Export tags
 * @param targets
 * @param entity
 */
export async function exportTag(targets: string[], entity?: TagType): Promise<any[]> {
    const filter: any = {
        where: {
            localTarget: { $in: targets }
        }
    }
    if (entity) {
        filter.where.entity = entity;
    }
    const items = await DatabaseServer.getTags(filter);
    for (const item of items) {
        delete item.id;
        delete item._id;
        item.status = 'History';
    }
    return items;
}

/**
 * Get target
 * @param entity
 * @param id
 */
export async function getTarget(entity: TagType, id: string): Promise<{
    /**
     * Target id
     */
    id: string,
    /**
     * Target
     */
    target?: string,
    /**
     * Topic id
     */
    topicId?: string
}> {
    switch (entity) {
        case TagType.Schema: {
            const item = await DatabaseServer.getSchemaById(id);
            if (item) {
                return {
                    id: item.id.toString(),
                    target: item.messageId,
                    topicId: item.topicId
                };
            } else {
                return null;
            }
        }
        case TagType.Policy: {
            const item = await DatabaseServer.getPolicyById(id);
            if (item) {
                return {
                    id: item.id.toString(),
                    target: item.messageId,
                    topicId: item.topicId
                };
            } else {
                return null;
            }
        }
        case TagType.Token: {
            const item = await DatabaseServer.getTokenById(id);
            if (item) {
                return {
                    id: item.id.toString(),
                    target: item.tokenId,
                    topicId: item.topicId
                };
            } else {
                return null;
            }
        }
        case TagType.Module: {
            const item = await DatabaseServer.getModuleById(id);
            if (item) {
                return {
                    id: item.id.toString(),
                    target: item.messageId,
                    topicId: item.topicId
                };
            } else {
                return null;
            }
        }
        case TagType.Contract: {
            const item = await DatabaseServer.getContractById(id);
            if (item) {
                return {
                    id: item.id.toString(),
                    target: item.contractId,
                    topicId: item.topicId
                };
            } else {
                return null;
            }
        }
        case TagType.Tool: {
            const item = await DatabaseServer.getToolById(id);
            if (item) {
                return {
                    id: item.id.toString(),
                    target: item.messageId,
                    topicId: item.tagsTopicId
                };
            } else {
                return null;
            }
        }
        default:
            return null;
    }
}

/**
 * Connect to the message broker methods of working with tags.
 */
export async function tagsAPI(): Promise<void> {
    /**
     * Create new tag
     *
     * @param payload - tag
     *
     * @returns {Tag} new tag
     */
    ApiResponse(MessageAPI.CREATE_TAG,
        async (msg: { tag: any, owner: IOwner }) => {
            try {
                if (!msg) {
                    throw new Error('Invalid Params');
                }

                const { tag, owner } = msg;
                tag.uuid = tag.uuid || GenerateUUIDv4();
                tag.owner = owner.creator;
                tag.operation = 'Create';
                tag.date = (new Date()).toISOString();

                const target = await getTarget(tag.entity, tag.localTarget || tag.target);
                if (target) {
                    const users = new Users();
                    const root = await users.getHederaAccount(owner.creator);
                    //Document
                    if (tag.document && typeof tag.document === 'object') {
                        const vcHelper = new VcHelper();
                        let credentialSubject: any = { ...tag.document } || {};
                        credentialSubject.id = owner.creator;
                        const tagSchema = await DatabaseServer.getSchema({ iri: tag.schema });
                        if (
                            tagSchema &&
                            tagSchema.category === SchemaCategory.TAG &&
                            tagSchema.status === SchemaStatus.PUBLISHED
                        ) {
                            const schemaObject = new Schema(tagSchema);
                            credentialSubject = SchemaHelper.updateObjectContext(schemaObject, credentialSubject);
                        }

                        const didDocument = await vcHelper.loadDidDocument(owner.creator);
                        const vcObject = await vcHelper.createVerifiableCredential(credentialSubject, didDocument, null, null);
                        tag.document = vcObject.getDocument();
                    } else {
                        tag.document = null;
                    }
                    //Message
                    if (target.target && target.topicId) {
                        tag.target = target.target;
                        tag.localTarget = target.id;
                        tag.status = 'Published';
                        const topic = await DatabaseServer.getTopicById(target.topicId);
                        const topicConfig = await TopicConfig.fromObject(topic, true);
                        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, root.signOptions)
                            .setTopicObject(topicConfig);
                        await publishTag(tag, messageServer);
                    } else {
                        tag.target = null;
                        tag.localTarget = target.id;
                        tag.status = 'Draft';
                    }
                    const item = await DatabaseServer.createTag(tag);
                    return new MessageResponse(item);
                } else {
                    throw new Error('Invalid target');
                }
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_TAGS,
        async (msg: { entity: string, targets: string[] }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tags parameter');
                }
                const { targets, entity } = msg;
                const filter: any = {
                    where: {
                        localTarget: { $in: targets },
                        entity
                    }
                }
                const items = await DatabaseServer.getTags(filter);
                return new MessageResponse(items);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_TAG_CACHE,
        async (msg: { entity: string, targets: string[] }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tags parameter');
                }
                const { targets, entity } = msg;
                const filter: any = {
                    where: {
                        localTarget: { $in: targets },
                        entity
                    }
                }
                const items = await DatabaseServer.getTagCache(filter);
                return new MessageResponse(items);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_SYNCHRONIZATION_TAGS,
        async (msg: { entity: TagType, target: string }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tags parameter');
                }
                const { target, entity } = msg;
                const localTarget = target;
                const filter: any = { localTarget, entity };

                const targetObject = await getTarget(entity, localTarget);
                if (targetObject) {
                    if (targetObject.topicId) {
                        const messageServer = new MessageServer(null, null);
                        const messages = await messageServer.getMessages<TagMessage>(targetObject.topicId, MessageType.Tag);
                        const items = await DatabaseServer.getTags({ localTarget, entity, status: 'Published' });
                        const map = new Map<string, any>();
                        for (const message of messages) {
                            if (message.target === targetObject.target) {
                                map.set(message.getId(), { message, local: null });
                            }
                        }
                        for (const tag of items) {
                            if (map.has(tag.messageId)) {
                                map.get(tag.messageId).local = tag;
                            } else {
                                map.set(tag.messageId, { message: null, local: tag });
                            }
                        }
                        for (const item of map.values()) {
                            if (item.message) {
                                const message: TagMessage = item.message;
                                const tag: Tag = item.local ? item.local : {};

                                tag.uuid = message.uuid;
                                tag.name = message.name;
                                tag.description = message.description;
                                tag.owner = message.owner;
                                tag.operation = message.operation;
                                tag.target = message.target;
                                tag.localTarget = localTarget;
                                tag.entity = entity;
                                tag.messageId = message.getId();
                                tag.topicId = message.getTopicId();
                                tag.status = 'Published';
                                tag.date = tag.date || (new Date()).toISOString();

                                if (tag.id) {
                                    await DatabaseServer.updateTag(tag);
                                } else {
                                    await DatabaseServer.createTag(tag);
                                }
                            }
                        }
                    }
                } else {
                    throw new Error('Invalid target');
                }

                const date = (new Date()).toISOString()
                const cache = await DatabaseServer.getTagCache(filter);
                if (cache.length) {
                    for (const item of cache) {
                        item.date = date;
                        await DatabaseServer.updateTagCache(item);
                    }
                } else {
                    await DatabaseServer.createTagCache({ localTarget, entity, date });
                }

                const tags = await DatabaseServer.getTags(filter);
                return new MessageResponse(tags);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.DELETE_TAG,
        async (msg: { uuid: string, owner: IOwner }) => {
            try {
                if (!msg.uuid || !msg.owner) {
                    return new MessageError('Invalid load tags parameter');
                }
                const item = await DatabaseServer.getTagById(msg.uuid);
                if (!item || item.owner !== msg.owner.creator) {
                    throw new Error('Invalid tag');
                }
                await DatabaseServer.removeTag(item);

                if (item.topicId && item.status === 'Published') {
                    const users = new Users();
                    const root = await users.getHederaAccount(msg.owner.creator);
                    const topic = await DatabaseServer.getTopicById(item.topicId);
                    const topicConfig = await TopicConfig.fromObject(topic, true);
                    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, root.signOptions)
                        .setTopicObject(topicConfig);
                    await deleteTag(item, messageServer);
                }

                return new MessageResponse(true);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.EXPORT_TAGS,
        async (msg: { entity: string, targets: string[] }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tags parameter');
                }
                const { targets, entity } = msg;
                const filter: any = {
                    where: {
                        localTarget: { $in: targets },
                        entity
                    }
                }
                const items = await DatabaseServer.getTags(filter);
                for (const item of items) {
                    delete item.id;
                    delete item._id;
                    item.status = 'History';
                }
                return new MessageResponse(items);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}
