import { IVault } from '../vault.interface.js';
import { DatabaseServer } from '@guardian/common';
import { WalletAccount } from '../../entity/wallet-account.js';

/**
 * Database vault
 */
export class Database implements IVault {

    /**
     * Init vault
     */
    async init() {
        return this;
    }
    /**
     * Get key from vault
     * @param token
     * @param type
     * @param key
     */
    async getKey(token: string, type: string, key: string): Promise<string> {
        const item = await new DatabaseServer().findOne(WalletAccount, { token, type: type + '|' + key });
        return item?.key
    }

    /**
     * Set key to vault
     * @param token
     * @param type
     * @param key
     * @param value
     */
    async setKey(token: string, type: string, key: string, value: string): Promise<void> {
        const walletAcc = new DatabaseServer().create(WalletAccount, {
            token,
            type: type + '|' + key,
            key: value
        });
        await new DatabaseServer().save(WalletAccount, walletAcc);
    }

    /**
     * Get global application key
     * @param type
     */
    async getGlobalApplicationKey(type: string): Promise<string> {
        const item = await new DatabaseServer().findOne(WalletAccount,{ type });
        return item?.key;
    }

    /**
     * Set global application key
     * @param type
     * @param key
     */
    async setGlobalApplicationKey(type: string, key: string): Promise<void> {
        let setting: WalletAccount = await new DatabaseServer().findOne(WalletAccount,{ type });
        if (!setting) {
            setting = new DatabaseServer().create(WalletAccount, { type, key });
        }
        setting.key = key;
        await new DatabaseServer().save(WalletAccount, setting);
    }
}
