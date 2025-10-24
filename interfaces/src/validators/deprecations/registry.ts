import {
    DeprecationInfo,
    BlockDeprecationsMap,
    PropertyDeprecationsMap
} from './types';

const _blocks = new Map<string, DeprecationInfo>([
    ['interfaceActionBlock', {
        severity: "warning",
        since: '2.13.0',
        alternative: 'Use "buttonBlock" with configured handler',
        alternativeBlockType: 'buttonBlock',
        reason: 'Unified UI actions under buttonBlock',
        removalPlanned: '2.15.0',
    }]
]);

const _properties = new Map<string, ReadonlyMap<string, DeprecationInfo>>([
    ['interfaceActionBlock', new Map<string, DeprecationInfo>([
        ['uiMetaData.title', {
            severity: "warning",
            since: '2.12.0',
            alternative: 'Use "New Title" with new event pipeline',
            removalPlanned: '2.15.0',
            alternativeBlockType: 'buttonBlock',
            reason: 'Unified UI actions under buttonBlock',
        }]
    ])]
]);

export const DEPRECATED_BLOCKS: BlockDeprecationsMap = _blocks;
export const DEPRECATED_PROPERTIES: PropertyDeprecationsMap = _properties;
