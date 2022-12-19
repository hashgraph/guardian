import { BlockModel } from "./block-model";


export interface IBlockMap {
    blockType: string;
    left: BlockModel;
    right: BlockModel;
    rate: number;
}
