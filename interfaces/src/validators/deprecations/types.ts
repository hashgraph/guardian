export interface DeprecationInfo {
    severity?: 'warning' | 'info';
    since?: string;
    removalPlanned?: string;
    reason?: string;
    alternative?: string;
    alternativeBlockType?: string;
}

type BlockTypeName = string;
type PropertyName = string;

export type BlockDeprecationsMap = ReadonlyMap<BlockTypeName, DeprecationInfo>;

export type PropertyDeprecationsMap = ReadonlyMap<
    BlockTypeName,
    ReadonlyMap<PropertyName, DeprecationInfo>
>;
