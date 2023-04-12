import { User } from '@entity/user';
import {
    MessageResponse,
    MessageError,
    Logger,
    DataBaseHelper, NatsService, Singleton,
} from '@guardian/common';
import {
    WalletEvents,
    IGetKeyMessage,
    ISetKeyMessage,
    IGetKeyResponse,
    IGetGlobalApplicationKey, ISetGlobalApplicationKey, GenerateUUIDv4
} from '@guardian/interfaces';
import { IVault } from '../vaults';

/**
 * Wallet service
 */
@Singleton
export class WalletService extends NatsService {

    /**
     * Message queue name
     */
    public messageQueueName = 'wallet-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'wallet-queue-reply-' + GenerateUUIDv4();

    /**
     * Vault
     * @private
     */
    private vault: IVault

    /**
     * Register vault
     * @param vault
     */
    registerVault(vault: IVault): WalletService {
        this.vault = vault;
        return this;
    }

    /**
     * Register listeners
     */
    registerListeners(): void {
        this.getMessages<IGetKeyMessage, IGetKeyResponse>(WalletEvents.GET_KEY, async (msg) => {
            const { token, type, key } = msg;

            try {
                const value = await this.vault.getKey(token, type, key);
                return new MessageResponse({ key: value });
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error)
            }
        });

        this.getMessages<ISetKeyMessage, null>(WalletEvents.SET_KEY, async (msg) => {
            console.log(msg);
            const { token, type, key, value } = msg;

            try {
                await this.vault.setKey(token, type, key, value);
                return new MessageResponse(null);
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<any, IGetKeyResponse>(WalletEvents.GET_USER_KEY, async (msg) => {
            const { did, type, key } = msg;

            try {
                if (!did) {
                    return new MessageResponse({ key: null });
                }
                const user = await new DataBaseHelper(User).findOne({ did });
                const value = await this.vault.getKey(user.walletToken, type, key);
                return new MessageResponse({ key: value });
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error)
            }
        });

        this.getMessages<any, null>(WalletEvents.SET_USER_KEY, async (msg) => {
            const { did, type, key, value } = msg;

            try {
                if (!did) {
                    return new MessageResponse(null);
                }
                const user = await new DataBaseHelper(User).findOne({ did });
                await this.vault.setKey(user.walletToken, type, key, value);
                return new MessageResponse(null);
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<IGetGlobalApplicationKey, IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, async (msg) => {
            const {type} = msg;

            try {
                const key = await this.vault.getGlobalApplicationKey(type);
                return new MessageResponse({key});
            } catch (error) {
                new Logger().error(error, ['AUTH_SERVICE']);
                return new MessageError(error);
            }
        });

        this.getMessages<ISetGlobalApplicationKey, null>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, async (msg) => {
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
