/**
 * Policy block
 */
export interface IBlockJson {
    /**
     * Id
     */
    id?: string;
    /**
     * Tag
     */
    tag?: string;
    /**
     * Type
     */
    blockType: string;
    /**
     * Children
     */
    children?: IBlockJson[];
    /**
     * Events
     */
    events?: any[];
    /**
     * Artifacts
     */
    artifacts?: any[];
    /**
     * Other params
     */
    [key: string]: any;
}