import { IBlockConfig } from './block-config.interface';

export interface IModuleConfig extends IBlockConfig {
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
