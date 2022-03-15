import { AuthEvents, MessageError, MessageResponse, WalletEvents } from 'interfaces';
import util from 'util';
import { IAuthUser } from '@api/auth.interface';
import { verify } from 'jsonwebtoken';
import { getMongoRepository } from 'typeorm';
import { User } from '@entity/user';
import { WalletAccount } from '@entity/wallet-account';
import { Logger } from 'logger-helper';

export class WalletService {
    constructor(
        private channel
    ) {
        this.registerListeners();
    }

    registerListeners(): void {
        this.channel.response(WalletEvents.GET_KEY, async (msg, res) => {
            const {token, type, key} = msg.payload;

            try {
                res.send(new MessageResponse(await getMongoRepository(WalletAccount).findOne({token, type: type + '|' + key})));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message))
            }
        });

        this.channel.response(WalletEvents.SET_KEY, async (msg, res) => {
            const {token, type, key, value} = msg.payload;

            try {
                const walletAcc = getMongoRepository(WalletAccount).create({
                    token: token,
                    type: type + '|' + key,
                    key: value
                });
                res.send(new MessageResponse(await getMongoRepository(WalletAccount).save(walletAcc)));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                res.send(new MessageError(e.message))
            }
        });
    }
}
