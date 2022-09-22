import {
    MessageBrokerChannel,
    MessageResponse,
    MessageError,
    Logger,
} from '@guardian/common';
import {
    WalletEvents,
    IGetKeyMessage,
    ISetKeyMessage,
    IGetKeyResponse,
    IGetGlobalApplicationKey, ISetGlobalApplicationKey
} from '@guardian/interfaces';
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

        this.channel.response<IGetGlobalApplicationKey, IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, async (msg) => {
            const {type} = msg;

            try {
                const key = await this.vault.getGlobalApplicationKey(type);
                return new MessageResponse({key});
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.channel.response<ISetGlobalApplicationKey, null>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, async (msg) => {
            const {type, key} = msg;

            try {
                await this.vault.setGlobalApplicationKey(type, key);
                return new MessageResponse(null);
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });
    }
}
