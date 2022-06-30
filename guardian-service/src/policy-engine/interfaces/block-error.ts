/**
 * Block error DTO
 */
export interface BlockErrorDTO {
    /**
     * Error code
     */
    code: number;
    /**
     * Block UUID
     */
    uuid: string;
    /**
     * Block type
     */
    blockType: string;
    /**
     * Error message
     */
    message: string;
    /**
     * Error type
     */
    type: string;
}

/**
 * Block error interface
 */
export interface BlockError extends Error {
    /**
     * Error object
     */
    errorObject: BlockErrorDTO;
}
