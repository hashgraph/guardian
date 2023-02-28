import { IBlockErrors } from './block-errors.interface';
import { IModulesErrors } from './modules-errors.interface';

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
     * Modules
     */
    modules?: IModulesErrors[];
}