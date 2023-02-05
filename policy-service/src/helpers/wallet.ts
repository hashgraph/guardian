import { Singleton } from '@helpers/decorators/singleton';
import { ServiceRequestsBase } from '@helpers/service-requests-base';
// import { WalletEvents, IGetKeyResponse } from '@guardian/interfaces';
import { Wallet as WalletManager} from '@guardian/common'
import { Users } from './users';

/**
 * Key type
 */
export enum KeyType {
    ID = 'ID',
    KEY = 'KEY',
    TOKEN_TREASURY_KEY = 'TOKEN_TREASURY_KEY',
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
        /**
         * This block sends WalletEvents.GET_KEY to Auth Service to get Wallet PrivateKey in response
         * 
            const wallet = await this.request<IGetKeyResponse>(WalletEvents.GET_KEY, { token, type, key });
            return wallet.key;
         */

        /**
         * This block gets Wallet PrivateKey from Vault directly
         */
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
        /**
         * This block create/update a wallet by sending wallet data to Auth Service
         * through WalletEvents.SET_KEY message
         * 
            await this.request<any>(WalletEvents.SET_KEY, { token, type, key, value });
         */

        /**
         * This block creates/updates a Wallet by writing to Vault directly
         */
        const wallet = new WalletManager();
        await wallet.setKey(token, type, key, value);
    }

    /**
     * Return key
     * @param did
     * @param key
     */
     public async getUserKey(did: string, type: KeyType, key: string): Promise<any> {
        /**
          * This block gets a wallet by sending wallet data to Auth Service
          * through WalletEvents.GET_USER_KEY message
          * 
            const wallet = await this.request<any>(WalletEvents.GET_USER_KEY, { did, type, key });
            return wallet.key;
         */

        /**
         * This block get user walletToken from Auth Service and then gets the wallet directly 
         */
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
        /**
         * This block create/update a wallet by sending wallet data to Auth Service
         * through WalletEvents.SET_USER_KEY message
         * 
            await this.request<any>(WalletEvents.SET_USER_KEY, { did, type, key, value });
         */

        /**
         * This block get user walletToken from Auth Service and then creates/updates the wallet directly 
         */
        const user = new Users();
        const { walletToken } = await user.getUserById(did);
        
        const wallet = new WalletManager();
        await wallet.setKey(walletToken, type, key, value);
    }
}
