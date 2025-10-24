import { IBlockErrors } from './block-errors.interface.js';
import { IModulesErrors } from './modules-errors.interface.js';

/**
 * Serialized errors
 */
export interface ISerializedErrors {
    /**
     * Blocks
     */
    blocks?: IBlockErrors[];

    /**
     * Common errors
     */
    errors?: string[];

    /**
     * Common warnings
     */
    warnings?: string[];

    /**
     * Infos
     */
    infos?: string[];

    /**
     * Modules
     */
    modules?: IModulesErrors[];

    /**
     * Tools
     */
    tools?: IModulesErrors[];

    /**
     * Is valid
     */
    isValid: boolean;
}
