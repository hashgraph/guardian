import { SecretManagerBase } from '../secret-manager-base.js';
import { NatsService } from '../../mq/index.js';
import { GenerateUUIDv4, IGetKeyResponse, WalletEvents } from '@guardian/interfaces';
import { Singleton } from '../../decorators/singleton.js';
import { timeout } from '../../hedera-modules/index.js';

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

    // Bounded-retry configuration for secret operations (see withRetry).
    private static readonly RETRY_ATTEMPTS = 3;
    private static readonly RETRY_DELAY_MS = 3000;

    /**
     * Run a secret operation with bounded retries. Each attempt is still guarded
     * by the per-call {@link timeout} decorator; retrying tolerates a dependency
     * (auth-service / MQ) that is briefly slow or not yet ready, so a transient
     * delay does not surface as an unhandled rejection that can crash a service
     * during startup.
     * @param operation operation to run
     * @private
     */
    private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: unknown;
        for (let attempt = 1; attempt <= OldSecretManager.RETRY_ATTEMPTS; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (attempt < OldSecretManager.RETRY_ATTEMPTS) {
                    console.warn(`[OldSecretManager] secret operation attempt ${attempt}/${OldSecretManager.RETRY_ATTEMPTS} failed, retrying in ${OldSecretManager.RETRY_DELAY_MS}ms:`, error?.message || error);
                    await new Promise((resolve) => setTimeout(resolve, OldSecretManager.RETRY_DELAY_MS));
                }
            }
        }
        throw lastError;
    }

    /**
     * Get secrets
     * @param path
     * @param addition
     */
    async getSecrets(path: string, addition?: any): Promise<any> {
        return this.withRetry(() => this.getSecretsOnce(path, addition));
    }

    @timeout(10000)
    private async getSecretsOnce(path: string, addition: any): Promise<any> {
        switch (path) {
            case 'keys/operator':
                const OPERATOR_ID = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, { type: 'OPERATOR_ID' });
                const OPERATOR_KEY = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, { type: 'OPERATOR_KEY' });

                return { OPERATOR_ID: OPERATOR_ID.key, OPERATOR_KEY: OPERATOR_KEY.key };

            case 'apikey/ipfs':
                const IPFS_STORAGE_API_KEY = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, { type: 'IPFS_STORAGE_API_KEY' });

                return { IPFS_STORAGE_API_KEY: IPFS_STORAGE_API_KEY.key };

            case 'secretkey/auth':
                const JWT_PRIVATE_KEY = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, {type: 'JWT_PRIVATE_KEY'});
                const JWT_PUBLIC_KEY = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, {type: 'JWT_PUBLIC_KEY'});

                return {JWT_PRIVATE_KEY: JWT_PRIVATE_KEY.key, JWT_PUBLIC_KEY: JWT_PUBLIC_KEY.key};

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
    async setSecrets(path: string, data: any, addition?: any): Promise<void> {
        return this.withRetry(() => this.setSecretsOnce(path, data, addition));
    }

    @timeout(10000)
    private async setSecretsOnce(path: string, data: any, addition?: any): Promise<void> {
        switch (path) {
            case 'keys/operator':
                await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, { type: 'OPERATOR_ID', key: data.OPERATOR_ID });
                await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, { type: 'OPERATOR_KEY', key: data.OPERATOR_KEY });

                return;

            case 'apikey/ipfs':
                await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, { type: 'IPFS_STORAGE_API_KEY',  key: data.IPFS_STORAGE_API_KEY });

                return;

            case 'secretkey/auth':
                await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, {type: 'JWT_PUBLIC_KEY', key: data.JWT_PUBLIC_KEY});
                await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, {type: 'JWT_PRIVATE_KEY', key: data.JWT_PRIVATE_KEY});

                return;

            default:
                await this.sendMessage<any>(WalletEvents.SET_KEY, addition);
                return;
        }
    }
}
