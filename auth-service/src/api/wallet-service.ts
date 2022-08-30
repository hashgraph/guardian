import { WalletAccount } from '@entity/wallet-account';
import {
    MessageBrokerChannel,
    MessageResponse,
    MessageError,
    Logger,
    DataBaseHelper
} from '@guardian/common';
import { WalletEvents, IGetKeyMessage, ISetKeyMessage } from '@guardian/interfaces';

/**
 * Wallet service
 */
export class WalletService {
    constructor(
        private readonly channel: MessageBrokerChannel,
    ) {
        // this.registerListeners();
    }

    /**
     * Register listeners
     */
    registerListeners(): void {
        this.channel.response<IGetKeyMessage, WalletAccount>(WalletEvents.GET_KEY, async (msg) => {
            const { token, type, key } = msg;

            try {
                return new MessageResponse(await new DataBaseHelper(WalletAccount).findOne({ token, type: type + '|' + key }));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error)
            }
        });

        this.channel.response<ISetKeyMessage, WalletAccount>(WalletEvents.SET_KEY, async (msg) => {
            const { token, type, key, value } = msg;

            try {
                const walletAcc = new DataBaseHelper(WalletAccount).create({
                    token,
                    type: type + '|' + key,
                    key: value
                });
                return new MessageResponse(await new DataBaseHelper(WalletAccount).save(walletAcc));
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error)
            }
        });
    }
}
