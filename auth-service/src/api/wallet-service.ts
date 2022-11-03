import { User } from '@entity/user';
import {
    MessageBrokerChannel,
    MessageResponse,
    MessageError,
    Logger,
    DataBaseHelper,
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

        this.channel.response<any, IGetKeyResponse>(WalletEvents.GET_USER_KEY, async (msg) => {
            const { did, type, key } = msg;

            try {
                const user = await new DataBaseHelper(User).findOne({ did });
                const value = await this.vault.getKey(user.walletToken, type, key);
                return new MessageResponse({ key: value });
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error)
            }
        });

        this.channel.response<any, null>(WalletEvents.SET_USER_KEY, async (msg) => {
            const { did, type, key, value } = msg;

            try {
                const user = await new DataBaseHelper(User).findOne({ did });
                await this.vault.setKey(user.walletToken, type, key, value);
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
