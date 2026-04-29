export type FieldDef = {
    title: string;
    description: string;
    isGeoJson: boolean;
};

export type SchemaEntry = {
    schemaUuid: string;
    policyTopicId: string;
    geoKey: string;
    section: string | null;
    fieldMap: Record<string, FieldDef>;
};

export type MethodEntry = {
    name: string;
    registryDid: string;
    policyTopicId: string;
};

export type ResolutionMaps = {
    instToMethod: Record<string, MethodEntry>;
    policyTopicToMethod: Record<string, MethodEntry>;
    parentMap: Record<string, string>;
    userMethods: Record<string, MethodEntry[]>;
};

export type ProjectRecord = {
    key: string;
    sourceTimestamp: string;
    topicId: string;
    policyTopicId: string;
    name: string;
    country: string | null;
    lat: number;
    lng: number;
    methodology: string;
    methodologyId: string;
    registryDid: string | null;
    developer: string;
    credits: number;
    vintage: string | null;
    createdAt: string | null;
    creditingPeriodEnd: string | null;
    cobenefits: string | null;
    sdgs: number[];
    scale: string | null;
    category: string | null;
    sector: string;
    sectoralScope: string;
    vcCount: number;
};
