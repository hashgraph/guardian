export interface DeprecationInfo {
    deprecated: true;
    since?: string;
    removalPlanned?: string;
    reason?: string;
    alternative?: string;
    alternativeBlockType?: string;
    migrationGuideUrl?: string;
}

export type BlockTypeName = string;
export type PropertyName = string;

export type BlockDeprecationsMap = ReadonlyMap<BlockTypeName, DeprecationInfo>;

export type PropertyDeprecationsMap = ReadonlyMap<
    BlockTypeName,
    ReadonlyMap<PropertyName, DeprecationInfo>
>;
