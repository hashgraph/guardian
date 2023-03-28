import { BlockType } from "../types/block-type.type";
import { BlockGroup } from "../types/block-group.type";
import { BlockHeaders } from "../types/block-headers.type";
import { ChildrenDisplaySettings } from "./children-display-settings.interface";
import { IBlockDynamicAboutConfig } from "./block-dynamic-about-config.interface";

export interface IBlockSetting {
    type: BlockType;
    icon: string;
    group: BlockGroup;
    header: BlockHeaders;
    factory: any;
    property: any;
    allowedChildren?: ChildrenDisplaySettings[];
    about?: IBlockDynamicAboutConfig;
}
