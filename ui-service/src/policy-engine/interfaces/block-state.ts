import {IPolicyBlock, IPolicyInterfaceBlock} from '@policy-engine/policy-engine.interface';

export interface PolicyBlockStateData<T> {
    isActive: boolean;
    data: T,

    [key: string]: any
}

export interface PolicyBlockStateCommon<T> {
    dependencyData: { [key: string]: any }
    ownData: T
}

export type PolicyBlockState<T> = PolicyBlockStateCommon<PolicyBlockStateData<T>>;

export type PolicyBlockDependencies = string[];

export type PolicyBlockMap = Map<string, IPolicyBlock | IPolicyInterfaceBlock>;
export type PolicyTagMap = Map<string, string>;
