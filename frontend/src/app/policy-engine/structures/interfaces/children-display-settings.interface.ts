import { BlockGroup } from "../types/block-group.type";
import { BlockHeaders } from "../types/block-headers.type";
import { BlockType } from "../types/block-type.type";

export interface ChildrenDisplaySettings {
    type: BlockType;
    group?: BlockGroup;
    header?: BlockHeaders;
}
