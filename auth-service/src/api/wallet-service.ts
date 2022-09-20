import {
    MessageBrokerChannel,
    MessageResponse,
    MessageError,
    Logger,
} from '@guardian/common';
import { WalletEvents, IGetKeyMessage, ISetKeyMessage, IWalletAccount, IGetKeyResponse } from '@guardian/interfaces';
import { IVault } from '../vaults';

/**
 * Wallet service
 */
export class WalletService {
    constructor(
        private readonly channel: MessageBrokerChannel,
        private readonly vault: IVault
    ) { }

    /**
     * Register listeners
     */
    registerListeners(): void {
        this.channel.response<IGetKeyMessage, IGetKeyResponse>(WalletEvents.GET_KEY, async (msg) => {
            const { token, type, key } = msg;

            try {
                const value = await this.vault.getKey(token, type, key);
                return new MessageResponse({ key: value });
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error)
            }
        });

        this.channel.response<ISetKeyMessage, null>(WalletEvents.SET_KEY, async (msg) => {
            const { token, type, key, value } = msg;

            try {
                await this.vault.setKey(token, type, key, value);
                return new MessageResponse(null);
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });
    }
}
