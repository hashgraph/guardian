import { IArtifact } from '@guardian/interfaces';
import { IEventConfig } from "./event-config.interface";

export interface IBlockConfig {
    blockType: string;
    id?: string;
    tag?: string;
    permissions?: string[];
    children?: IBlockConfig[];
    events?: IEventConfig[];
    artifacts?: IArtifact[];
}
