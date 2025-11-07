import { User } from '../entity/user.js';
import { DatabaseServer, MessageError, MessageResponse, NatsService, PinoLogger, ProviderAuthUser, Singleton } from '@guardian/common';
import {
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
    IRegisterNewUserMessage,
    IStandardRegistryUserResponse,
    IUpdateUserMessage,
    IUser,
    LocationType,
    UserRole
} from '@guardian/interfaces';
import { UserUtils, UserPassword, PasswordType, UserAccessTokenService, UserProp } from '#utils';
import { passwordComplexity, PasswordError } from '#constants';
import { HttpStatus } from '@nestjs/common';

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
    registerListeners(logger: PinoLogger): void {

        /**
         * Get user by access token
         * @param token - access token
         */
        this.getMessages<IGetUserByTokenMessage, User>(AuthEvents.GET_USER_BY_TOKEN,
            async (msg: { token: string }) => {
                const { token } = msg;
                try {
                    const userAccessTokenService = await UserAccessTokenService.New();
                    const decryptedToken = await userAccessTokenService.verifyAccessToken(token);

                    if (Date.now() > decryptedToken.expireAt) {
                        throw new Error('Token expired');
                    }

                    const user = await UserUtils.getUser({ username: decryptedToken.username }, UserProp.REQUIRED);
                    return new MessageResponse(user);
                } catch (error) {
                    return new MessageError(error);
                }
            });

        /**
         * Get user by DID
         * @param did - DID
         */
        this.getMessages<IGetUserByIdMessage, IUser>(AuthEvents.GET_USER_BY_ID,
            async (msg: { did: string, userId: string | null }) => {
                const { did, userId } = msg;
                try {
                    const user = await UserUtils.getUser({ did }, UserProp.WITH_KEYS);
                    return new MessageResponse(user);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get user by username
         * @param username - username
         */
        this.getMessages<IGetUserMessage, User>(AuthEvents.GET_USER,
            async (msg: {
                username: string,
                userId: string | null
            }) => {
                const { username, userId } = msg;
                try {
                    const user = await UserUtils.getUser({ username }, UserProp.WITH_KEYS);
                    return new MessageResponse(user);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get user by Hedera Account
         * @param account - Hedera Account ID
         */
        this.getMessages<IGetUsersByAccountMessage, IUser>(AuthEvents.GET_USER_BY_ACCOUNT,
            async (msg: { account: string, userId: string | null }) => {
                const { account, userId } = msg;
                try {
                    const user = await UserUtils.getUser({ hederaAccountId: account }, UserProp.WITH_KEYS);
                    return new MessageResponse(user);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get user by provider
         * @param provider - Provider
         * @param providerId - Provider ID
         */
        this.getMessages<IGetUserMessage, User>(AuthEvents.GET_USER_BY_PROVIDER_USER_DATA,
            async (msg: { providerId: string, provider: string, userId: string | null }) => {
                const { providerId, provider, userId } = msg;
                try {
                    const user = await UserUtils.getUser({ providerId, provider }, UserProp.WITH_KEYS);
                    return new MessageResponse(user);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get user by parent
         * @param did - Parent DID
         */
        this.getMessages<any, IGetAllUserResponse[]>(AuthEvents.GET_USERS_BY_SR_ID,
            async (msg: { did: string, userId: string | null }) => {
                const { did, userId } = msg;
                try {
                    const users = await UserUtils.getUsers({ parent: did }, UserProp.WITH_KEYS);
                    return new MessageResponse(users);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Return remote users
         * @param did - Parent DID
         */
        this.getMessages<any, IGetAllUserResponse[]>(AuthEvents.GET_REMOTE_USERS,
            async (msg: { did: string, userId: string | null }) => {
                const { did, userId } = msg;
                try {
                    const users = await UserUtils.getUsers({
                        parent: did,
                        location: LocationType.REMOTE
                    }, UserProp.WITH_KEYS);
                    return new MessageResponse(users);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get users by DIDs
         * @param dids - DIDs
         */
        this.getMessages<IGetUsersByIdMessage, IUser[]>(AuthEvents.GET_USERS_BY_ID,
            async (msg: { dids: string[], userId: string | null }) => {
                const { dids, userId } = msg;
                try {
                    const users = await UserUtils.getUsers({ did: { $in: dids } }, UserProp.WITH_KEYS);
                    return new MessageResponse(users);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get users by Role (Category)
         * @param role - Role (Category)
         */
        this.getMessages<IGetUsersByIRoleMessage, IUser[]>(AuthEvents.GET_USERS_BY_ROLE,
            async (msg: { role: UserRole, userId: string | null }) => {
                const { role, userId } = msg;
                try {
                    const users = await UserUtils.getUsers({ role }, UserProp.WITH_KEYS);
                    return new MessageResponse(users);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get All 'User'
         */
        this.getMessages<any, IGetAllUserResponse[]>(AuthEvents.GET_ALL_USER_ACCOUNTS,
            async (msg: { userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    const userRepository = new DatabaseServer()

                    const users = await userRepository.find(User, { role: UserRole.USER })

                    const userAccounts = users.map((e) => ({
                        username: e.username,
                        parent: e.parent,
                        did: e.did
                    }));

                    return new MessageResponse(userAccounts);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get All 'Standard Registry'
         */
        this.getMessages<any, IStandardRegistryUserResponse[]>(AuthEvents.GET_ALL_STANDARD_REGISTRY_ACCOUNTS,
            async (msg: { userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    const userRepository = new DatabaseServer()

                    const users = await userRepository.find(User, { role: UserRole.STANDARD_REGISTRY })

                    const userAccounts = users.map((e) => ({
                        username: e.username,
                        did: e.did
                    }));

                    return new MessageResponse(userAccounts);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        /**
         * Get All
         */
        this.getMessages<any, IGetDemoUserResponse[]>(AuthEvents.GET_ALL_USER_ACCOUNTS_DEMO,
            async (msg: { userId: string | null }) => {
                const userId = msg?.userId;
                try {
                    const userRepository = new DatabaseServer()

                    const users = await userRepository.find(User, { template: { $ne: true } })

                    const userAccounts = users.map((e) => ({
                        parent: e.parent,
                        did: e.did,
                        username: e.username,
                        role: e.role
                    }));

                    return new MessageResponse(userAccounts);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        this.getMessages<IRegisterNewUserMessage, User>(AuthEvents.REGISTER_NEW_USER,
            async (msg: { username: string, password: string, role: UserRole }) => {
                try {
                    const { username, password, role } = msg;

                    const checkUserName = await new DatabaseServer().count(User, { username })

                    if (checkUserName) {
                        return new MessageError('An account with the same name already exists.');
                    }

                    const isValidPassword = UserPassword.validatePassword(password);

                    if (!isValidPassword) {
                        return new MessageError(PasswordError[passwordComplexity], HttpStatus.UNPROCESSABLE_ENTITY);
                    }

                    const passwordDigest = await UserPassword.generatePasswordV2(password);
                    const user = await UserUtils.createNewUser({
                        username,
                        password: passwordDigest.password,
                        salt: passwordDigest.salt,
                        passwordVersion: passwordDigest.passwordVersion,
                        role,
                        walletToken: ''
                    });

                    return new MessageResponse(user);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], null);
                    return new MessageError(error)
                }
            });

        this.getMessages<IRegisterNewUserMessage, User>(AuthEvents.REGISTER_NEW_TEMPLATE,
            async (msg: { role: UserRole, did: string, parent: string }) => {
                try {
                    const { role, did, parent } = msg;
                    const user = await UserUtils.createUserTemplate(role, parent, did);
                    return new MessageResponse(user);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], null);
                    return new MessageError(error)
                }
            });

        this.getMessages<IRegisterNewUserMessage, User>(AuthEvents.GENERATE_NEW_TOKEN_BASED_ON_USER_PROVIDER,
            async (msg: ProviderAuthUser) => {
                try {
                    const { username, role, provider, providerId } = msg;
                    let user = await UserUtils.getUser({ username, template: { $ne: true } }, UserProp.REQUIRED)
                    if (!user) {
                        user = await UserUtils.createNewUser({
                            username,
                            role,
                            provider,
                            providerId,
                            walletToken: ''
                        })
                    }

                    const userAccessTokenService = await UserAccessTokenService.New();
                    const accessToken = userAccessTokenService.generateAccessToken(user, false);
                    return new MessageResponse({
                        username: user.username,
                        did: user.did,
                        role: user.role,
                        accessToken
                    })
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], null);
                    return new MessageError(error)
                }
            });

        this.getMessages<IGenerateTokenMessage, IGenerateTokenResponse>(AuthEvents.GENERATE_NEW_TOKEN,
            async (msg: { username: string, password: string }) => {
                try {
                    const { username, password } = msg;
                    const user = await UserUtils.getUser({ username, template: { $ne: true } }, UserProp.RAW);
                    if (user) {
                        if (user.passwordVersion === PasswordType.V2) {
                            if (await UserPassword.verifyPasswordV2(user, password)) {
                                const userAccessTokenService = await UserAccessTokenService.New();
                                const token = userAccessTokenService.generateRefreshToken(user);
                                if (!Array.isArray(user.refreshToken)) {
                                    user.refreshToken = [];
                                }
                                user.refreshToken.push(token.id);

                                await new DatabaseServer().save(User, user);

                                const isStrongPassword = UserPassword.validatePassword(password);

                                return new MessageResponse({
                                    username: user.username,
                                    did: user.did,
                                    role: user.role,
                                    refreshToken: token.token,
                                    weakPassword: !isStrongPassword,
                                })
                            }
                        } else {
                            if (await UserPassword.verifyPasswordV1(user, password)) {
                                return new MessageError('UNSUPPORTED_PASSWORD_TYPE', 401);
                            }
                        }
                    }
                    return new MessageError('Unauthorized request', 401);
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], null);
                    return new MessageError(error);
                }
            });

        this.getMessages(AuthEvents.CHANGE_USER_PASSWORD,
            async (msg: { username: string, oldPassword: string, newPassword: string, userId: string | null }) => {
                const { username, oldPassword, newPassword, userId } = msg;
                try {
                    const user = await UserUtils.getUser({ username, template: { $ne: true }, id: userId }, UserProp.RAW);
                    if (!(await UserPassword.verifyPassword(user, oldPassword))) {
                        return new MessageError('Unauthorized request', 401);
                    }

                    const isValidPassword = UserPassword.validatePassword(newPassword);

                    if (!isValidPassword) {
                        return new MessageError(PasswordError[passwordComplexity], HttpStatus.UNPROCESSABLE_ENTITY);
                    }

                    const passwordDigest = await UserPassword.generatePasswordV2(newPassword);
                    const userAccessTokenService = await UserAccessTokenService.New();
                    const token = userAccessTokenService.generateRefreshToken(user);

                    user.password = passwordDigest.password;
                    user.salt = passwordDigest.salt;
                    user.passwordVersion = passwordDigest.passwordVersion;
                    if (!Array.isArray(user.refreshToken)) {
                        user.refreshToken = [];
                    }
                    user.refreshToken.push(token.id);

                    await new DatabaseServer().save(User, user);

                    return new MessageResponse({
                        username: user.username,
                        did: user.did,
                        role: user.role,
                        refreshToken: token.token
                    })
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        this.getMessages(AuthEvents.GENERATE_NEW_ACCESS_TOKEN,
            async (msg: { refreshToken: string }) => {
                const { refreshToken } = msg;

                const userAccessTokenService = await UserAccessTokenService.New();
                const decryptedToken = await userAccessTokenService.verifyRefreshToken(refreshToken);

                if (Date.now() > decryptedToken.expireAt) {
                    return new MessageResponse({})
                }

                const user = await new DatabaseServer().findOne(User, {
                    refreshToken: decryptedToken.id,
                    username: decryptedToken.name,
                    template: { $ne: true }
                });
                if (user) {
                    const accessToken = userAccessTokenService.generateAccessToken(user, true);
                    return new MessageResponse({ accessToken });
                } else {
                    return new MessageResponse({})
                }
            });

        this.getMessages<IUpdateUserMessage, any>(AuthEvents.UPDATE_USER,
            async (msg: { username: string, item: any, userId: string | null }) => {
                const { username, item, userId } = msg;
                try {
                    const usersRepository = new DatabaseServer();

                    const user = await usersRepository.findOne(User, { username })

                    if (!user) {
                        return new MessageResponse(null);
                    }

                    Object.assign(user, item);
                    const template = await usersRepository.findOne(User, { did: item.did, template: true });
                    if (template) {
                        user.permissions = template.permissions;
                        user.permissionsGroup = template.permissionsGroup;
                        await usersRepository.deleteEntity(User, template);
                    }
                    const result = await usersRepository.update(User, null, user);

                    return new MessageResponse(UserUtils.updateUserFields(result, UserProp.REQUIRED));
                } catch (error) {
                    await logger.error(error, ['AUTH_SERVICE'], userId);
                    return new MessageError(error);
                }
            });

        this.getMessages(AuthEvents.GET_USER_ACCOUNTS,
            async (msg: {
                filters?: any,
                parent?: string,
                pageIndex?: any,
                pageSize?: any,
                userId: string | null
            }) => {
                const userId = msg?.userId
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
                    const [items, count] = await new DatabaseServer().findAndCount(User, options, otherOptions);
                    return new MessageResponse({ items, count });
                } catch (error) {
                    await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                    return new MessageError(error);
                }
            });
    }
}
