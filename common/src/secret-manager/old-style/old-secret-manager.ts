import { SecretManagerBase } from '../secret-manager-base';
import { NatsService } from '../../mq';
import { GenerateUUIDv4, IGetKeyResponse, WalletEvents } from '@guardian/interfaces';
import { Singleton } from '../../decorators/singleton';

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
    async getSecrets(path: string, addition: any): Promise<any> {
        console.log('get-secret', path, addition);
        switch (path) {
            case 'keys/operator':
                const OPERATOR_ID = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, { type: 'OPERATOR_ID' });
                const OPERATOR_KEY = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, { type: 'OPERATOR_KEY' });

                return { OPERATOR_ID: OPERATOR_ID.key, OPERATOR_KEY: OPERATOR_KEY.key };

            case 'apikey/ipfs':
                const IPFS_STORAGE_API_KEY = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, { type: 'IPFS_STORAGE_API_KEY' });

                return { IPFS_STORAGE_API_KEY: IPFS_STORAGE_API_KEY.key };

            default:
                const wallet = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_KEY, addition);
                console.log(wallet, addition);
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
    async setSecrets(path: string, data: any, addition?: any): Promise<void> {
        switch (path) {
            case 'keys/operator':
                await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, { type: 'OPERATOR_ID', key: data.OPERATOR_ID });
                await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, { type: 'OPERATOR_KEY', key: data.OPERATOR_KEY });

                return;

            case 'apikey/ipfs':
                await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, { type: 'IPFS_STORAGE_API_KEY',  key: data.IPFS_STORAGE_API_KEY });

                return;

            default:
                console.log(data);
                await this.sendMessage<any>(WalletEvents.SET_KEY, addition);
                return;
        }
    }
}
