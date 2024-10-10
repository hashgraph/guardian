import { BlockType } from "@guardian/interfaces";
import { BlockGroup } from "../types/block-group.type";
import { BlockHeaders } from "../types/block-headers.type";

export interface ChildrenDisplaySettings {
    type: BlockType;
    group?: BlockGroup;
    header?: BlockHeaders;
}
