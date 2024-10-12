import { IBlockErrors } from './block-errors.interface.js';

/**
 * Module errors
 */
export interface IModulesErrors {
    /**
     * ID
     */
    id: string;

    /**
     * Is valid
     */
    isValid: boolean;

    /**
     * Blocks
     */
    blocks?: IBlockErrors[];

    /**
     * Blocks
     */
    tools?: IModulesErrors[];

    /**
     * Common errors
     */
    errors?: string[];
}
