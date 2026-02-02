import {
    DatabaseServer,
    MessageAction,
    MessageServer,
    Policy as PolicyCollection,
    PolicyModule as ModuleCollection,
    PolicyTool as PolicyToolCollection,
    Schema as SchemaCollection,
    Token as TokenCollection,
    Tag,
    TagMessage,
    TopicConfig,
    UrlType
} from '@guardian/common';
import {GenerateUUIDv4, IOwner, IRootConfig, TagType} from '@guardian/interfaces';

// /**
//  * Publish schema tags
//  * @param schema
//  * @param owner
//  * @param root
//  */
// export async function publishSchemaTags(
//     schema: SchemaCollection,
//     owner: IOwner,
//     root: IRootConfig,
//     userId: string | null
// ): Promise<void> {
//     const filter: any = {
//         localTarget: schema.id,
//         entity: TagType.Schema,
//         status: 'Draft'
//     }
//     const tags = await DatabaseServer.getTags(filter);

//     const topic = await DatabaseServer.getTopicById(schema.topicId);
//     const topicConfig = await TopicConfig.fromObject(topic, true, userId);
//     const messageServer = new MessageServer({
//         operatorId: root.hederaAccountId,
//         operatorKey: root.hederaAccountKey,
//         signOptions: root.signOptions
//     }).setTopicObject(topicConfig);

//     const tagObjects = []

//     for (const tag of tags) {
//         tag.target = schema.messageId;
//         await publishTag(tag, messageServer, owner);

//         tagObjects.push(tag);
//     }

//     await new DatabaseServer().updateTags(tagObjects);
// }

/**
 * Publish schema tags
 * @param schema
 * @param owner
 * @param root
 */
export async function publishSchemaTags(
    schema: SchemaCollection,
    owner: IOwner,
    messageServer: MessageServer
): Promise<void> {
    const filter: any = {
        localTarget: schema.id,
        entity: TagType.Schema,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);
    const tagObjects = [];
    for (const tag of tags) {
        tag.target = schema.messageId;
        await publishTag(tag, messageServer, owner);
        tagObjects.push(tag);
    }
    await new DatabaseServer().updateTags(tagObjects);
}

/**
 * Publish policy tags
 * @param policy
 * @param owner
 * @param root
 */
export async function publishPolicyTags(
    policy: PolicyCollection,
    owner: IOwner,
    root: IRootConfig,
    userId: string | null
): Promise<void> {
    const filter: any = {
        localTarget: policy.id,
        entity: TagType.Policy,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);

    const topic = await DatabaseServer.getTopicById(policy.topicId);
    const topicConfig = await TopicConfig.fromObject(topic, true, userId);
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    }).setTopicObject(topicConfig);

    const tagObjects = []

    for (const tag of tags) {
        tag.target = policy.messageId;
        await publishTag(tag, messageServer, owner);

        tagObjects.push(tag);
    }

    await new DatabaseServer().updateTags(tagObjects);
}

/**
 * Publish token tags
 * @param token
 * @param owner
 * @param root
 */
export async function publishTokenTags(
    token: TokenCollection,
    owner: IOwner,
    root: IRootConfig,
    userId: string | null
): Promise<void> {
    const filter: any = {
        localTarget: token.id,
        entity: TagType.Token,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);

    const topic = await DatabaseServer.getTopicById(token.topicId);
    const topicConfig = await TopicConfig.fromObject(topic, true, userId);
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    }).setTopicObject(topicConfig);

    const tagObjects = []

    for (const tag of tags) {
        tag.target = token.tokenId;
        await publishTag(tag, messageServer, owner);

        tagObjects.push(tag);
    }

    await new DatabaseServer().updateTags(tagObjects);
}

/**
 * Publish tool tags
 * @param tool
 * @param owner
 * @param root
 */
export async function publishToolTags(
    tool: PolicyToolCollection,
    owner: IOwner,
    root: IRootConfig,
    userId: string | null
): Promise<void> {
    const filter: any = {
        localTarget: tool.id,
        entity: TagType.Tool,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);
    const topic = await DatabaseServer.getTopicById(tool.tagsTopicId);
    const topicConfig = await TopicConfig.fromObject(topic, true, userId);
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    }).setTopicObject(topicConfig);

    const tagObjects = []

    for (const tag of tags) {
        tag.target = tool.tagsTopicId;
        await publishTag(tag, messageServer, owner);

        tagObjects.push(tag);
    }

    await new DatabaseServer().updateTags(tagObjects);
}

/**
 * Publish module tags
 * @param module
 * @param owner
 * @param root
 */
export async function publishModuleTags(
    module: ModuleCollection,
    owner: IOwner,
    root: IRootConfig,
    userId: string | null
): Promise<void> {
    const filter: any = {
        localTarget: module.id,
        entity: TagType.Module,
        status: 'Draft'
    }
    const tags = await DatabaseServer.getTags(filter);

    const topic = await DatabaseServer.getTopicById(module.topicId);
    const topicConfig = await TopicConfig.fromObject(topic, true, userId);
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    }).setTopicObject(topicConfig);

    const tagObjects = []

    for (const tag of tags) {
        tag.target = module.messageId;
        await publishTag(tag, messageServer, owner);

        tagObjects.push(tag);
    }

    await new DatabaseServer().updateTags(tagObjects);
}

/**
 * Publish tag
 * @param item
 * @param messageServer
 * @param owner
 */
export async function publishTag(
    item: Tag,
    messageServer: MessageServer,
    owner: IOwner
): Promise<any> {
    item.operation = 'Create';
    item.status = 'Published';
    item.date = item.date || (new Date()).toISOString();
    const message = new TagMessage(MessageAction.PublishTag);
    message.setDocument(item);

    const buffer = Buffer.from(JSON.stringify(item.document));
    item.contentFileId = (await DatabaseServer.saveFile(GenerateUUIDv4(), buffer)).toString();

    const result = await messageServer
        .sendMessage(message, {
            sendToIPFS: true,
            memo: null,
            userId: owner.id,
            interception: owner.id
        });
    const messageId = result.getId();
    const topicId = result.getTopicId();
    item.messageId = messageId;
    item.topicId = topicId;
    item.uri = result.getDocumentUrl(UrlType.url);
    return item;
}
