import { IAuthUser } from './auth.interface.js';
import pkg from 'jsonwebtoken';

import { User } from '../entity/user.js';
import { DynamicRole } from '../entity/dynamic-role.js';
import * as util from 'util';
import crypto from 'crypto';
import { DataBaseHelper, Logger, MessageError, MessageResponse, NatsService, ProviderAuthUser, SecretManager, Singleton } from '@guardian/common';
import {
    AuditDefaultPermission,
    AuthEvents,
    GenerateUUIDv4,
    IGenerateTokenMessage,
    IGenerateTokenResponse,
    IGetAllUserResponse,
    IGetDemoUserResponse,
    IGetUserByIdMessage,
    IGetUserByTokenMessage,
    IGetUserMessage,
    IGetUsersByAccountMessage,
    IGetUsersByIdMessage,
    IGetUsersByIRoleMessage,
    IGroup,
    IRegisterNewUserMessage,
    ISaveUserMessage,
    IStandardRegistryUserResponse,
    IUpdateUserMessage,
    IUser,
    OldRoles,
    SRDefaultPermission,
    UserDefaultPermission,
    UserRole
} from '@guardian/interfaces';
import { getRequiredProps } from '#utils';
import { REGISTER_REQUIRED_PROPS, USER_REQUIRED_PROPS } from '#constants';

const { sign, verify } = pkg;

export function setDefaultPermissions(user: User): User {
    if (user) {
        if (user.role === UserRole.STANDARD_REGISTRY) {
            user.permissions = SRDefaultPermission;
        } else if (user.role === UserRole.AUDITOR) {
            user.permissions = AuditDefaultPermission;
        } else if (user.role === UserRole.USER) {
            if (user.permissionsGroup && user.permissionsGroup.length) {
                user.permissions = [
                    ...UserDefaultPermission,
                    ...user.permissions
                ];
            } else {
                user.permissions = OldRoles;
            }
        } else {
            user.permissions = UserDefaultPermission;
        }
    }
    return user;
}

export async function createNewUser(
    username: string,
    password: string,
    role: UserRole,
    walletToken: string,
    parent: string,
    did: string,
    provider: string,
    providerId: string
): Promise<User> {
    const defaultRole = await new DataBaseHelper(DynamicRole).findOne({
        owner: null,
        default: true,
        readonly: true
    });
    const permissionsGroup: IGroup[] = defaultRole ? [{
        uuid: defaultRole.uuid,
        roleId: defaultRole.id,
        roleName: defaultRole.name,
        owner: null
    }] : [];
    const permissions = defaultRole ? defaultRole.permissions : [];
    const user = (new DataBaseHelper(User)).create({
        username,
        password,
        role,
        walletToken,
        parent,
        did,
        provider,
        providerId,
        permissionsGroup,
        permissions
    });
    return await (new DataBaseHelper(User)).save(user);
}

/**
 * Account service
 */
@Singleton
export class AccountService extends NatsService {

    /**
     * Message queue name
     */
    public messageQueueName = 'auth-users-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'auth-users-queue-reply-' + GenerateUUIDv4();

