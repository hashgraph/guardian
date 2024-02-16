/**
 * Block properties
 */

export interface IBlockProp {
    /**
     * Block Type
     */
    blockType: string;
    /**
     * Options
     */
    options: any;
    /**
     * Children
     */
    children: IBlockProp[];
}
