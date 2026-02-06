import { BasicBlock } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { AnyBlockType, IPolicyDocument, IPolicyGetData } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { BlockActionError } from '../errors/index.js';
import { LocationType, SchemaCategory, SchemaHelper, SchemaStatus, TagType } from '@guardian/interfaces';
import { DatabaseServer, MessageAction, MessageServer, MessageType, Tag, TagMessage, VcHelper, } from '@guardian/common';
import { PopulatePath } from '@mikro-orm/mongodb';
import { PolicyActionsUtils } from '../policy-actions/utils.js';
import { PolicyUtils } from '../helpers/utils.js';

/**
 * Tag Manager
 */
@BasicBlock({
    blockType: 'tagsManager',
    commonBlock: true,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Tags Manager',
        title: `Add 'Tags Manager' Block`,
        post: true,
        get: true,
        children: ChildrenType.None,
        control: ControlType.UI,
        input: null,
        output: null,
        defaultEvent: false,
        properties: null,
    },
    variables: []
})
export class TagsManagerBlock {
    /**
     * Join GET Data
     * @param {IPolicyDocument | IPolicyDocument[]} documents
     * @param {PolicyUser} user
     * @param {AnyBlockType} parent
     */
    public async joinData<T extends IPolicyDocument | IPolicyDocument[]>(
        documents: T, user: PolicyUser, parent: AnyBlockType
    ): Promise<T> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const getData = await this.getData(user);
        if (Array.isArray(documents)) {
            for (const doc of documents) {
                if (!doc.blocks) {
                    doc.blocks = {};
                }
                const tags = await this.getDocumentTags(doc.id, user);
                doc.blocks[ref.uuid] = { ...getData, tags };
            }
        } else {
            if (!documents.blocks) {
                documents.blocks = {};
            }
            const tags = await this.getDocumentTags(documents.id, user);
            documents.blocks[ref.uuid] = { ...getData, tags };
        }
        return documents;
    }

    /**
     * Get Document Tags
     * @param {IPolicyDocument} document
     * @param {PolicyUser} user
     */
    private async getDocumentTags(documentId: string, user: PolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const filter: any = {
            localTarget: documentId,
            entity: TagType.PolicyDocument
        }
        const tags = await ref.databaseServer.getTags(filter);
        const cache = await ref.databaseServer.getTagCache(filter);
        return {
            entity: TagType.PolicyDocument,
            refreshDate: cache[cache.length - 1]?.date,
            target: documentId,
            owner: user.did,
            tags,
        }
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const schema = await DatabaseServer.getSchemas({
            system: false,
            readonly: false,
            category: SchemaCategory.TAG
        }, {
            fields: [
                'id',
                'name',
                'description',
                'topicId',
                'uuid',
                'version',
                'iri',
                'documentFileId'
            ] as unknown as PopulatePath.ALL[]
        });
        const data: IPolicyGetData = {
            id: ref.uuid,
            blockType: ref.blockType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            actionType: ref.actionType,
            tagSchemas: schema
        }
        return data;
    }

    /**
     * Set block data
     * @param user
     * @param blockData
     */
    async setData(user: PolicyUser, blockData: any,  _, actionStatus): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        if (!blockData) {
            throw new BlockActionError(`Operation is unknown`, ref.blockType, ref.uuid);
        }

        switch (blockData.operation) {
            case 'create': {
                const { tag } = blockData;
                if (!tag || typeof tag !== 'object') {
                    throw new BlockActionError(`Invalid tag`, ref.blockType, ref.uuid);
                }

                //Target
                const target = await this.getTarget(TagType.PolicyDocument, tag.localTarget || tag.target);
                if (!target) {
                    throw new BlockActionError(`Invalid target`, ref.blockType, ref.uuid);
                }

                const relayerAccount = await PolicyUtils.getUserRelayerAccount(ref, user.did, null, user.userId);

                const tagUUID: string = await ref.components.generateUUID(actionStatus?.id);
                tag.uuid = tag.uuid || tagUUID;
                tag.operation = 'Create';
                tag.entity = TagType.PolicyDocument;
                tag.target = null;
                tag.localTarget = target.id;
                tag.status = 'Draft';
                tag.owner = user.did;
                tag.policyId = ref.policyId;
                tag.date = (new Date()).toISOString();
                tag.relayerAccount = relayerAccount;

                //Document
                if (tag.document && typeof tag.document === 'object') {
                    const vcHelper = new VcHelper();
                    let credentialSubject: any = { ...tag.document };
                    credentialSubject.id = user.did;
                    const tagSchema = await DatabaseServer.getSchema({ iri: `#${credentialSubject.type}` });
                    if (
                        tagSchema &&
                        tagSchema.category === SchemaCategory.TAG &&
                        tagSchema.status === SchemaStatus.PUBLISHED
                    ) {
                        credentialSubject = {
                            ...credentialSubject,
                            ...SchemaHelper.getContext(tagSchema),
                        }
                    }
                    if (ref.dryRun) {
                        vcHelper.addDryRunContext(credentialSubject);
                    }
                    const uuid = await ref.components.generateUUID(actionStatus?.id);

                    const vcObject = await PolicyActionsUtils.signVC({
                        ref,
                        subject: credentialSubject,
                        issuer: user.did,
                        relayerAccount,
                        options: { uuid },
                        userId: user.userId
                    });
                    tag.document = vcObject.getDocument();
                } else {
                    tag.document = null;
                }

                //Message
                if (target.target && target.topicId) {
                    tag.target = target.target;
                    tag.status = 'Published';
                    await this.publishTag(tag, target.topicId, user.did, user.userId);
                } else {
                    tag.target = null;
                    tag.localTarget = target.id;
                    tag.status = 'Draft';
                }

                const item = await ref.databaseServer.createTag(tag);
                return item;
            }
            case 'search': {
                const { targets } = blockData;
                if (!Array.isArray(targets)) {
                    throw new BlockActionError(`Invalid targets`, ref.blockType, ref.uuid);
                }

                const items = await ref.databaseServer.getTags({
                    localTarget: { $in: targets },
                    entity: TagType.PolicyDocument
                });
                return items;
            }
            case 'synchronization': {
                const { target } = blockData;
                if (typeof target !== 'string') {
                    throw new BlockActionError(`Invalid target`, ref.blockType, ref.uuid);
                }

                const targetObject = await this.getTarget(TagType.PolicyDocument, target);

                if (targetObject) {
                    if (targetObject.topicId) {
                        await this.synchronization(targetObject.topicId, targetObject.target, target, user.userId);
                    }
                } else {
                    throw new BlockActionError(`Invalid target`, ref.blockType, ref.uuid);
                }

                const date = (new Date()).toISOString()
                const cache = await ref.databaseServer.getTagCache({
                    localTarget: target,
                    entity: TagType.PolicyDocument
                });
                if (cache.length) {
                    for (const item of cache) {
                        item.date = date;
                        await ref.databaseServer.updateTagCache(item);
                    }
                } else {
                    await ref.databaseServer.createTagCache({
                        localTarget: target,
                        entity: TagType.PolicyDocument,
                        date
                    });
                }

                return await this.getDocumentTags(target, user);
            }
            case 'delete': {
                const { uuid } = blockData;
                if (typeof uuid !== 'string') {
                    throw new BlockActionError(`Invalid uuid`, ref.blockType, ref.uuid);
                }

                const item = await ref.databaseServer.getTagById(uuid);
                if (!item || item.owner !== user.did) {
                    throw new BlockActionError(`Invalid tag`, ref.blockType, ref.uuid);
                }
                await ref.databaseServer.removeTag(item);

                if (item.topicId && item.status === 'Published') {
                    await this.deleteTag(item, item.topicId, user.did, user.userId);
                }

                break;
            }
            default: {
                throw new BlockActionError(`Operation is unknown`, ref.blockType, ref.uuid);
            }
        }
        ref.backup();
    }

    /**
     * Get target
     * @param tag
     */
    private async getTarget(entity: TagType, id: string): Promise<IPolicyDocument> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        switch (entity) {
            case TagType.PolicyDocument: {
                return await ref.databaseServer.getVcDocument({ id, policyId: ref.policyId });
            }
            default:
                return null;
        }
    }

    /**
     * Publish tag
     * @param item
     * @param topicId
     * @param owner
     * @param signOptions
     * @param userId
     */
    private async publishTag(item: Tag, topicId: string, owner: string, userId: string | null): Promise<Tag> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        item.operation = 'Create';
        item.status = 'Published';
        item.date = item.date || (new Date()).toISOString();

        const message = new TagMessage(MessageAction.PublishTag);
        message.setDocument(item);

        const relayerAccount = await PolicyUtils.getUserRelayerAccount(ref, owner, null, userId);

        const topic = await PolicyActionsUtils.getTopicById(ref, topicId, userId);
        const result = await PolicyActionsUtils.sendMessage({
            ref,
            topic,
            message,
            owner,
            relayerAccount,
            updateIpfs: true,
            userId
        });

        item.messageId = result.getId();
        item.topicId = result.getTopicId();
        return item;
    }

    /**
     * Delete tag
     * @param item
     * @param topicId
     * @param owner
     * @param userId
     */
    private async deleteTag(item: Tag, topicId: string, owner: string, userId: string | null): Promise<Tag> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        const relayerAccount = await PolicyUtils.getUserRelayerAccount(ref, owner, null, userId);

        item.operation = 'Delete';
        item.status = 'Published';
        item.date = item.date || (new Date()).toISOString();

        const message = new TagMessage(MessageAction.DeleteTag);
        message.setDocument(item);

        const topic = await PolicyActionsUtils.getTopicById(ref, topicId, userId);
        const result = await PolicyActionsUtils.sendMessage({
            ref,
            topic,
            message,
            owner,
            relayerAccount,
            updateIpfs: true,
            userId
        });

        item.messageId = result.getId();
        item.topicId = result.getTopicId();
        return item;
    }

    /**
     * Synchronization tags
     * @param tag
     */
    private async synchronization(
        topicId: string,
        target: string,
        localTarget: string,
        userId: string
    ): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        const messageServer = new MessageServer({
            dryRun: ref.dryRun
        });
        const messages = await messageServer.getMessages<TagMessage>(topicId, userId, MessageType.Tag);
        const map = new Map<string, any>();
        for (const message of messages) {
            if (message.target === target) {
                map.set(message.getId(), { message, local: null });
            }
        }

        const items = await ref.databaseServer.getTags({
            localTarget,
            entity: TagType.PolicyDocument,
            status: 'Published'
        });
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
                const message = item.message;
                const tag = item.local ? item.local : {};

                tag.uuid = message.uuid;
                tag.name = message.name;
                tag.description = message.description;
                tag.owner = message.owner;
                tag.operation = message.operation;
                tag.target = message.target;
                tag.localTarget = localTarget;
                tag.entity = TagType.PolicyDocument;
                tag.messageId = message.getId();
                tag.topicId = message.getTopicId();
                tag.status = 'Published';
                tag.date = tag.date || (new Date()).toISOString();

                if (tag.id) {
                    tagObjects.push(tag);
                } else {
                    await ref.databaseServer.createTag(tag);
                }
            }
        }

        await ref.databaseServer.updateTags(tagObjects)
    }
}