    /**
     * Register listeners
     */
    registerListeners(): void {

        /**
         * Get user by access token
         * @param token - access token
         */
        this.getMessages<IGetUserByTokenMessage, User>(AuthEvents.GET_USER_BY_TOKEN, async (msg: any) => {
            const { token } = msg;
            const secretManager = SecretManager.New();
            const { ACCESS_TOKEN_SECRET } = await secretManager.getSecrets('secretkey/auth')
            try {
                const decryptedToken = await util.promisify<string, any, Object, IAuthUser>(verify)(token, ACCESS_TOKEN_SECRET, {});
                if (Date.now() > decryptedToken.expireAt) {
                    throw new Error('Token expired');
                }

                const user = await new DataBaseHelper(User).findOne({ username: decryptedToken.username });
                return new MessageResponse(getRequiredProps(setDefaultPermissions(user), USER_REQUIRED_PROPS));
            } catch (error) {
                return new MessageError(error);
            }
        });

        /**
         * Get user by DID
         * @param did - DID
         */
        this.getMessages<IGetUserByIdMessage, IUser>(AuthEvents.GET_USER_BY_ID, async (msg: any) => {
            const { did } = msg;
            try {
                const user = await new DataBaseHelper(User).findOne({ did })
                return new MessageResponse(setDefaultPermissions(user));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        /**
         * Get user by username
         * @param username - username
         */
        this.getMessages<IGetUserMessage, User>(AuthEvents.GET_USER, async (msg: any) => {
            const { username } = msg;
            try {
                const user = await new DataBaseHelper(User).findOne({ username })
                return new MessageResponse(setDefaultPermissions(user));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        /**
         * Get user by Hedera Account
         * @param account - Hedera Account ID
         */
        this.getMessages<IGetUsersByAccountMessage, IUser>(AuthEvents.GET_USER_BY_ACCOUNT, async (msg: any) => {
            const { account } = msg;
            try {
                const user = await new DataBaseHelper(User).findOne({ hederaAccountId: account })
                return new MessageResponse(setDefaultPermissions(user));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        /**
         * Get user by provider
         * @param provider - Provider
         * @param providerId - Provider ID
         */
        this.getMessages<IGetUserMessage, User>(AuthEvents.GET_USER_BY_PROVIDER_USER_DATA, async (msg: any) => {
            const { providerId, provider } = msg;
            try {
                const user = await new DataBaseHelper(User).findOne({ providerId, provider })
                return new MessageResponse(setDefaultPermissions(user));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        /**
         * Get user by parent
         * @param did - Parent DID
         */
        this.getMessages<any, IGetAllUserResponse[]>(AuthEvents.GET_USERS_BY_SR_ID, async (msg) => {
            try {
                const { did } = msg;
                return new MessageResponse(await new DataBaseHelper(User).find({ parent: did }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        /**
         * Get users by DIDs
         * @param dids - DIDs
         */
        this.getMessages<IGetUsersByIdMessage, IUser[]>(AuthEvents.GET_USERS_BY_ID, async (msg: any) => {
            const { dids } = msg;
            try {
                return new MessageResponse(await new DataBaseHelper(User).find({ did: { $in: dids } }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        /**
         * Get users by Role (Category)
         * @param role - Role (Category)
         */
        this.getMessages<IGetUsersByIRoleMessage, IUser[]>(AuthEvents.GET_USERS_BY_ROLE, async (msg: any) => {
            const { role } = msg;
            try {
                return new MessageResponse(await new DataBaseHelper(User).find({ role }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        /**
         * Get All 'User'
         */
        this.getMessages<any, IGetAllUserResponse[]>(AuthEvents.GET_ALL_USER_ACCOUNTS, async (_: any) => {
            try {
                const userAccounts = (await new DataBaseHelper(User)
                    .find({ role: UserRole.USER }))
                    .map((e) => ({
                        username: e.username,
                        parent: e.parent,
                        did: e.did
                    }));
                return new MessageResponse(userAccounts);
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        /**
         * Get All 'Standard Registry'
         */
        this.getMessages<any, IStandardRegistryUserResponse[]>(AuthEvents.GET_ALL_STANDARD_REGISTRY_ACCOUNTS, async (_) => {
            try {
                const userAccounts = (await new DataBaseHelper(User)
                    .find({ role: UserRole.STANDARD_REGISTRY }))
                    .map((e) => ({
                        username: e.username,
                        did: e.did
                    }));
                return new MessageResponse(userAccounts);
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        /**
         * Get All
         */
        this.getMessages<any, IGetDemoUserResponse[]>(AuthEvents.GET_ALL_USER_ACCOUNTS_DEMO, async (_) => {
            try {
                const userAccounts = (await new DataBaseHelper(User).find({
                    template: { $ne: true }
                })).map((e) => ({
                    parent: e.parent,
                    did: e.did,
                    username: e.username,
                    role: e.role
                }));
                return new MessageResponse(userAccounts);
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<IRegisterNewUserMessage, User>(AuthEvents.REGISTER_NEW_USER, async (msg) => {
            try {
                const userRepository = new DataBaseHelper(User);

                const { username, password, role } = msg;
                const passwordDigest = crypto.createHash('sha256').update(password).digest('hex');

                const checkUserName = await userRepository.count({ username });
                if (checkUserName) {
                    return new MessageError('An account with the same name already exists.');
                }
                const user = await createNewUser(
                    username,
                    passwordDigest,
                    role,
                    '',
                    null,
                    null,
                    null,
                    null,
                );

                return new MessageResponse(getRequiredProps(user, REGISTER_REQUIRED_PROPS));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error)
            }
        });

        this.getMessages<IRegisterNewUserMessage, User>(AuthEvents.REGISTER_NEW_TEMPLATE,
            async (msg: { role: string, did: string, parent: string }) => {
                try {
                    const { role, did, parent } = msg;
                    const username = `template_${Date.now()}${Math.round(Math.random() * 1000)}`;
                    const row = (new DataBaseHelper(User)).create({
                        username,
                        role,
                        parent,
                        did,
                        template: true
                    });
                    const user = await (new DataBaseHelper(User)).save(row);
                    return new MessageResponse(user);
                } catch (error) {
                    new Logger().error(error, ['AUTH_SERVICE']);
                    return new MessageError(error)
                }
            });

        this.getMessages<IRegisterNewUserMessage, User>(AuthEvents.GENERATE_NEW_TOKEN_BASED_ON_USER_PROVIDER,
            async (msg: ProviderAuthUser) => {
                try {
                    let user = await (new DataBaseHelper(User))
                        .findOne({ username: msg.username, template: { $ne: true } });
                    if (!user) {
                        user = await createNewUser(
                            msg.username,
                            null,
                            msg.role,
                            '',
                            null,
                            null,
                            msg.provider,
                            msg.providerId
                        )
                    }
                    const secretManager = SecretManager.New();
                    const { ACCESS_TOKEN_SECRET } = await secretManager.getSecrets('secretkey/auth')
                    const accessToken = sign({
                        username: user.username,
                        did: user.did,
                        role: user.role
                    }, ACCESS_TOKEN_SECRET);
                    return new MessageResponse({
                        username: user.username,
                        did: user.did,
                        role: user.role,
                        accessToken
                    })
                } catch (error) {
                    new Logger().error(error, ['AUTH_SERVICE']);
                    return new MessageError(error)
                }
            });

        this.getMessages<IGenerateTokenMessage, IGenerateTokenResponse>(AuthEvents.GENERATE_NEW_TOKEN, async (msg) => {
            try {
                const { username, password } = msg;
                const passwordDigest = crypto.createHash('sha256').update(password).digest('hex');

                const secretManager = SecretManager.New();

                const { ACCESS_TOKEN_SECRET } = await secretManager.getSecrets('secretkey/auth');

                const REFRESH_TOKEN_UPDATE_INTERVAL = process.env.REFRESH_TOKEN_UPDATE_INTERVAL || '31536000000' // 1 year

                const user = await new DataBaseHelper(User).findOne({
                    username,
                    template: { $ne: true }
                });
                if (user && passwordDigest === user.password) {
                    const tokenId = GenerateUUIDv4();
                    const refreshToken = sign({
                        id: tokenId,
                        name: user.username,
                        expireAt: Date.now() + parseInt(REFRESH_TOKEN_UPDATE_INTERVAL, 10)
                    }, ACCESS_TOKEN_SECRET);
                    user.refreshToken = tokenId;
                    await new DataBaseHelper(User).save(user);
                    return new MessageResponse({
                        username: user.username,
                        did: user.did,
                        role: user.role,
                        refreshToken
                    })
                } else {
                    return new MessageError('Unauthorized request', 401);
                }

            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages(AuthEvents.GENERATE_NEW_ACCESS_TOKEN, async (msg) => {
            const { refreshToken } = msg;
            const secretManager = SecretManager.New();

            const { ACCESS_TOKEN_SECRET } = await secretManager.getSecrets('secretkey/auth')

            const decryptedToken = await util.promisify<string, any, Object, any>(verify)(refreshToken, ACCESS_TOKEN_SECRET, {});
            if (Date.now() > decryptedToken.expireAt) {
                return new MessageResponse({})
            }

            const user = await new DataBaseHelper(User).findOne({
                refreshToken: decryptedToken.id,
                username: decryptedToken.name,
                template: { $ne: true }
            });
            if (!user) {
                return new MessageResponse({})
            }

            const ACCESS_TOKEN_UPDATE_INTERVAL = process.env.ACCESS_TOKEN_UPDATE_INTERVAL || '60000'

            const accessToken = sign({
                username: user.username,
                did: user.did,
                role: user.role,
                expireAt: Date.now() + parseInt(ACCESS_TOKEN_UPDATE_INTERVAL, 10)
            }, ACCESS_TOKEN_SECRET);

            return new MessageResponse({ accessToken });
        });

        this.getMessages<IUpdateUserMessage, any>(AuthEvents.UPDATE_USER, async (msg) => {
            const { username, item } = msg;
            try {
                const user = await (new DataBaseHelper(User))
                    .findOne({ username });
                if (!user) {
                    return new MessageResponse(null);
                }
                Object.assign(user, item);
                const template = await (new DataBaseHelper(User))
                    .findOne({ did: item.did, template: true });
                if (template) {
                    user.permissions = template.permissions;
                    user.permissionsGroup = template.permissionsGroup;
                    await new DataBaseHelper(User).delete(template);
                }
                const result = await new DataBaseHelper(User).update(user);
                return new MessageResponse(result);
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<ISaveUserMessage, IUser>(AuthEvents.SAVE_USER, async (msg) => {
            const { user } = msg;
            try {
                return new MessageResponse(await new DataBaseHelper(User).save(user));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages(AuthEvents.GET_USER_ACCOUNTS, async (msg: any) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid load users parameter');
                }

                const { filters, pageIndex, pageSize, parent } = msg;
                const otherOptions: any = {
                    fields: [
                        'username',
                        'did',
                        'hederaAccountId',
                        'role',
                        'permissionsGroup',
                        'permissions',
                        'template'
                    ]
                };
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = _pageSize;
                    otherOptions.offset = _pageIndex * _pageSize;
                } else {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = 100;
                }
                const options: any = { parent };
                if (filters) {
                    if (filters.role) {
                        options['permissionsGroup.roleId'] = filters.role;
                    }
                    if (filters.username) {
                        options.username = { $regex: '.*' + filters.username + '.*' };
                    }
                    if (filters.did) {
                        options.did = filters.did;
                    }
                }
                const [items, count] = await new DataBaseHelper(User).findAndCount(options, otherOptions);
                return new MessageResponse({ items, count });
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
    }
}
