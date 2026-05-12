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
 * Block completion event — emitted on external-events.block_complete when the full async
 * execution chain for a SET_BLOCK_DATA call has settled (success or failure).
 */
export interface IBlockCompleteEvent {
    /** Correlation id — matches the trackingId returned in the SET_BLOCK_DATA API response */
    trackingId: string;
    /** Block type string (e.g. "requestVcDocumentBlock") */
    blockType: string;
    /** Block tag identifier */
    blockTag: string;
    /** Block UUID */
    blockId: string;
    /** Policy id */
    policyId: string;
    /** DID of the user who triggered the action */
    userId: string;
    /** 'success' when all downstream async work finished without error; 'failure' otherwise */
    status: 'success' | 'failure';
    /** The MessageResponse body from blockSetData, if available */
    outputData?: any;
    /** Human-readable description of the first error (when status === 'failure') */
    error?: string;
    /** All errors collected across the downstream async chain */
    errorDetails?: Array<{ message: string; stack?: string }>;
    /** Unix ms timestamp when completion was determined */
    timestamp: number;
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
    user?: {
        /**
         * Username
         */
        username: string;
        /**
         * User DID
         */
        did: string
    };
    /**
     * Operator account ID
     */
    operatorAccountId?: string;
}
