/**
 * Instance errors
 */
interface IInstanceErrors {
    /**
     * ID
     */
    id: string,
    /**
     * Name
     */
    name: string,
    /**
     * Errors
     */
    errors: string[],
    /**
     * Is valid
     */
    isValid: boolean
}

/**
 * Serialized errors
 */
export interface ISerializedErrors {
    /**
     * Blocks
     */
    blocks?: IInstanceErrors[];

    /**
     * Common errors
     */
    errors?: string[];

    /**
     * Is bad policy
     */
    isBadPolicy?: boolean;
}