/**
 * Import token mapping
 */
export interface ImportTokenMap {
    oldID: string;
    oldTokenID: string;
    newID: string;
    newTokenID: string;
}

/**
 * Import Result
 */
export interface ImportTokenResult {
    /**
     * New token uuid
     */
    tokenMap: ImportTokenMap[];
    /**
     * Errors
     */
    errors: any[];
}