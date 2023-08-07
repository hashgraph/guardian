/**
 * Weight tree
 */
export interface IWeightTree {
    /**
     * Weight
     */
    weight: string;
    /**
     * Type
     */
    children?: IWeightTree[];
}
