import { PolicyItem } from "../policy-models/interfaces/types";
import { ChildrenType } from "../types/children-type.type";
import { ControlType } from "../types/control-type.type";
import { IBlockAbout } from "./block-about.interface";

type ConfigFunction<T> = ((value: any, block: PolicyItem, prev?: IBlockAbout, next?: boolean) => T) | T;

export interface IBlockDynamicAboutConfig {
    post?: ConfigFunction<boolean>;
    get?: ConfigFunction<boolean>;
    input?: ConfigFunction<any>;
    output?: ConfigFunction<any>;
    children?: ConfigFunction<ChildrenType>;
    control?: ConfigFunction<ControlType>;
    defaultEvent?: ConfigFunction<boolean>;
    deprecated?: ConfigFunction<boolean>;
}
