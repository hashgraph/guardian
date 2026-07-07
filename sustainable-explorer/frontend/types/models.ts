export interface ProjectIssuance {
    tokenId: string;
    name: string | null;
    symbol: string | null;
    type: string | null;
    supply: number;
    mintDate: string | null;
    rawVc?: Record<string, any> | null;
}

export interface IssuanceEvent {
    mintConsensusTimestamp: string;
    tokenId: string | null;
    name: string | null;
    symbol: string | null;
    type: string | null;
    amount: number | null;
    mintDate: string | null;
    linkMethod: string | null;
    rawVc: Record<string, any> | null;
}

export interface LinkedVc {
    consensusTimestamp: string;
    topicId: string;
    csId: string | null;
}

export interface LinkedSchema {
    schemaUuid: string;
    schemaName: string | null;
    isProjectSchema: boolean;
    docType: string;
    vcCount: number;
    linkedVcs: LinkedVc[];
}

export interface Milestone {
    key: string;
    label: string;
    state: 'complete' | 'current' | 'expected' | 'pending';
    date: string | null;
    dateType: 'actual' | 'expected' | null;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    country: string;
    countryCode: string;
    flag: string;
    lat: number;
    lng: number;
    methodology: string;
    methodologyId: string;
    registry: string;
    developer: string;
    credits: number;
    status: 'Registered' | 'Under Validation' | 'Verified' | 'Issuing' | 'Completed';
    vintage: string;
    sdgs: number[];
    category: string;
    sector: string;
    sectoralScope: string;
    createdAt: string;
    creditingPeriodStart?: string | null;
    creditingPeriodEnd?: string | null;
    topicId?: string;
    policyTopicId?: string;
    instanceTopicId?: string | null;
    registryDid?: string;
    sourceTimestamp?: string;
    projectKey?: string | null;
    issuances?: ProjectIssuance[];
    issuanceEvents?: IssuanceEvent[];
    issuanceCount?: number;
    linkedSchemas?: LinkedSchema[];
    totalIssued?: number;
    totalRetired?: number;
    totalActive?: number;
    rawVc?: Record<string, any>;
    decodeMethod?: string | null;
    metadata?: Record<string, unknown> | null;
    lifecycleStage?: string;
    expectedIssuanceYear?: string | null;
    projectedVolume?: number | null;
    milestones?: Milestone[];
}

export interface Credit {
    id: string;
    tokenId: string;
    name: string;
    symbol: string;
    type: 'Fungible' | 'Non-Fungible';
    supply: number;
    projectId: string;
    registry: string;
    mintDate: string;
    rawVc?: Record<string, any>;
}

export interface Transfer {
    id: string;
    creditId: string;
    projectId: string;
    from: string;
    to: string;
    quantity: number;
    date: string;
    txHash: string;
    status: 'Completed' | 'Pending';
}

export interface Retirement {
    id: string;
    creditId: string;
    projectId: string;
    beneficiary: string;
    quantity: number;
    date: string;
    txHash: string;
    reason: string;
    status: 'Completed' | 'Pending';
}

export interface Registry {
    id: string;
    name: string;
    did: string;
    policies: number;
    projects: number;
    users: number;
    credits: string;
    status: 'Active' | 'Inactive';
    network: 'Mainnet' | 'Testnet';
    geography: string | null;
    website: string | null;
    law: string | null;
    tags: string | null;
    createdAt: string | null;
}

export interface Methodology {
    id: string;
    name: string;
    registry: string;
    category: string;
    projects: number;
    credits: string;
    schemas: number;
}

export interface Developer {
    id: string;
    name: string;
    country: string;
    countries: number;
    registries: string[];
    projects: number;
    totalIssued: string;
    totalRetired: string;
    categories: string[];
    status: 'Active' | 'Inactive';
}

export interface CountryStats {
    name: string;
    code: string;
    flag: string;
    lat: number;
    lng: number;
    projects: number;
    credits: number;
    methodologies: number;
}

export interface SdgStats {
    id: number;
    name: string;
    color: string;
    projects: number;
    credits: number;
    developers: number;
    countries: number;
    topMethodology: string;
}

export interface DashboardStats {
    registries: number;
    methodologies: number;
    projects: number;
    totalCredits: number;
}

export interface ActivityItem {
    time: string;
    action: string;
    detail: string;
    type: 'project' | 'credit' | 'policy' | 'verification' | 'registry' | 'retirement';
}

export interface MapPoint {
    name: string;
    lat: number;
    lng: number;
    credits: string;
}

export interface MapCountry {
    country: string;
    countryCode: string;
    projects: number;
    credits: string;
}
