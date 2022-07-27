/**
 * Update block message interface
 */
export interface IUpdateBlockMessage {
    /**
     * Block uuid
     */
    uuid: string
}

/**
 * Block error message interface
 */
export interface IErrorBlockMessage {
    /**
     * Block UUID
     */
    uuid: string;
    /**
     * Current user
     */
    user: {
        /**
         * User did
         */
        did: string
    };
    /**
     * Block type
     */
    blockType: string;
    /**
     * Error message
     */
    message: any;
}

/**
 * Update user info message interface
 */
export interface IUpdateUserInfoMessage {
    /**
     * User for update
     */
    user: {
        /**
         * User did
         */
        did: string
    };
}

/**
 * Update user balance message
 */
export interface IUpdateUserBalanceMessage {
    /**
     * Balance
     */
    balance: number;
    /**
     * Unit
     */
    unit: string;
    /**
     * User for update
     */
    user: {
        /**
         * Username
         */
        username: string;
        /**
         * User DID
         */
        did: string
    };
}
