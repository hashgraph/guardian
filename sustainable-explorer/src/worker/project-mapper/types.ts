export type FieldDef = {
    title: string;
    description: string;
    isGeoJson: boolean;
};

// Pre-resolved mapping from project property → schema field key.
// Computed once when a schema is confirmed; stored in projectSchemaConfig.
// null means no matching field was found for that property.
export type ResolvedFieldPaths = {
    name: string | null;
    country: string | null;
    developer: string | null;
    category: string | null;
    scale: string | null;
    sector: string | null;
    vintageRaw: string | null;
    creditingPeriod: string | null;
    sdgOrCobenefits: string | null;
};

export type SchemaEntry = {
    schemaUuid: string;
    policyTopicId: string;
    geoKey: string;
    section: string | null;
    fieldMap: Record<string, FieldDef>;
    resolvedFields?: ResolvedFieldPaths;
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
    lat: number | null;
    lng: number | null;
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
    projectSchemaUuids: string[];
};
