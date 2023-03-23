import { ApiResponse } from '@api/api-response';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger } from '@guardian/common';
import { GenerateUUIDv4, IRootConfig, MessageAPI, TagType } from '@guardian/interfaces';
import { DatabaseServer } from '@database-modules';
import { Tag } from '@entity/tag';
import { MessageAction, MessageServer, MessageType, TagMessage, TopicConfig } from '@hedera-modules';
import { Schema as SchemaCollection } from '@entity/schema';
import { Policy as PolicyCollection } from '@entity/policy';
import { Token as TokenCollection } from '@entity/token';
import { PolicyModule as ModuleCollection } from '@entity/module';
import { Users } from '@helpers/users';

/**
 * Publish schema tags
 * @param item
 * @param user
 */
export async function publishSchemaTags(
    schema: SchemaCollection,
    user: IRootConfig
): Promise<void> {
    const filter: any = {
        localTarget: schema.id,
        entity: TagType.Schema,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);

    const topic = await DatabaseServer.getTopicById(schema.topicId);
    const topicConfig = await TopicConfig.fromObject(topic, true);
    const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey)
        .setTopicObject(topicConfig);

    for (const tag of tags) {
        tag.target = schema.messageId;
        await publishTag(tag, messageServer);
        await DatabaseServer.updateTag(tag);
    }
}

/**
 * Publish policy tags
 * @param policy
 * @param messageServer
 */
export async function publishPolicyTags(
    policy: PolicyCollection,
    user: IRootConfig
): Promise<void> {
    const filter: any = {
        localTarget: policy.id,
        entity: TagType.Policy,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);

    const topic = await DatabaseServer.getTopicById(policy.topicId);
    const topicConfig = await TopicConfig.fromObject(topic, true);
    const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey)
        .setTopicObject(topicConfig);

    for (const tag of tags) {
        tag.target = policy.messageId;
        await publishTag(tag, messageServer);
        await DatabaseServer.updateTag(tag);
    }
}

/**
 * Publish token tags
 * @param token
 * @param messageServer
 */
export async function publishTokenTags(
    token: TokenCollection,
    user: IRootConfig
): Promise<void> {
    const filter: any = {
        localTarget: token.id,
        entity: TagType.Token,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);

    const topic = await DatabaseServer.getTopicById(token.topicId);
    const topicConfig = await TopicConfig.fromObject(topic, true);
    const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey)
        .setTopicObject(topicConfig);

    for (const tag of tags) {
        tag.target = token.tokenId;
        await publishTag(tag, messageServer);
        await DatabaseServer.updateTag(tag);
    }
}

/**
 * Publish module tags
 * @param module
 * @param messageServer
 */
export async function publishModuleTags(
    module: ModuleCollection,
    user: IRootConfig
): Promise<void> {
    const filter: any = {
        localTarget: module.id,
        entity: TagType.Module,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);

    const topic = await DatabaseServer.getTopicById(module.topicId);
    const topicConfig = await TopicConfig.fromObject(topic, true);
    const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey)
        .setTopicObject(topicConfig);

    for (const tag of tags) {
        tag.target = module.messageId;
        await publishTag(tag, messageServer);
        await DatabaseServer.updateTag(tag);
    }
}

/**
 * Publish tag
 * @param item
 * @param messageServer
 */
export async function publishTag(
    item: Tag,
    messageServer: MessageServer
): Promise<any> {
    const message = new TagMessage(MessageAction.PublishTag);
    message.setDocument(item);
    const result = await messageServer
        .sendMessage(message);
    const messageId = result.getId();
    const topicId = result.getTopicId();
    item.status = 'Published';
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
 * Import tags
 * @param tags
 * @param map - Map<OldLocalId, NewLocalId> | NewLocalId
 */
export async function importTag(
    tags: any[],
    newIds?: Map<string, string> | string
): Promise<any> {
    const uuidMap: Map<string, string> = new Map();
    if (newIds) {
        if (typeof newIds === 'string') {
            for (const tag of tags) {
                tag.localTarget = newIds;
            }
        } else {
            tags = tags.filter(tag => newIds.has(tag.localTarget));
            for (const tag of tags) {
                tag.localTarget = newIds.get(tag.target);
            }
        }
    }
    for (const tag of tags) {
        if (tag.uuid) {
            if (uuidMap.has(tag.uuid)) {
                tag.uuid = uuidMap.get(tag.uuid);
            } else {
                uuidMap.set(tag.uuid, GenerateUUIDv4());
                tag.uuid = uuidMap.get(tag.uuid);
            }
        } else {
            tag.uuid = GenerateUUIDv4();
        }
        tag.status = 'History';
        await DatabaseServer.createTag(tag);
    }
}

/**
 * Get target
 * @param tag
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
                return { id: item.id.toString(), target: item.messageId, topicId: item.topicId };
            } else {
                return null;
            }
        }
        case TagType.Policy: {
            const item = await DatabaseServer.getPolicyById(id);
            if (item) {
                return { id: item.id.toString(), target: item.messageId, topicId: item.topicId };
            } else {
                return null;
            }
        }
        case TagType.Token: {
            const item = await DatabaseServer.getTokenById(id);
            if (item) {
                return { id: item.id.toString(), target: item.tokenId, topicId: item.topicId };
            } else {
                return null;
            }
        }
        case TagType.Module: {
            const item = await DatabaseServer.getModuleById(id);
            if (item) {
                return { id: item.id.toString(), target: item.messageId, topicId: item.topicId };
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
 *
 * @param channel - channel
 */
export async function tagsAPI(channel: MessageBrokerChannel): Promise<void> {
    /**
     * Create new tag
     *
     * @param payload - tag
     *
     * @returns {Tag} new tag
     */
    ApiResponse(channel, MessageAPI.CREATE_TAG, async (msg) => {
        try {
            if (!msg) {
                throw new Error('Invalid Params');
            }

            const { tag, owner } = msg;
            tag.uuid = tag.uuid || GenerateUUIDv4();
            tag.owner = owner;
            tag.operation = 'Create';

            const target = await getTarget(tag.entity, tag.localTarget || tag.target);
            if (target) {
                if (target.target && target.topicId) {
                    tag.target = target.target;
                    tag.localTarget = target.id;
                    tag.status = 'Published';

                    const users = new Users();
                    const root = await users.getHederaAccount(owner);
                    const topic = await DatabaseServer.getTopicById(target.topicId);
                    const topicConfig = await TopicConfig.fromObject(topic, true);
                    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey)
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

    ApiResponse(channel, MessageAPI.GET_TAGS, async (msg) => {
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

    ApiResponse(channel, MessageAPI.GET_TAG_CACHE, async (msg) => {
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

    ApiResponse(channel, MessageAPI.GET_SYNCHRONIZATION_TAGS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load tags parameter');
            }
            const { target, entity } = msg;
            const localTarget = target;
            const filter: any = { localTarget, entity };

            const targetObject = await getTarget(entity, localTarget);
            if (targetObject) {
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

                        if (tag.id) {
                            await DatabaseServer.updateTag(tag);
                        } else {
                            await DatabaseServer.createTag(tag);
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

    ApiResponse(channel, MessageAPI.DELETE_TAG, async (msg) => {
        try {
            if (!msg.uuid || !msg.owner) {
                return new MessageError('Invalid load tags parameter');
            }
            const item = await DatabaseServer.getTagById(msg.uuid);
            if (!item || item.owner !== msg.owner) {
                throw new Error('Invalid tag');
            }
            await DatabaseServer.removeTag(item);
            return new MessageResponse(true);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.EXPORT_TAGS, async (msg) => {
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