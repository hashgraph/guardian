import { ApiResponse } from '../api/helpers/api-response.js';
import {
    GuardianRoleMessage,
    IAuthUser,
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
    PinoLogger,
    KeyType,
    KEY_TYPE_KEY_ENTITY,
    KeyEntity,
    Token, DatabaseServer,
    NewNotifier,
} from '@guardian/common';
import { GenerateUUIDv4, IOwner, MessageAPI, Schema, SchemaEntity, SchemaHelper, TopicType } from '@guardian/interfaces';
import { publishSystemSchema } from '../helpers/import-helpers/index.js';

async function getSchema(
    entity: SchemaEntity,
    owner: IOwner,
    messageServer: MessageServer
): Promise<SchemaCollection> {
    const dataBaseServer = new DatabaseServer();

    let schema = await dataBaseServer.findOne(SchemaCollection, {
        entity,
        readonly: true,
        topicId: messageServer.getTopic()
    });
    if (schema) {
        return schema;
    } else {
        schema = await dataBaseServer.findOne(SchemaCollection, {
            entity,
            system: true,
            active: true,
        });
        if (schema) {
            const item = await publishSystemSchema(schema, owner, messageServer, NewNotifier.empty());
            const result = await dataBaseServer.save(SchemaCollection, item);
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
    if (Array.isArray(credentialSubject.role)) {
        for (const role of credentialSubject.roles) {
            role.owner = role.owner || '';
        }
    }
    const didDocument = await vcHelper.loadDidDocument(owner.creator, owner.id);
    return await vcHelper.createVerifiableCredential(credentialSubject, didDocument, null, null);
}

async function createMessageServer(owner: IOwner): Promise<MessageServer> {
    const row = await new DatabaseServer().findOne(Topic, {
        owner: owner.owner,
        type: TopicType.UserTopic
    });
    const topicConfig = await TopicConfig.fromObject(row, true, owner.id);
    const users = new Users();
    const root = await users.getHederaAccount(owner.creator, owner.id);
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    });
    messageServer.setTopicObject(topicConfig);
    return messageServer;
}

export async function serDefaultRole(user: IAuthUser, owner: IOwner): Promise<any> {
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
    await messageServer.sendMessage(message, {
        sendToIPFS: true,
        memo: null,
        userId: owner.id,
        interception: null
    });

    const result = await new DatabaseServer().save(VcDocumentCollection, {
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
    return result;
}

/**
 * Demo API
 * @param channel
 * @param settingsRepository
 */
export async function permissionAPI(logger: PinoLogger): Promise<void> {
    ApiResponse(MessageAPI.CREATE_ROLE,
        async (msg: { role: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
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
                await messageServer.sendMessage(message, {
                    sendToIPFS: true,
                    memo: null,
                    userId,
                    interception: null
                });
                const result = await new DatabaseServer().save(VcDocumentCollection, {
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
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.UPDATE_ROLE,
        async (msg: { role: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
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
                await messageServer.sendMessage(message, {
                    sendToIPFS: true,
                    memo: null,
                    userId,
                    interception: null
                });
                const result = await new DatabaseServer().save(VcDocumentCollection, {
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
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.DELETE_ROLE,
        async (msg: { role: any, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
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
                await messageServer.sendMessage(message, {
                    sendToIPFS: true,
                    memo: null,
                    userId,
                    interception: null
                });
                const result = await new DatabaseServer().save(VcDocumentCollection, {
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
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.SET_ROLE,
        async (msg: { user: IAuthUser, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { user, owner } = msg;
                const result = await serDefaultRole(user, owner);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.CHECK_KEY_PERMISSIONS,
        async (msg: { did: string, keyType: KeyType, entityId: string, userId: string | null }) => {
            const userId = msg?.userId
            try {
                const { did, keyType, entityId } = msg;

                const entity = KEY_TYPE_KEY_ENTITY.get(keyType);

                if (!entity) {
                    return new MessageResponse(false);
                }

                const dataBaseServer = new DatabaseServer();

                switch (entity) {
                    case KeyEntity.KEY:
                        return new MessageResponse(did === entityId);
                    case KeyEntity.MESSAGE:
                        return new MessageResponse(true);
                    case KeyEntity.DID:
                        return new MessageResponse(
                            did === entityId?.split('#')[0]
                        );
                    case KeyEntity.TOKEN:
                        return new MessageResponse(
                            await dataBaseServer.count(Token, {
                                owner: did,
                                tokenId: entityId
                            }) > 0
                        );
                    case KeyEntity.TOPIC:
                        return new MessageResponse(
                            await dataBaseServer.count(Topic, {
                                owner: did,
                                topicId: entityId
                            }) > 0
                        );
                    case KeyEntity.DISCUSSION:
                        return new MessageResponse(true);
                    case KeyEntity.RELAYER_ACCOUNT:
                        return new MessageResponse(entityId?.startsWith(did));
                    default:
                        return new MessageResponse(false);
                }
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });
}
