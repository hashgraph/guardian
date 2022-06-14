import { PolicyBlockMap, PolicyTagMap } from './';
import { IPolicyBlock, } from '@policy-engine/policy-engine.interface';

import { UserRole } from '@guardian/interfaces';
import { BlockAbout } from './block-about';

export interface PolicyBlockDecoratorOptions {
    blockType: string;
    commonBlock?: boolean;
    about?: BlockAbout;
    publishExternalEvent?: boolean;
}

export interface PolicyBlockConstructorParams {
    defaultActive: boolean;
    tag?: string;
    permissions: UserRole[];
    _parent: IPolicyBlock;
    options?: any;
    id?: string;
}

export interface PolicyBlockAdditionalFields {
    blockMap: PolicyBlockMap;
    tagMap: PolicyTagMap;
    _uuid: string;
}

export interface PolicyBlockFullArgumentList extends PolicyBlockDecoratorOptions, PolicyBlockConstructorParams, PolicyBlockAdditionalFields {
}

export interface PolicyBlockOptionsPartial extends Omit<PolicyBlockFullArgumentList, 'blockType' | '_uuid' | 'blockMap' | 'tagMap'> {
}
