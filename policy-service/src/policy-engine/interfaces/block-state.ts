import { IPolicyBlock, IPolicyInterfaceBlock, IPolicyNavigationStep } from '@policy-engine/policy-engine.interface';

/**
 * Block state data
 */
export interface PolicyBlockStateData<T> {
    /**
     * Is active
     */
    isActive: boolean;
    /**
     * Data
     */
    data: T,

    [key: string]: any
}

/**
 * Block state common
 */
export interface PolicyBlockStateCommon<T> {
    /**
     * Dependency data
     */
    dependencyData: { [key: string]: any };
    /**
     * Own data
     */
    ownData: T;
}

/**
 * Block state
 */
export type PolicyBlockState<T> = PolicyBlockStateCommon<PolicyBlockStateData<T>>;
/**
 * Block map
 */
export type PolicyBlockMap = Map<string, IPolicyBlock | IPolicyInterfaceBlock>;
/**
 * Tag map
 */
export type PolicyTagMap = Map<string, string>;
/**
 * Navigation map
 */
export type PolicyNavigationMap = Map<string, IPolicyNavigationStep[]>;
