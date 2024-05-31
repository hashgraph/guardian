import {
    DataBaseHelper,
    Schema as SchemaCollection,
    MessageAction,
    VcDocument as VcDocumentCollection,
    VcHelper,
    TopicConfig,
    Topic,
    MessageServer,
    Message,
    Users,
    GuardianRoleMessage,
    UserPermissionsMessage
} from '@guardian/common';
import { GenerateUUIDv4, IOwner, Schema, SchemaEntity, SchemaHelper, TopicType } from '@guardian/interfaces';
import { DynamicRole } from '../entity/dynamic-role.js';
import { User } from '../entity/user.js';

export async function createVc(
    entity: SchemaEntity,
    data: any,
    owner: IOwner,
    topicId: string
) {
    const schema = await new DataBaseHelper(SchemaCollection).findOne({
        entity,
        readonly: true,
        topicId
    });
    const schemaObject = new Schema(schema);
    const vcHelper = new VcHelper();
    let credentialSubject: any = data;
    if (schemaObject) {
        credentialSubject = SchemaHelper.updateObjectContext(
            schemaObject,
            credentialSubject
        );
    }
    const didDocument = await vcHelper.loadDidDocument(owner.creator);
    return await vcHelper.createVerifiableCredential(credentialSubject, didDocument, null, null);
}

export async function sendMessage(
    message: Message,
    owner: IOwner,
    topicConfig: TopicConfig
) {
    const users = new Users();
    const root = await users.getHederaAccount(owner.creator);
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
    messageServer.setTopicObject(topicConfig);
    await messageServer.sendMessage(message);
}

export async function createRoleMessage(
    role: DynamicRole,
    owner: IOwner
): Promise<void> {
    const topicConfig = await TopicConfig.fromObject(
        await new DataBaseHelper(Topic).findOne({ owner: parent, type: TopicType.UserTopic }), true);
    const data = {
        uuid: role.uuid,
        name: role.name,
        description: role.description,
        permissions: role.permissions
    }
    const document = await createVc(SchemaEntity.ROLE, data, owner, topicConfig.topicId);
    const message = new GuardianRoleMessage(MessageAction.CreateRole);
    message.setRole(data);
    message.setDocument(document);
    await sendMessage(message, owner, topicConfig)
    await new DataBaseHelper(VcDocumentCollection).save({
        hash: message.hash,
        owner: owner.owner,
        creator: owner.creator,
        document: message.document,
        type: SchemaEntity.ROLE,
        documentFields: [
            'credentialSubject.0.id',
            'credentialSubject.0.name',
            'credentialSubject.0.uuid'
        ],
    });
}

export async function updateRoleMessage(
    role: DynamicRole,
    owner: IOwner
): Promise<void> {
    const topicConfig = await TopicConfig.fromObject(
        await new DataBaseHelper(Topic).findOne({ owner: parent, type: TopicType.UserTopic }), true);
    const data = {
        uuid: role.uuid,
        name: role.name,
        description: role.description,
        permissions: role.permissions
    }
    const document = await createVc(SchemaEntity.ROLE, data, owner, topicConfig.topicId);
    const message = new GuardianRoleMessage(MessageAction.UpdateRole);
    message.setRole(data);
    message.setDocument(document);
    await sendMessage(message, owner, topicConfig)
    await new DataBaseHelper(VcDocumentCollection).save({
        hash: message.hash,
        owner: owner.owner,
        creator: owner.creator,
        document: message.document,
        type: SchemaEntity.ROLE,
        documentFields: [
            'credentialSubject.0.id',
            'credentialSubject.0.name',
            'credentialSubject.0.uuid'
        ],
    });
}

export async function deleteRoleMessage(
    role: DynamicRole,
    owner: IOwner
): Promise<void> {
    const topicConfig = await TopicConfig.fromObject(
        await new DataBaseHelper(Topic).findOne({ owner: parent, type: TopicType.UserTopic }), true);
    const data = {
        uuid: role.uuid,
        name: role.name,
        description: role.description,
        permissions: role.permissions
    }
    const document = await createVc(SchemaEntity.ROLE, data, owner, topicConfig.topicId);
    const message = new GuardianRoleMessage(MessageAction.DeleteRole);
    message.setRole(data);
    message.setDocument(document);
    await sendMessage(message, owner, topicConfig)
    await new DataBaseHelper(VcDocumentCollection).save({
        hash: message.hash,
        owner: owner.owner,
        creator: owner.creator,
        document: message.document,
        type: SchemaEntity.ROLE,
        documentFields: [
            'credentialSubject.0.id',
            'credentialSubject.0.name',
            'credentialSubject.0.uuid'
        ],
    });
}

export async function setRoleMessage(
    user: User,
    owner: IOwner
): Promise<void> {
    const ids = new Map<string, any>();
    for (const group of user.permissionsGroup) {
        ids.set(group.roleId, {
            name: group.roleName,
            owner: group.owner
        })
    }
    const roles = await new DataBaseHelper(DynamicRole).find({ id: { $in: Array.from(ids.keys()) } });
    for (const role of roles) {
        const config = ids.get(role.id) || {};
        config.uuid = role.uuid;
        config.name = role.name;
        config.owner = config.owner || owner.creator;
    }

    const topicConfig = await TopicConfig.fromObject(
        await new DataBaseHelper(Topic).findOne({ owner: parent, type: TopicType.UserTopic }), true);
    const data = {
        user: user.did
    }
    const document = await createVc(SchemaEntity.USER_PERMISSIONS, {
        id: GenerateUUIDv4(),
        userId: user.did,
        roles: Array.from(ids.values())
    }, owner, topicConfig.topicId);
    const message = new UserPermissionsMessage(MessageAction.SetRole);
    message.setRole(data);
    message.setDocument(document);
    await sendMessage(message, owner, topicConfig)
    await new DataBaseHelper(VcDocumentCollection).save({
        hash: message.hash,
        owner: owner.owner,
        creator: owner.creator,
        document: message.document,
        type: SchemaEntity.USER_PERMISSIONS,
        documentFields: [
            'credentialSubject.0.id',
            'credentialSubject.0.roles',
            'credentialSubject.0.userId'
        ],
    });
}