/**
 * Get key message interface
 */
export interface IGetKeyMessage {
    /**
     * Token
     */
    token: string;
    /**
     * Type
     */
    type: string;
    /**
     * Key
     */
    key: string;
}

/**
 * Set key message interface
 */
export interface ISetKeyMessage extends IGetKeyMessage {
    /**
     * Key value
     */
    value: string;
}

/**
 * Get key response interface
 */
export interface IGetKeyResponse {
    /**
     * Key
     */
    key: string;
}

/**
 * Set global application key interface
 */
export interface ISetGlobalApplicationKey {
    /**
     * Key type
     */
    type: string;

    /**
     * Key value
     */
    key: string
}

/**
 * Set global application key interface
 */
export interface IGetGlobalApplicationKey {
    /**
     * Key
     */
    type: string;
}
