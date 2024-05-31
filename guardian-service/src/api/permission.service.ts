import { ApiResponse } from '../api/helpers/api-response.js';
import {
    DataBaseHelper,
    GuardianRoleMessage,
    IAuthUser,
    Logger,
    MessageAction,
    MessageError,
    MessageResponse,
    MessageServer,
    Topic,
    TopicConfig,
    Users,
    VcHelper,
    Schema as SchemaCollection,
    VcDocument as VcDocumentCollection,
    UserPermissionsMessage,
} from '@guardian/common';
import { GenerateUUIDv4, IOwner, MessageAPI, Schema, SchemaEntity, SchemaHelper, TopicType } from '@guardian/interfaces';
import { publishSystemSchema } from './helpers/index.js';

async function getSchema(
    entity: SchemaEntity,
    owner: IOwner,
    messageServer: MessageServer
): Promise<SchemaCollection> {
    let schema = await new DataBaseHelper(SchemaCollection).findOne({
        entity,
        readonly: true,
        topicId: messageServer.getTopic()
    });
    if (schema) {
        return schema;
    } else {
        schema = await new DataBaseHelper(SchemaCollection).findOne({
            entity,
            system: true,
            active: true,
        });
        if (schema) {
            schema.creator = owner.creator;
            schema.owner = owner.owner;
            const item = await publishSystemSchema(
                schema,
                owner,
                messageServer,
                MessageAction.PublishSystemSchema
            );
            const result = await new DataBaseHelper(SchemaCollection).save(item);
            return result;
        } else {
            throw new Error(`Schema (${entity}) not found`);
        }
    }
}

async function createVc(
    entity: SchemaEntity,
    data: any,
    owner: IOwner,
    messageServer: MessageServer
) {
    const schema = await getSchema(entity, owner, messageServer);
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

async function createMessageServer(owner: IOwner): Promise<MessageServer> {
    const row = await new DataBaseHelper(Topic).findOne({
        owner: owner.owner,
        type: TopicType.UserTopic
    });
    const topicConfig = await TopicConfig.fromObject(row, true);
    const users = new Users();
    const root = await users.getHederaAccount(owner.creator);
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
    messageServer.setTopicObject(topicConfig);
    return messageServer;
}

/**
 * Demo API
 * @param channel
 * @param settingsRepository
 */
export async function permissionAPI(): Promise<void> {
    ApiResponse(MessageAPI.CREATE_ROLE,
        async (msg: { role: any, owner: IOwner }) => {
            try {
                const { role, owner } = msg;
                const data = {
                    id: GenerateUUIDv4(),
                    uuid: role.uuid,
                    name: role.name,
                    description: role.description,
                    permissions: role.permissions
                }
                const messageServer = await createMessageServer(owner);
                const document = await createVc(SchemaEntity.ROLE, data, owner, messageServer);
                const message = new GuardianRoleMessage(MessageAction.CreateRole);
                message.setRole(data);
                message.setDocument(document);
                await messageServer.sendMessage(message);
                const result = await new DataBaseHelper(VcDocumentCollection).save({
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
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.UPDATE_ROLE,
        async (msg: { role: any, owner: IOwner }) => {
            try {
                const { role, owner } = msg;
                const data = {
                    id: GenerateUUIDv4(),
                    uuid: role.uuid,
                    name: role.name,
                    description: role.description,
                    permissions: role.permissions
                }
                const messageServer = await createMessageServer(owner);
                const document = await createVc(SchemaEntity.ROLE, data, owner, messageServer);
                const message = new GuardianRoleMessage(MessageAction.UpdateRole);
                message.setRole(data);
                message.setDocument(document);
                await messageServer.sendMessage(message);
                const result = await new DataBaseHelper(VcDocumentCollection).save({
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
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.DELETE_ROLE,
        async (msg: { role: any, owner: IOwner }) => {
            try {
                const { role, owner } = msg;
                const data = {
                    id: GenerateUUIDv4(),
                    uuid: role.uuid,
                    name: role.name,
                    description: role.description,
                    permissions: role.permissions
                }
                const messageServer = await createMessageServer(owner);
                const document = await createVc(SchemaEntity.ROLE, data, owner, messageServer);
                const message = new GuardianRoleMessage(MessageAction.DeleteRole);
                message.setRole(data);
                message.setDocument(document);
                await messageServer.sendMessage(message);
                const result = await new DataBaseHelper(VcDocumentCollection).save({
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
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.SET_ROLE,
        async (msg: { user: IAuthUser, owner: IOwner }) => {
            try {
                const { user, owner } = msg;
                const roles: any[] = [];
                for (const group of user.permissionsGroup) {
                    roles.push({
                        uuid: group.uuid,
                        name: group.roleName,
                        owner: group.owner
                    })
                }
                const data = {
                    user: user.did
                }
                const messageServer = await createMessageServer(owner);
                const document = await createVc(SchemaEntity.USER_PERMISSIONS, {
                    id: GenerateUUIDv4(),
                    userId: user.did,
                    roles
                }, owner, messageServer);
                const message = new UserPermissionsMessage(MessageAction.SetRole);
                message.setRole(data);
                message.setDocument(document);
                await messageServer.sendMessage(message);
                const result = await new DataBaseHelper(VcDocumentCollection).save({
                    hash: message.hash,
                    owner: owner.owner,
                    creator: owner.creator,
                    document: message.document,
                    type: SchemaEntity.USER_PERMISSIONS,
                    documentFields: [
                        'credentialSubject.0.id',
                        'credentialSubject.0.roles',
                        'credentialSubject.0.userId'
                    ]
                });
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}
