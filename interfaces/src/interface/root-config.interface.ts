import { ISignOptions } from './sign-options.interface.js';

/**
 * Root config interface
 */
export interface IRootConfig {
    /**
     * ID
     */
    id?: string;
    /**
     * Hedera account id
     */
    hederaAccountId: string;
    /**
     * Hedera account private key
     */
    hederaAccountKey: string;
    /**
     * Root DID
     */
    did: string;
    /**
     * Sign options
     */
    signOptions: ISignOptions;
}
