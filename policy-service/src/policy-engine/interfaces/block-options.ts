import { PolicyBlockMap, PolicyTagMap } from './index.js';
import { IPolicyBlock, } from '../policy-engine.interface.js';

import { UserRole } from '@guardian/interfaces';
import { BlockAbout } from './block-about.js';

/**
 * Policy block decorator options
 */
export interface PolicyBlockDecoratorOptions {
    /**
     * Block type
     */
    blockType: string;
    /**
     * Is common block
     */
    commonBlock?: boolean;
    /**
     * Block about
     */
    about?: BlockAbout;
    /**
     * Block variables
     */
    variables?: {
        /**
         * Variable path
         */
        path: string,
        /**
         * Variable alias
         */
        alias?: string,
        /**
         * Variable type
         */
        type?: 'Schema' | 'Token' | 'Role' | 'Group' | 'TokenTemplate' | 'Topic' | 'String'
    }[];
}

/**
 * Block constructor params
 */
export interface PolicyBlockConstructorParams {
    /**
     * Is default active
     */
    defaultActive: boolean;
    /**
     * Block tag
     */
    tag?: string;
    /**
     * Block permissions
     */
    permissions: UserRole[];
    /**
     * Parent block
     */
    _parent: IPolicyBlock;
    /**
     * Block options
     */
    options?: any;
    /**
     * Block id
     */
    id?: string;
}

/**
 * Block additional fields
 */
export interface PolicyBlockAdditionalFields {
    /**
     * Block map
     */
    blockMap: PolicyBlockMap;
    /**
     * Tag map
     */
    tagMap: PolicyTagMap;
    /**
     * Block uuid
     */
    _uuid: string;
}

/**
 * Block full arguments list
 */
export interface PolicyBlockFullArgumentList extends PolicyBlockDecoratorOptions, PolicyBlockConstructorParams, PolicyBlockAdditionalFields {
}

/**
 * Block actions partial
 */
export interface PolicyBlockOptionsPartial extends Omit<PolicyBlockFullArgumentList, 'blockType' | '_uuid' | 'blockMap' | 'tagMap'> {
}
