/**
 * Vaults interface
 */
export interface IVault {
    /**
     * Get key
     * @param token
     * @param type
     * @param key
     */
    getKey: (token: string, type: string, key: string) => Promise<any>;
    /**
     * Set key
     * @param token
     * @param type
     * @param key
     * @param value
     */
    setKey: (token: string, type: string, key: string, value: string) => Promise<void>;

    /**
     * Initiate vault connection
     */
    init: () => Promise<IVault>
}
