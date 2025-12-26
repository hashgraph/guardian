import { DatabaseServer, MessageAction, MessageError, MessageResponse, MessageServer, MessageType, PinoLogger, Tag, TagMessage, TopicConfig, Users, VcHelper } from '@guardian/common';
import { GenerateUUIDv4, IOwner, MessageAPI, Schema, SchemaCategory, SchemaHelper, SchemaStatus, TagType } from '@guardian/interfaces';
import { ApiResponse } from '../api/helpers/api-response.js';
import { publishTag } from '../helpers/import-helpers/index.js'

/**
 * Delete tag
 * @param item
 * @param messageServer
 * @param owner
 */
export async function deleteTag(
    item: Tag,
    messageServer: MessageServer,
    owner: IOwner
): Promise<any> {
    item.operation = 'Delete';
    item.status = 'Published';
    item.date = item.date || (new Date()).toISOString();
    const message = new TagMessage(MessageAction.DeleteTag);
    message.setDocument(item);
    const result = await messageServer
        .sendMessage(message, {
            sendToIPFS: true,
            memo: null,
            interception: owner.id,
            userId: owner.id
        });
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
    const filter: any = { localTarget: { $in: targets } }
    if (entity) {
        filter.entity = entity;
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
        case TagType.PolicyBlock: {
            const policy = await DatabaseServer.getPolicyById(id);
            if (!policy) {
                return null;
            };

            return {
                id,
                target: id,
                topicId: policy.topicId
            };
        }
        default:
            return null;
    }
}

/**
 * Connect to the message broker methods of working with tags.
 */
export async function tagsAPI(logger: PinoLogger): Promise<void> {
    /**
     * Create new tag
     *
     * @param payload - tag
     *
     * @returns {Tag} new tag
     */
    ApiResponse(MessageAPI.CREATE_TAG,
        async (msg: {
            tag: any,
            owner: IOwner
        }) => {
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
                    const root = await users.getHederaAccount(owner.creator, owner?.id);
                    //Document
                    if (tag.document && typeof tag.document === 'object') {
                        const vcHelper = new VcHelper();
                        // @ts-ignore
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

                        const didDocument = await vcHelper.loadDidDocument(owner.creator, owner?.id);
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
                        const topicConfig = await TopicConfig.fromObject(topic, true, owner?.id);
                        const messageServer = new MessageServer({
                            operatorId: root.hederaAccountId,
                            operatorKey: root.hederaAccountKey,
                            signOptions: root.signOptions
                        }).setTopicObject(topicConfig);
                        await publishTag(tag, messageServer, owner);
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
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_TAGS,
        async (msg: {
            owner: IOwner,
            entity: string,
            targets: string[],
            linkedItems?: string[]
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tags parameter');
                }
                const { targets, entity, linkedItems } = msg;

                const filter: any = {
                    localTarget: { $in: targets },
                    entity
                }

                if (Array.isArray(linkedItems) && linkedItems.length > 0) {
                    filter.linkedItems = { $in: linkedItems };
                }

                const items = await DatabaseServer.getTags(filter);
                return new MessageResponse(items);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_TAG_CACHE,
        async (msg: {
            owner: IOwner,
            entity: string,
            targets: string[],
            linkedItems?: string[]
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tags parameter');
                }
                const { targets, entity, linkedItems } = msg;
                const filter: any = {
                    localTarget: { $in: targets },
                    entity
                }

                if (Array.isArray(linkedItems) && linkedItems.length > 0) {
                    filter.linkedItems = { $in: linkedItems };
                }

                const items = await DatabaseServer.getTagCache(filter);
                return new MessageResponse(items);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_SYNCHRONIZATION_TAGS,
        async (msg: {
            owner: IOwner,
            entity: TagType,
            target: string,
            linkedItems?: string[]
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tags parameter');
                }

                const { owner, target, entity, linkedItems } = msg;
                const localTarget = target;
                const filter: any = { localTarget, entity };

                if (Array.isArray(linkedItems) && linkedItems.length > 0) {
                    filter.linkedItems = { $in: linkedItems };
                }

                const targetObject = await getTarget(entity, localTarget);
                if (targetObject) {
                    if (targetObject.topicId) {
                        const messageServer = new MessageServer(null);
                        const messages = await messageServer.getMessages<TagMessage>(targetObject.topicId, owner.id, MessageType.Tag);

                        filter.status = 'Published';

                        const items = await DatabaseServer.getTags(filter);
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
                        const tagObjects = []

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
                                    tagObjects.push(tag);
                                } else {
                                    await DatabaseServer.createTag(tag);
                                }
                            }
                        }

                        await new DatabaseServer().updateTags(tagObjects)
                    }
                } else {
                    throw new Error('Invalid target');
                }

                const date = (new Date()).toISOString()
                const cache = await DatabaseServer.getTagCache(filter);
                if (cache.length) {
                    const tagCacheObjects = []

                    for (const item of cache) {
                        item.date = date;
                        tagCacheObjects.push(item);
                    }

                    await DatabaseServer.updateTagsCache(tagCacheObjects)
                } else {
                    await DatabaseServer.createTagCache({ localTarget, entity, date });
                }

                const tags = await DatabaseServer.getTags(filter);
                return new MessageResponse(tags);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.DELETE_TAG,
        async (msg: {
            uuid: string,
            owner: IOwner
        }) => {
            try {
                const { uuid, owner } = msg;

                if (!uuid || !owner) {
                    return new MessageError('Invalid load tags parameter');
                }
                const item = await DatabaseServer.getTagById(uuid);
                if (!item || item.owner !== owner.creator) {
                    throw new Error('Invalid tag');
                }
                await DatabaseServer.removeTag(item);

                if (item.topicId && item.status === 'Published') {
                    const users = new Users();
                    const root = await users.getHederaAccount(owner.creator, owner?.id);
                    const topic = await DatabaseServer.getTopicById(item.topicId);
                    const topicConfig = await TopicConfig.fromObject(topic, true, owner?.id);
                    const messageServer = new MessageServer({
                        operatorId: root.hederaAccountId,
                        operatorKey: root.hederaAccountKey,
                        signOptions: root.signOptions
                    }).setTopicObject(topicConfig);
                    await deleteTag(item, messageServer, owner);
                }

                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.EXPORT_TAGS,
        async (msg: {
            owner: IOwner,
            entity: string,
            targets: string[],
            linkedItems: string[]
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load tags parameter');
                }
                const { targets, entity, linkedItems } = msg;
                const filter: any = {
                    localTarget: { $in: targets },
                    entity
                }

                if (Array.isArray(linkedItems) && linkedItems.length > 0) {
                    filter.linkedItems = { $in: linkedItems };
                }

                const items = await DatabaseServer.getTags(filter);
                for (const item of items) {
                    delete item.id;
                    delete item._id;
                    item.status = 'History';
                }
                return new MessageResponse(items);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });
}
