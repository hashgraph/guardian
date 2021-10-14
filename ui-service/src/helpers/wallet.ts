import {WalletAccount} from '@entity/wallet-account';
import {Singleton} from '@helpers/decorators/singleton';
import {getMongoRepository} from 'typeorm';

export enum KeyType {
    ID = 'ID',
    KEY = 'KEY'
}

/**
 * Wallet service
 */
@Singleton
export class Wallet {
    /**
     * Return key
     * @param token
     * @param type
     * @param key
     */
    public async getKey(token: string, type: KeyType, key: string): Promise<string> {
        const walletInstaller = await getMongoRepository(WalletAccount).findOne({
            where: {
                token: {$eq: token},
                type: {$eq: type + '|' + key}
            }
        });
        return walletInstaller.key;
    }

    /**
     * Set key
     * @param token
     * @param type
     * @param key
     * @param value
     */
    public async setKey(token: string, type: string, key: string, value: string) {
        const walletAcc = getMongoRepository(WalletAccount).create({
            token: token,
            type: type + '|' + key,
            key: value
        });
        await getMongoRepository(WalletAccount).save(walletAcc);
    }
}