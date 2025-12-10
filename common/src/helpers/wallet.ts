import { Singleton } from '../decorators/singleton.js';
import {
    GenerateUUIDv4,
    ISignOptions,
    MessageAPI,
    SignType,
} from '@guardian/interfaces';
import { Wallet as WalletManager } from '../wallet/index.js'
import { NatsService } from '../mq/index.js';
import { Users } from './users.js';
import { IAuthUser } from '../interfaces';

/**
 * Key Entity
 */
export enum KeyEntity {
    TOKEN = 'TOKEN',
    TOPIC = 'TOPIC',
    DID = 'DID',
    KEY = 'KEY',
    MESSAGE = 'MESSAGE',
    DISCUSSION = 'DISCUSSION',
    RELAYER_ACCOUNT = 'RELAYER_ACCOUNT',
}

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
    MESSAGE_KEY = 'MESSAGE_KEY',
    DISCUSSION = 'DISCUSSION',
    RELAYER_ACCOUNT = 'RELAYER_ACCOUNT'
}

/**
 * Key type - key entity mapping
 */
export const KEY_TYPE_KEY_ENTITY: Map<KeyType, KeyEntity> = new Map([
    [KeyType.MESSAGE_KEY, KeyEntity.MESSAGE],
    [KeyType.TOKEN_TREASURY_KEY, KeyEntity.TOKEN],
    [KeyType.TOKEN_ADMIN_KEY, KeyEntity.TOKEN],
    [KeyType.TOKEN_SUPPLY_KEY, KeyEntity.TOKEN],
    [KeyType.TOKEN_FREEZE_KEY, KeyEntity.TOKEN],
    [KeyType.TOKEN_KYC_KEY, KeyEntity.TOKEN],
    [KeyType.TOKEN_WIPE_KEY, KeyEntity.TOKEN],
    [KeyType.TOPIC_SUBMIT_KEY, KeyEntity.TOPIC],
    [KeyType.DID_KEYS, KeyEntity.DID],
    [KeyType.KEY, KeyEntity.KEY],
    [KeyType.DISCUSSION, KeyEntity.DISCUSSION],
    [KeyType.RELAYER_ACCOUNT, KeyEntity.RELAYER_ACCOUNT],
]);

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
     * @param keyType
     * @param entityId
     * @param userId
     */
    public async getUserKey(
        did: string,
        keyType: KeyType,
        entityId: string,
        userId: string | null
    ): Promise<any> {
        const hasPermissions = await this.sendMessage(
            MessageAPI.CHECK_KEY_PERMISSIONS,
            {
                did,
                keyType,
                entityId,
            }
        );

        if (!hasPermissions) {
            return null;
        }

        const user = new Users();
        const fullUser = await user.getUserById(did, userId);
        if (!fullUser) {
            return null;
        }

        const wallet = new WalletManager();
        return await wallet.getKey(fullUser.walletToken, keyType, entityId)
    }

    /**
     * Set key
     * @param did
     * @param keyType
     * @param entityId
     * @param keyValue
     * @param userId
     */
    public async setUserKey(
        did: string,
        keyType: KeyType,
        entityId: string,
        keyValue: any,
        userId: string | null
    ) {
        const user = new Users();
        const { walletToken } = await user.getUserById(did, userId);

        const wallet = new WalletManager();
        await wallet.setKey(walletToken, keyType, entityId, keyValue);
    }

    /**
     * Set key
     * @param did
     * @param keyType
     * @param entityId
     * @param keyValue
     * @param userId
     */
    public async updateUserKey(
        did: string,
        keyType: KeyType,
        entityId: string,
        keyValue: any,
        userId: string | null
    ) {
        const user = new Users();
        const { walletToken } = await user.getUserById(did, userId);

        const wallet = new WalletManager();
        const key = await wallet.getKey(walletToken, keyType, entityId);
        if (key !== keyValue) {
            await wallet.setKey(walletToken, keyType, entityId, keyValue);
        }
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
