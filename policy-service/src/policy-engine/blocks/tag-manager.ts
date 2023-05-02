import { BasicBlock } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { AnyBlockType, IPolicyDocument } from '@policy-engine/policy-engine.interface';
import { IPolicyUser } from '@policy-engine/policy-user';
import { BlockActionError } from '@policy-engine/errors';
import { GenerateUUIDv4, SchemaCategory, SchemaHelper, SchemaStatus, TagType } from '@guardian/interfaces';
import {
    Tag,
    MessageAction,
    MessageServer,
    MessageType,
    TagMessage,
    TopicConfig,
    VcHelper,
    DatabaseServer,
} from '@guardian/common';
import { IHederaAccount, PolicyUtils } from '@policy-engine/helpers/utils';

/**
 * Tag Manager
 */
@BasicBlock({
    blockType: 'tagsManager',
    commonBlock: true,
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
     * @param {IPolicyUser} user
     * @param {AnyBlockType} parent
     */
    public async joinData<T extends IPolicyDocument | IPolicyDocument[]>(
        documents: T, user: IPolicyUser, parent: AnyBlockType
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
     * @param {IPolicyUser} user
     */
    private async getDocumentTags(documentId: string, user: IPolicyUser) {
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
    async getData(user: IPolicyUser): Promise<any> {
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
            ]
        });
        const data: any = {
            id: ref.uuid,
            blockType: ref.blockType,
            tagSchemas: schema
        }
        return data;
    }

    /**
     * Set block data
     * @param user
     * @param blockData
     */
    async setData(user: IPolicyUser, blockData: any): Promise<any> {
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

                const hederaAccount = await PolicyUtils.getHederaAccount(ref, user.did);
                //Document
                if (tag.document && typeof tag.document === 'object') {
                    const vcHelper = new VcHelper();
                    let credentialSubject: any = { ...tag.document } || {};
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
                    const vcObject = await vcHelper.createVC(
                        user.did,
                        hederaAccount.hederaAccountKey,
                        credentialSubject
                    );
                    tag.document = vcObject.getDocument();
                } else {
                    tag.document = null;
                }

                const target = await this.getTarget(TagType.PolicyDocument, tag.localTarget || tag.target);
                if (target) {
                    tag.uuid = tag.uuid || GenerateUUIDv4();
                    tag.operation = 'Create';
                    tag.entity = TagType.PolicyDocument;
                    tag.target = null;
                    tag.localTarget = target.id;
                    tag.status = 'Draft';
                    tag.owner = user.did;
                    tag.policyId = ref.policyId;
                    tag.date = (new Date()).toISOString();
                } else {
                    throw new BlockActionError(`Invalid target`, ref.blockType, ref.uuid);
                }

                //Message
                if (target.target && target.topicId) {
                    tag.target = target.target;
                    tag.status = 'Published';
                    await this.publishTag(tag, target.topicId, hederaAccount);
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
                    where: {
                        localTarget: { $in: targets },
                        entity: TagType.PolicyDocument
                    }
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
                        await this.synchronization(targetObject.topicId, targetObject.target, target);
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
                    await this.deleteTag(item, item.topicId, user.did);
                }

                break;
            }
            default: {
                throw new BlockActionError(`Operation is unknown`, ref.blockType, ref.uuid);
            }
        }
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
     * @param tag
     */
    private async publishTag(item: Tag, topicId: string, owner: IHederaAccount): Promise<Tag> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const messageServer = new MessageServer(owner.hederaAccountId, owner.hederaAccountKey, ref.dryRun);
        const topic = await ref.databaseServer.getTopicById(topicId);
        const topicConfig = await TopicConfig.fromObject(topic, !ref.dryRun);

        item.operation = 'Create';
        item.status = 'Published';
        item.date = item.date || (new Date()).toISOString();
        const message = new TagMessage(MessageAction.PublishTag);
        message.setDocument(item);
        const result = await messageServer
            .setTopicObject(topicConfig)
            .sendMessage(message);

        item.messageId = result.getId();
        item.topicId = result.getTopicId();
        return item;
    }

    /**
     * Delete tag
     * @param tag
     */
    private async deleteTag(item: Tag, topicId: string, owner: string): Promise<Tag> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const user = await PolicyUtils.getHederaAccount(ref, owner);
        const messageServer = new MessageServer(user.hederaAccountId, user.hederaAccountKey, ref.dryRun);
        const topic = await ref.databaseServer.getTopicById(topicId);
        const topicConfig = await TopicConfig.fromObject(topic, !ref.dryRun);

        item.operation = 'Delete';
        item.status = 'Published';
        item.date = item.date || (new Date()).toISOString();
        const message = new TagMessage(MessageAction.DeleteTag);
        message.setDocument(item);
        const result = await messageServer
            .setTopicObject(topicConfig)
            .sendMessage(message);

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
        localTarget: string
    ): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        const messageServer = new MessageServer(null, null, ref.dryRun);
        const messages = await messageServer.getMessages<TagMessage>(topicId, MessageType.Tag);
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
                    await ref.databaseServer.updateTag(tag);
                } else {
                    await ref.databaseServer.createTag(tag);
                }
            }
        }
    }

}
