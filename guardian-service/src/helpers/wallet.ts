import { Singleton } from '@helpers/decorators/singleton';
import { ServiceRequestsBase } from '@helpers/service-requests-base';
import { WalletEvents, IGetKeyResponse } from '@guardian/interfaces';

/**
 * Key type
 */
export enum KeyType {
    ID = 'ID',
    KEY = 'KEY',
    TOKEN_ADMIN_KEY = 'TOKEN_ADMIN_KEY',
    TOKEN_SUPPLY_KEY = 'TOKEN_SUPPLY_KEY',
    TOKEN_FREEZE_KEY = 'TOKEN_FREEZE_KEY',
    TOKEN_KYC_KEY = 'TOKEN_KYC_KEY',
    TOKEN_WIPE_KEY = 'TOKEN_WIPE_KEY',
    TOPIC_SUBMIT_KEY = 'TOPIC_SUBMIT_KEY',
    TOPIC_ADMIN_KEY = 'TOPIC_ADMIN_KEY'
}

/**
 * Wallet service
 */
@Singleton
export class Wallet extends ServiceRequestsBase {
    /**
     * Message broker target
     */
    public target: string = 'auth-service'

    /**
     * Return key
     * @param token
     * @param type
     * @param key
     */
    public async getKey(token: string, type: KeyType, key: string): Promise<string> {
        const wallet = await this.request<IGetKeyResponse>(WalletEvents.GET_KEY, { token, type, key });
        return wallet.key;
    }

    /**
     * Set key
     * @param token
     * @param type
     * @param key
     * @param value
     */
    public async setKey(token: string, type: string, key: string, value: string) {
        await this.request<any>(WalletEvents.SET_KEY, { token, type, key, value });
    }

    /**
     * Return key
     * @param did
     * @param key
     */
     public async getUserKey(did: string, type: KeyType, key: string): Promise<any> {
        const wallet = await this.request<any>(WalletEvents.GET_USER_KEY, { did, type, key });
        return wallet.key;
    }

    /**
     * Set key
     * @param token
     * @param type
     * @param key
     * @param value
     */
    public async setUserKey(did: string, type: KeyType, key: string, value: any) {
        await this.request<any>(WalletEvents.SET_USER_KEY, { did, type, key, value });
    }
}
