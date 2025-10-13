/**
 * Block errors`
 */

export interface IBlockErrors {
    /**
     * ID
     */
    id: string;
    /**
     * Name
     */
    name: string;
    /**
     * Errors
     */
    errors: string[];
    /**
     * Warnings
     */
    warnings?: string[];
    /**
     * Infos
     */
    infos?: string[];
    /**
     * Is valid
     */
    isValid: boolean;
}
