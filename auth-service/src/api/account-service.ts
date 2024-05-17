import { IAuthUser } from './auth.interface.js';
import pkg from 'jsonwebtoken';

import { User } from '../entity/user.js';
import * as util from 'util';
import crypto from 'crypto';
import { DataBaseHelper, Logger, MessageError, MessageResponse, NatsService, ProviderAuthUser, SecretManager, Singleton } from '@guardian/common';
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
    ISaveUserMessage,
    IStandardRegistryUserResponse,
    IUpdateUserMessage,
    IUser,
    UserRole
} from '@guardian/interfaces';
import { USER_REQUIRED_PROPS } from '../constants/index.js';

const { sign, verify } = pkg;

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
        this.getMessages<IGetUserByTokenMessage, User>(AuthEvents.GET_USER_BY_TOKEN, async (msg) => {
            const { token } = msg;
            const secretManager = SecretManager.New();

            const {ACCESS_TOKEN_SECRET} = await secretManager.getSecrets('secretkey/auth')

            try {
                const decryptedToken = await util.promisify<string, any, Object, IAuthUser>(verify)(token, ACCESS_TOKEN_SECRET, {});
                if (Date.now() > decryptedToken.expireAt) {
                    throw new Error('Token expired');
                }

                const user = await new DataBaseHelper(User).findOne({ username: decryptedToken.username });

                const userRequiredProps = {}

                for(const prop of Object.values(USER_REQUIRED_PROPS)) {
                    userRequiredProps[prop] = user[prop];
                }

                return new MessageResponse(userRequiredProps);
            } catch (error) {
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

                const user = userRepository.create({
                    username,
                    password: passwordDigest,
                    role,
                    // walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
                    walletToken: '',
                    parent: null,
                    did: null
                });
                return new MessageResponse(await userRepository.save(user));

            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error)
            }
        });

        this.getMessages<IRegisterNewUserMessage, User>(AuthEvents.GENERATE_NEW_TOKEN_BASED_ON_USER_PROVIDER,
          async (msg: ProviderAuthUser) => {
            try {
                const userRepository = new DataBaseHelper(User);
                let user = await userRepository.findOne({
                    username: msg.username
                });

                if (!user) {
                    user = userRepository.create({
                        username: msg.username,
                        password: null,
                        role: msg.role,
                        // walletToken: crypto.createHash('sha1').update(Math.random().toString()).digest('hex'),
                        walletToken: '',
                        parent: null,
                        did: null,
                        provider: msg.provider,
                        providerId: msg.providerId
                    });
                    await userRepository.save(user);
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

                const {ACCESS_TOKEN_SECRET} = await secretManager.getSecrets('secretkey/auth');

                const REFRESH_TOKEN_UPDATE_INTERVAL = process.env.REFRESH_TOKEN_UPDATE_INTERVAL || '31536000000' // 1 year

                const user = await new DataBaseHelper(User).findOne({ username });
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
            const {refreshToken} = msg;
            const secretManager = SecretManager.New();

            const {ACCESS_TOKEN_SECRET} = await secretManager.getSecrets('secretkey/auth')

            const decryptedToken = await util.promisify<string, any, Object, any>(verify)(refreshToken, ACCESS_TOKEN_SECRET, {});
            if (Date.now() > decryptedToken.expireAt) {
                return new MessageResponse({})
            }

            const user = await new DataBaseHelper(User).findOne({refreshToken: decryptedToken.id, username: decryptedToken.name});
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

            return new MessageResponse({accessToken});
        });

        this.getMessages<any, IGetAllUserResponse[]>(AuthEvents.GET_ALL_USER_ACCOUNTS, async (_) => {
            try {
                const userAccounts = (await new DataBaseHelper(User).find({ role: UserRole.USER })).map((e) => ({
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

        this.getMessages<any, IGetAllUserResponse[]>(AuthEvents.GET_USERS_BY_SR_ID, async (msg) => {
            try {
                const { did } = msg;
                return new MessageResponse(await new DataBaseHelper(User).find({ parent: did }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<any, IStandardRegistryUserResponse[]>(AuthEvents.GET_ALL_STANDARD_REGISTRY_ACCOUNTS, async (_) => {
            try {
                const userAccounts = (await new DataBaseHelper(User).find({ role: UserRole.STANDARD_REGISTRY })).map((e) => ({
                    username: e.username,
                    did: e.did
                }));
                return new MessageResponse(userAccounts);
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<any, IGetDemoUserResponse[]>(AuthEvents.GET_ALL_USER_ACCOUNTS_DEMO, async (_) => {
            try {
                const userAccounts = (await new DataBaseHelper(User).findAll()).map((e) => ({
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

        this.getMessages<IGetUserMessage, User>(AuthEvents.GET_USER, async (msg) => {
            const { username } = msg;
            try {
                return new MessageResponse(await new DataBaseHelper(User).findOne({ username }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<IGetUserMessage, User>(AuthEvents.GET_USER_BY_PROVIDER_USER_DATA, async (msg) => {
            const { providerId, provider } = msg;

            try {
                return new MessageResponse(await new DataBaseHelper(User).findOne({ providerId, provider }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<IGetUserByIdMessage, IUser>(AuthEvents.GET_USER_BY_ID, async (msg) => {
            const { did } = msg;

            try {
                return new MessageResponse(await new DataBaseHelper(User).findOne({ did }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<IGetUsersByAccountMessage, IUser>(AuthEvents.GET_USER_BY_ACCOUNT, async (msg) => {
            const { account } = msg;

            try {
                return new MessageResponse(await new DataBaseHelper(User).findOne({ hederaAccountId: account }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<IGetUsersByIdMessage, IUser[]>(AuthEvents.GET_USERS_BY_ID, async (msg) => {
            const { dids } = msg;

            try {
                return new MessageResponse(await new DataBaseHelper(User).find({
                    where: {
                        did: { $in: dids }
                    }
                }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<IGetUsersByIRoleMessage, IUser[]>(AuthEvents.GET_USERS_BY_ROLE, async (msg) => {
            const { role } = msg;

            try {
                return new MessageResponse(await new DataBaseHelper(User).find({ role }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<IUpdateUserMessage, any>(AuthEvents.UPDATE_USER, async (msg) => {
            const { username, item } = msg;

            try {
                return new MessageResponse(await new DataBaseHelper(User).update(item, { username }));
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
    }
}
