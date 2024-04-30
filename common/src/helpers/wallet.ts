import { Singleton } from '../decorators/singleton.js';
import { GenerateUUIDv4, ISignOptions, SignType } from '@guardian/interfaces';
import { Wallet as WalletManager } from '../wallet/index.js'
import { NatsService } from '../mq/index.js';
import { Users } from './users.js';
import { IAuthUser } from '../interfaces';

/**
 * Key type
 */
export enum KeyType {
    ID = 'ID',
    KEY = 'KEY',
    DID_KEYS = 'DID_KEYS',
    TOKEN_TREASURY_KEY = 'TOKEN_TREASURY_KEY',
    TOKEN_ADMIN_KEY = 'TOKEN_ADMIN_KEY',
    TOKEN_SUPPLY_KEY = 'TOKEN_SUPPLY_KEY',
    TOKEN_FREEZE_KEY = 'TOKEN_FREEZE_KEY',
    TOKEN_KYC_KEY = 'TOKEN_KYC_KEY',
    TOKEN_WIPE_KEY = 'TOKEN_WIPE_KEY',
    TOPIC_SUBMIT_KEY = 'TOPIC_SUBMIT_KEY',
    TOPIC_ADMIN_KEY = 'TOPIC_ADMIN_KEY',
    FIREBLOCKS_KEY = 'FIREBLOCKS_KEY',
}

/**
 * Wallet service
 */
@Singleton
export class Wallet extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'wallet-service-' + GenerateUUIDv4();

    /**
     * Reply subject
     * @private
     */
    public replySubject = this.messageQueueName + `-reply-${GenerateUUIDv4()}`;

    /**
     * Return key
     * @param token
     * @param type
     * @param key
     */
    /**
     * Return key
     * @param token
     * @param type
     * @param key
     */
    public async getKey(token: string, type: KeyType, key: string): Promise<string> {
        const wallet = new WalletManager();
        return await wallet.getKey(token, type, key);
    }

    /**
     * Set key
     * @param token
     * @param type
     * @param key
     * @param value
     */
    public async setKey(token: string, type: string, key: string, value: string) {
        const wallet = new WalletManager();
        await wallet.setKey(token, type, key, value);
    }

    /**
     * Return key
     * @param did
     * @param type
     * @param key
     */
    public async getUserKey(did: string, type: KeyType, key: string): Promise<any> {
        const user = new Users();
        const { walletToken } = await user.getUserById(did);

        const wallet = new WalletManager();
        return await wallet.getKey(walletToken, type, key);
    }

    /**
     * Set key
     * @param token
     * @param type
     * @param key
     * @param value
     */
    public async setUserKey(did: string, type: KeyType, key: string, value: any) {
        const user = new Users();
        const { walletToken } = await user.getUserById(did);

        const wallet = new WalletManager();
        await wallet.setKey(walletToken, type, key, value);
    }

    /**
     * Get user sign options
     * @param user
     */
    public async getUserSignOptions(user: IAuthUser): Promise<ISignOptions> {
        if (user.useFireblocksSigning) {
            const signData = JSON.parse(await this.getKey(user.walletToken, KeyType.FIREBLOCKS_KEY, user.did)) as any;
            if (signData) {
                return {
                    signType: SignType.FIREBLOCKS,
                    data: {
                        apiKey: signData.fireBlocksApiKey,
                        privateKey: signData.fireBlocksPrivateiKey,
                        assetId: signData.fireBlocksAssetId,
                        vaultId: signData.fireBlocksVaultId
                    },
                }
            }
        }
        return {
            signType: SignType.INTERNAL
        }
    }
}
