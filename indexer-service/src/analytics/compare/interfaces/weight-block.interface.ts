/**
 * Weight tree
 */
export interface IWeightBlock {
    /**
     * Weight
     */
    weights: string[];
    /**
     * Children
     */
    children: IWeightBlock[];
    /**
     * Full children size
     */
    length: number;
}