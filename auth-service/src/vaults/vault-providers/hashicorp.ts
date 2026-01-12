import NodeVault from 'node-vault';
import { IVault } from '../vault.interface.js';
import assert from 'node:assert';
import crypto from 'node:crypto';

/**
 * HashiCorp vault helper
 */
export class Hashicorp implements IVault{

    /**
     * Key encryption algorithm
     * @private
     */
    private readonly encryptionAlg = process.env.HASHICORP_ENCRIPTION_ALG || 'sha512';

    /**
     * Unseal key
     * @private
     */
    private readonly unsealKey = process.env.HASHICORP_UNSEAL_KEY || null;

    /**
     * Vault options
     * @private
     */
    private readonly options: NodeVault.VaultOptions = {
        apiVersion: 'v1',
        endpoint: process.env.HASHICORP_ADDRESS,
        token: process.env.HASHICORP_TOKEN,
        namespace: process.env.HASHICORP_NAMESPACE
    }

    /**
     * Vault client instance
     * @private
     */
    private readonly vault: NodeVault.client;

    /**
     * Logger instance
     * @private
     */
    // private readonly logger: Logger;

    constructor() {
        assert(process.env.HASHICORP_ADDRESS, 'HASHICORP_ADDRESS environment variable is not set');
        assert(process.env.HASHICORP_TOKEN, 'HASHICORP_TOKEN environment variable is not set');

        // Remove all final slashes
        this.options.endpoint = this.options.endpoint.replace(/^(.+?)(\/+)$/, '$1');

        this.vault = NodeVault(this.options);
        // this.logger = new Logger();
    }

    /**
     * Generate base64 encoded string
     * @param token
     * @param type
     * @param key
     * @private
     */
    private generateKeyName(token: string, type: string, key: string): string {
        return crypto.createHash(this.encryptionAlg).update(`${token}|${type}|${key}`).digest('hex');
    }

    /**
     * Init vault
     * @private
     */
    public async init(): Promise<IVault> {
        try {
            const {initialized} = await this.vault.initialized();
            if (!initialized) {
                const {keys, root_token} = await this.vault.init({secret_shares: 1, secret_threshold: 1});
                this.vault.token = root_token;
                console.info('Root Token', root_token);
                await this.vault.unseal({secret_shares: 1, key: keys[0]});
            }

            await this.forceUnsealVault();

        } catch (e) {
            console.warn(e.message);
        }

        return this;
    }

    /**
     * Unseal vault if key exist
     * @private
     */
    private async forceUnsealVault(): Promise<void> {
        if (this.unsealKey) {
            await this.vault.unseal({secret_shares: 1, key: this.unsealKey});
        }
    }

    /**
     * Get key from vault
     * @param token
     * @param type
     * @param key
     */
    public async getKey(token: string, type: string, key: string): Promise<string> {
        const result = await this.vault.read(`secret/data/${this.generateKeyName(token, type, key)}`);
        return result.data.data.privateKey;
    }

    /**
     * Set key to vault
     * @param token
     * @param type
     * @param key
     * @param value
     */
    public async setKey(token: string, type: string, key: string, value: string): Promise<void>{
        await this.vault.write(`secret/data/${this.generateKeyName(token, type, key)}`, {
            data: {
                privateKey: value
            }
        })
    }

    /**
     * Get global application key
     * @param type
     */
    async getGlobalApplicationKey(type: string): Promise<string> {
        try {
            const result = await this.vault.read(`secret/data/${type}`);
            return result.data.data.settingKey;
        } catch (e) {
            console.warn(e.message);
            return undefined;
        }
    }

    /**
     * Set global application key
     * @param type
     * @param key
     */
    async setGlobalApplicationKey(type: string, key: string): Promise<void> {
        await this.vault.write(`secret/data/${type}`, {
            data: {
                settingKey: key
            }
        })
    }
}
