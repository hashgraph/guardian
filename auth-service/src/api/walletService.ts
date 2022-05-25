import { getMongoRepository } from 'typeorm';
import { WalletAccount } from '@entity/wallet-account';
import { Logger } from '@guardian/logger-helper';
import { MessageBrokerChannel, MessageResponse, MessageError } from '@guardian/common';
import { WalletEvents, IGetKeyMessage, ISetKeyMessage } from '@guardian/interfaces';

export class WalletService {
    constructor(
        private channel: MessageBrokerChannel,
    ) {
        this.registerListeners();
    }

    registerListeners(): void {
        this.channel.response<IGetKeyMessage, WalletAccount>(WalletEvents.GET_KEY, async (msg) => {
            const { token, type, key } = msg;

            try {
                return new MessageResponse(await getMongoRepository(WalletAccount).findOne({ token, type: type + '|' + key }));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return new MessageError(e.message)
            }
        });

        this.channel.response<ISetKeyMessage, WalletAccount>(WalletEvents.SET_KEY, async (msg) => {
            const { token, type, key, value } = msg;

            try {
                const walletAcc = getMongoRepository(WalletAccount).create({
                    token: token,
                    type: type + '|' + key,
                    key: value
                });
                return new MessageResponse(await getMongoRepository(WalletAccount).save(walletAcc));
            } catch (e) {
                new Logger().error(e.toString(), ['AUTH_SERVICE']);
                return new MessageError(e.message)
            }
        });
    }
}
