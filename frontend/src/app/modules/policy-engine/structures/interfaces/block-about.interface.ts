import { ControlType } from "../types/control-type.type";
import { ChildrenType } from "../types/children-type.type";

export interface IBlockAbout {
    post: boolean;
    get: boolean;
    input: any;
    output: any;
    children: ChildrenType;
    control: ControlType;
    defaultEvent: boolean;
    prev?: IBlockAbout;
    next?: boolean;
}
