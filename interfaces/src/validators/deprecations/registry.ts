import {
    DeprecationInfo,
    BlockDeprecationsMap,
    PropertyDeprecationsMap
} from './types';

const _blocks = new Map<string, DeprecationInfo>([
    ['interfaceActionBlock', {
        deprecated: true,
        since: '2.13.0',
        alternative: 'Use "buttonBlock" with configured handler',
        alternativeBlockType: 'buttonBlock',
        reason: 'Unified UI actions under buttonBlock',
        removalPlanned: '2.15.0',
        migrationGuideUrl: 'https://docs.example/migrate-action-block'
    }]
]);

const _properties = new Map<string, ReadonlyMap<string, DeprecationInfo>>([
    ['interfaceActionBlock', new Map<string, DeprecationInfo>([
        ['uiMetaData.title', {
            deprecated: true,
            since: '2.12.0',
            alternative: 'Use "New Title" with new event pipeline',
            removalPlanned: '2.15.0'
        }]
    ])]
]);

export const DEPRECATED_BLOCKS: BlockDeprecationsMap = _blocks;
export const DEPRECATED_PROPERTIES: PropertyDeprecationsMap = _properties;
