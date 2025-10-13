import {
    DeprecationInfo,
    BlockDeprecationsMap,
    PropertyDeprecationsMap
} from './types';

const _blocks = new Map<string, DeprecationInfo>([
    // ['oldReportBlock', { deprecated: true, since: '2.13.0', alternative: 'Use reportItemBlock', alternativeBlockType: 'reportItemBlock' }]
]);

const _properties = new Map<string, ReadonlyMap<string, DeprecationInfo>>([
    // ['mintDocumentBlock', new Map([ ['useOldMintLogic', { deprecated: true, since: '2.12.0', alternative: 'Remove and use new flow' }] ])]
]);

export const DEPRECATED_BLOCKS: BlockDeprecationsMap = _blocks;
export const DEPRECATED_PROPERTIES: PropertyDeprecationsMap = _properties;
