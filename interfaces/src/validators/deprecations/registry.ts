import {
    DeprecationInfo,
    BlockDeprecationsMap,
    PropertyDeprecationsMap
} from './types.js';

const _blocks = new Map<string, DeprecationInfo>([
    // ['interfaceActionBlock', {
    //     severity: 'warning',
    //     since: '',
    //     alternative: '',
    //     alternativeBlockType: '',
    //     reason: '',
    //     removalPlanned: '',
    // }]
]);

const _properties = new Map<string, ReadonlyMap<string, DeprecationInfo>>([
    // ['interfaceActionBlock', new Map<string, DeprecationInfo>([
    //     ['uiMetaData.title', {
    //         severity: 'warning',
    //         since: '',
    //         alternative: '',
    //         alternativeBlockType: '',
    //         reason: '',
    //         removalPlanned: '',
    //     }]
    // ])]
]);

export const DEPRECATED_BLOCKS: BlockDeprecationsMap = _blocks;
export const DEPRECATED_PROPERTIES: PropertyDeprecationsMap = _properties;
