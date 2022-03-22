import { AuthEvents, MessageError, MessageResponse, UserRole } from 'interfaces';
import { IAuthUser } from '@api/auth.interface';
import { sign, verify } from 'jsonwebtoken';
import { getMongoRepository } from 'typeorm';
import { User } from '@entity/user';
import * as util from 'util';
import crypto from 'crypto';
import { Logger } from 'logger-helper';

export class AccountService {
    constructor(
        private channel
    ) {
        this.registerListeners();
    }

    registerListeners(): void {
        this.channel.response(AuthEvents.GET_USER_BY_TOKEN, async (msg, res) => {
            const {token} = msg.payload;

            try {
                const decryptedToken = await util.promisify<string, any, Object, IAuthUser>(verify)(token, process.env.ACCESS_TOKEN_SECRET, {});
                const user = await getMongoRepository(User).findOne({username: decryptedToken.username});
                res.send(new MessageResponse(user));
            } catch (e) {
                res.send(new MessageError(e.message))
            }
        });

        this.channel.response(AuthEvents.REGISTER_NEW_USER, async (msg, res) => {
            try {
                const userRepository = getMongoRepository(User);

                const { username, password, role } = msg.payload;
                const passwordDigest = crypto.createHash('sha256').update(password).digest('hex');

                const checkUserName = await userRepository.count({username}) > 0;
                if (checkUserName) {
                    res.send(new MessageError('An account with the same name already exists.'));
                    return;
                }

                const user = userRepository.create({
                    username: username,
                    password: passwordDigest,
                    role: role,
                    did: null
                });
                res.send(new MessageResponse(await getMongoRepository(User).save(user)));

            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message))
            }
        });

        this.channel.response(AuthEvents.GENERATE_NEW_TOKEN, async (msg, res) => {
            try {
                const { username, password } = msg.payload;
                const passwordDigest = crypto.createHash('sha256').update(password).digest('hex');

                const user = await getMongoRepository(User).findOne({username});
                if (user && passwordDigest === user.password) {
                    const accessToken = sign({
                        username: user.username,
                        did: user.did,
                        role: user.role
                    }, process.env.ACCESS_TOKEN_SECRET);
                    res.send(new MessageResponse({
                        username: user.username,
                        did: user.did,
                        role: user.role,
                        accessToken: accessToken
                    }))
                } else {
                    res.send(new MessageError('Bad user'));
                }

            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message))
            }
        });

        this.channel.response(AuthEvents.GET_ALL_USER_ACCOUNTS, async (msg, res) => {
            try {
                const userAccounts = (await getMongoRepository(User).find({role: UserRole.USER})).map((e) => ({
                    username: e.username,
                    did: e.did
                }));
                res.send(new MessageResponse(userAccounts));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message));
            }
        });

        this.channel.response(AuthEvents.GET_ALL_ROOT_AUTHORITY_ACCOUNTS, async (msg, res) => {
            try {
                const userAccounts = (await getMongoRepository(User).find({role: UserRole.ROOT_AUTHORITY})).map((e) => ({
                    username: e.username,
                    did: e.did
                }));
                res.send(new MessageResponse(userAccounts));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message));
            }
        });


        this.channel.response(AuthEvents.GET_ALL_USER_ACCOUNTS_DEMO, async (msg, res) => {
            try {
                const userAccounts = (await getMongoRepository(User).find()).map((e) => ({
                    username: e.username,
                    role: e.role
                }));
                res.send(new MessageResponse(userAccounts));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message));
            }
        });

        this.channel.response(AuthEvents.GET_USER, async (msg, res) => {
            const {username} = msg.payload;

            try {
                res.send(new MessageResponse(await getMongoRepository(User).findOne({username})));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message));
            }
        });

        this.channel.response(AuthEvents.GET_USER_BY_ID, async (msg, res) => {
            const {did} = msg.payload;

            try {
                res.send(new MessageResponse(await getMongoRepository(User).findOne({did})));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message));
            }
        });

        this.channel.response(AuthEvents.GET_USERS_BY_ID, async (msg, res) => {
            const {dids} = msg.payload;

            try {
                res.send(new MessageResponse(await getMongoRepository(User).find({
                    where: {
                        did: { $in: dids }
                    }
                })));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message));
            }
        });

        this.channel.response(AuthEvents.GET_USERS_BY_ROLE, async (msg, res) => {
            const {role} = msg.payload;

            try {
                res.send(new MessageResponse(await getMongoRepository(User).find({role})));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message));
            }
        });

        this.channel.response(AuthEvents.UPDATE_USER, async (msg, res) => {
            const {username, item} = msg.payload;

            try {
                res.send(new MessageResponse(await getMongoRepository(User).update({username}, item)));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message));
            }
        });

        this.channel.response(AuthEvents.SAVE_USER, async (msg, res) => {
            const {user} = msg.payload;

            try {
                res.send(new MessageResponse(await getMongoRepository(User).save(user)));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message));
            }
        });
    }
}
