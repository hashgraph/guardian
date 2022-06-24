import { IAuthUser } from '@api/auth.interface';
import { sign, verify } from 'jsonwebtoken';
import { getMongoRepository } from 'typeorm';
import { User } from '@entity/user';
import * as util from 'util';
import crypto from 'crypto';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger } from '@guardian/common';
import {
    AuthEvents, UserRole,
    IGetUserByTokenMessage,
    IRegisterNewUserMessage,
    IGenerateTokenMessage,
    IGenerateTokenResponse,
    IGetAllUserResponse,
    IGetDemoUserResponse,
    IGetUserMessage,
    IUpdateUserMessage,
    ISaveUserMessage,
    IGetUserByIdMessage,
    IGetUsersByIdMessage,
    IGetUsersByIRoleMessage,
    IUser,
    IStandardRegistryUserResponse,
    IGetUsersByAccountMessage
} from '@guardian/interfaces';

export class AccountService {
    constructor(
        private channel: MessageBrokerChannel
    ) {
        this.registerListeners();
    }

    registerListeners(): void {
        this.channel.response<IGetUserByTokenMessage, User>(AuthEvents.GET_USER_BY_TOKEN, async (msg) => {
            const { token } = msg;

            try {
                const decryptedToken = await util.promisify<string, any, Object, IAuthUser>(verify)(token, process.env.ACCESS_TOKEN_SECRET, {});
                const user = await getMongoRepository(User).findOne({ username: decryptedToken.username });
                return new MessageResponse(user);
            } catch (error) {
                return new MessageError(error);
            }
        });

        this.channel.response<IRegisterNewUserMessage, User>(AuthEvents.REGISTER_NEW_USER, async (msg) => {
            try {
                const userRepository = getMongoRepository(User);

                const { username, password, role } = msg;
                const passwordDigest = crypto.createHash('sha256').update(password).digest('hex');

                const checkUserName = await userRepository.count({ username }) > 0;
                if (checkUserName) {
                    return new MessageError('An account with the same name already exists.');
                }

                const user = userRepository.create({
                    username: username,
                    password: passwordDigest,
                    role: role,
                    parent: null,
                    did: null
                });
                return new MessageResponse(await getMongoRepository(User).save(user));

            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error)
            }
        });

        this.channel.response<IGenerateTokenMessage, IGenerateTokenResponse>(AuthEvents.GENERATE_NEW_TOKEN, async (msg) => {
            try {
                const { username, password } = msg;
                const passwordDigest = crypto.createHash('sha256').update(password).digest('hex');

                const user = await getMongoRepository(User).findOne({ username });
                if (user && passwordDigest === user.password) {
                    const accessToken = sign({
                        username: user.username,
                        did: user.did,
                        role: user.role
                    }, process.env.ACCESS_TOKEN_SECRET);
                    return new MessageResponse({
                        username: user.username,
                        did: user.did,
                        role: user.role,
                        accessToken: accessToken
                    })
                } else {
                    return new MessageError('Unauthorized request', 401);
                }

            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<any, IGetAllUserResponse[]>(AuthEvents.GET_ALL_USER_ACCOUNTS, async (_) => {
            try {
                const userAccounts = (await getMongoRepository(User).find({ role: UserRole.USER })).map((e) => ({
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

        this.channel.response<any, IStandardRegistryUserResponse[]>(AuthEvents.GET_ALL_STANDARD_REGISTRY_ACCOUNTS, async (_) => {
            try {
                const userAccounts = (await getMongoRepository(User).find({ role: UserRole.STANDARD_REGISTRY })).map((e) => ({
                    username: e.username,
                    did: e.did
                }));
                return new MessageResponse(userAccounts);
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });


        this.channel.response<any, IGetDemoUserResponse[]>(AuthEvents.GET_ALL_USER_ACCOUNTS_DEMO, async (_) => {
            try {
                const userAccounts = (await getMongoRepository(User).find()).map((e) => ({
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

        this.channel.response<IGetUserMessage, User>(AuthEvents.GET_USER, async (msg) => {
            const { username } = msg;

            try {
                return new MessageResponse(await getMongoRepository(User).findOne({ username }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<IGetUserByIdMessage, IUser>(AuthEvents.GET_USER_BY_ID, async (msg) => {
            const { did } = msg;

            try {
                return new MessageResponse(await getMongoRepository(User).findOne({ did }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<IGetUsersByAccountMessage, IUser>(AuthEvents.GET_USER_BY_ACCOUNT, async (msg) => {
            const { account } = msg;

            try {
                return new MessageResponse(await getMongoRepository(User).findOne({ hederaAccountId: account }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<IGetUsersByIdMessage, IUser[]>(AuthEvents.GET_USERS_BY_ID, async (msg) => {
            const { dids } = msg;

            try {
                return new MessageResponse(await getMongoRepository(User).find({
                    where: {
                        did: { $in: dids }
                    }
                }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<IGetUsersByIRoleMessage, IUser[]>(AuthEvents.GET_USERS_BY_ROLE, async (msg) => {
            const { role } = msg;

            try {
                return new MessageResponse(await getMongoRepository(User).find({ role }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<IUpdateUserMessage, any>(AuthEvents.UPDATE_USER, async (msg) => {
            const { username, item } = msg;

            try {
                return new MessageResponse(await getMongoRepository(User).update({ username }, item));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<ISaveUserMessage, IUser>(AuthEvents.SAVE_USER, async (msg) => {
            const { user } = msg;

            try {
                return new MessageResponse(await getMongoRepository(User).save(user));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });
    }
}
