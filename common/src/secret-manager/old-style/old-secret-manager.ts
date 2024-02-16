import { SecretManagerBase } from '../secret-manager-base';
import { NatsService } from '../../mq';
import { GenerateUUIDv4, IGetKeyResponse, WalletEvents } from '@guardian/interfaces';
import { Singleton } from '../../decorators/singleton';
import { timeout } from '../../hedera-modules';

/**
 * Old secret manager implementation
 */
@Singleton
export class OldSecretManager extends NatsService implements SecretManagerBase {
    /**
     * Message queue name
     */
    public messageQueueName = 'settings-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'settings-reply-' + GenerateUUIDv4();
    /**
     * Get secrets
     * @param path
     * @param addition
     */
    @timeout(10000)
    async getSecrets(path: string, addition: any): Promise<any> {
        switch (path) {
            case 'keys/operator':
                const OPERATOR_ID = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, { type: 'OPERATOR_ID' });
                const OPERATOR_KEY = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, { type: 'OPERATOR_KEY' });

                return { OPERATOR_ID: OPERATOR_ID.key, OPERATOR_KEY: OPERATOR_KEY.key };

            case 'apikey/ipfs':
                const IPFS_STORAGE_API_KEY = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, { type: 'IPFS_STORAGE_API_KEY' });

                return { IPFS_STORAGE_API_KEY: IPFS_STORAGE_API_KEY.key };

            case 'secretkey/auth':
                const ACCESS_TOKEN_SECRET = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, { type: 'ACCESS_TOKEN_SECRET' });

                return { ACCESS_TOKEN_SECRET: ACCESS_TOKEN_SECRET.key };

            default:
                const wallet = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_KEY, addition);
                return {
                    privateKey: wallet.key
                }
        }
    }

    /**
     * Update secrets in Vault
     * @param path secret path
     * @param data secret data
     * @param addition
     * @returns void
     * @throws Error if any error occurs
     * @async
     * @public
     */
    @timeout(10000)
    async setSecrets(path: string, data: any, addition?: any): Promise<void> {
        switch (path) {
            case 'keys/operator':
                await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, { type: 'OPERATOR_ID', key: data.OPERATOR_ID });
                await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, { type: 'OPERATOR_KEY', key: data.OPERATOR_KEY });

                return;

            case 'apikey/ipfs':
                await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, { type: 'IPFS_STORAGE_API_KEY',  key: data.IPFS_STORAGE_API_KEY });

                return;

            case 'secretkey/auth':
                await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, { type: 'ACCESS_TOKEN_SECRET',  key: data.ACCESS_TOKEN_SECRET });

                return;

            default:
                await this.sendMessage<any>(WalletEvents.SET_KEY, addition);
                return;
        }
    }
}
