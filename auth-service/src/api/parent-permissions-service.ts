import { User } from '../entity/user.js';
import { DatabaseServer, MessageError, MessageResponse, NatsService, PinoLogger, Singleton } from '@guardian/common';
import { AuthEvents, GenerateUUIDv4, IGetGlobalApplicationKey, IGetKeyMessage, IGetKeyResponse, IGroup, ISetGlobalApplicationKey, ISetKeyMessage, WalletEvents } from '@guardian/interfaces';
import { IVault } from '../vaults/index.js';
import { ParentPermissions } from '../entity/parent-permissions.js';
import { permission } from 'process';
import { UserProp, UserUtils } from '#utils';
import { getDefaultRole } from './role-service.js';

/**
 * Parent permissions service
 */
@Singleton
export class ParentPermissionsService extends NatsService {

    /**
     * Message queue name
     */
    public messageQueueName = 'parent-permissions-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'parent-permissions-queue-reply-' + GenerateUUIDv4();


    /**
     * Register listeners
     */
    registerListeners(logger: PinoLogger): void {
        this.getMessages<any, any>(AuthEvents.ADD_USER_PARENT,
            async (msg: { username: string, parent: string }) => {
                const { username, parent } = msg;
                try {
                    const entityRepository = new DatabaseServer();
                    const user = await UserUtils.getUser({ username }, UserProp.RAW);

                    if(user.parents?.includes(parent)) {
                        throw new Error("The Standard Registry DID is already included in the user's parents");
                    }

                    if(!user.parents) {
                        user.parents = [];
                    }

                    user.parents.push(parent);

                    await entityRepository.update(User, null, user);

                    const defaultRole = await getDefaultRole(parent);
                    let permissions = [];
                    let permissionsGroup = [];
                    if (defaultRole) {
                        permissionsGroup = [{
                            uuid: defaultRole.uuid,
                            roleId: defaultRole.id,
                            roleName: defaultRole.name,
                            owner: parent
                        }];
                        permissions = defaultRole.permissions;
                    }

                    const row = entityRepository.create(ParentPermissions, {
                        username,
                        parent,
                        permissionsGroup,
                        permissions
                    });
                    await entityRepository.save(ParentPermissions, row);

                    return new MessageResponse(user);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE']);
                    return new MessageError(error);
                }
            });
        this.getMessages<any, any>(AuthEvents.UPDATE_USER_PARENT,
            async (msg: { username: string, parent: string }) => {
                const { username, parent } = msg;
                try {
                    const user = await UserUtils.getUser({ username }, UserProp.RAW);
                    if(!user.parents?.includes(parent)) {
                        throw new Error("The Standard Registry DID is not included in the user's parents");
                    }
                    user.parent = parent;
                    await UserUtils.updateUserPermissions(user);

                    return new MessageResponse(user);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE']);
                    return new MessageError(error);
                }
            });
    }
}
