import { Singleton } from '@helpers/decorators/singleton';
import { ServiceRequestsBase } from '@helpers/service-requests-base';
import { WalletEvents, IWalletAccount, GenerateUUIDv4 } from '@guardian/interfaces';
import { NatsService } from '@guardian/common';

/**
 * Key types
 */
export enum KeyType {
    ID = 'ID',
    KEY = 'KEY'
}

/**
 * Wallet service
 */
@Singleton
export class Wallet extends NatsService {
    /**
     * Queue name
     */
    public messageQueueName = 'api-wallet-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'api-wallet-queue-reply-' + GenerateUUIDv4();

    /**
     * Return key
     * @param token
     * @param type
     * @param key
     */
    public async getKey(token: string, type: KeyType, key: string): Promise<string> {
        const wallet = await this.sendMessage<IWalletAccount>(WalletEvents.GET_KEY, { token, type, key });
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
        await this.sendMessage<IWalletAccount>(WalletEvents.SET_KEY, { token, type, key, value });
    }
}
