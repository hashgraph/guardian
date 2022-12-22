import { BlockModel } from "../models/block.model";


export interface IBlockMap {
    blockType: string;
    left: BlockModel;
    right: BlockModel;
    rate: number;
}
