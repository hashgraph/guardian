import { IBlockErrors } from "./block-errors.interface";

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
}
