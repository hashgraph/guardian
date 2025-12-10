import { IBlockConfig } from './block-config.interface';
import { IEventConfig } from './event-config.interface';

export interface IModuleConfig extends IBlockConfig {
    name?: string;
    description?: string;
    previousVersion?: string;
    version?: string;
    innerEvents?: IEventConfig[];
    inputEvents?: {
        name: string;
        description: string;
    }[];
    outputEvents?: {
        name: string;
        description: string;
    }[];
    variables?: {
        name: string;
        description: string;
        type: string;
    }[];
}
