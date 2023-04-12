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
    getKey: (token: string, type: string, key: string) => Promise<string>;
    /**
     * Set key
     * @param token
     * @param type
     * @param key
     * @param value
     */
    setKey: (token: string, type: string, key: string, value: string) => Promise<void>;

    /**
     * Get global application key
     * @param type
     */
    getGlobalApplicationKey: (type: string) => Promise<string>;

    /**
     * Set global application key
     * @param type
     * @param key
     */
    setGlobalApplicationKey: (type: string, key: string) => Promise<void>;

    /**
     * Initiate vault connection
     */
    init: () => Promise<IVault>
}
