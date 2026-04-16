export interface MockMethodology {
    id: string;
    name: string;
    code: string;
    registry: string;
    registryDid: string;
    sector: string;
    type: 'Avoidance' | 'Removal';
    status: 'Active' | 'Deprecated';
    version: string;
    description: string;
    fullDescription: string;
    topicId: string;
    instanceTopicId: string;
    policyName: string;
    lastVerified: string;
    createdAt: string;
    stats: {
        totalIssuance: number;
        totalRetirement: number;
        activeProjects: number;
        projectCount: number;
    };
    emissionReduction: {
        baselineScenario: string;
        projectScenario: string;
        calculationMethod: string;
    };
    sectoralScopes: string[];
    versionHistory: Array<{
        version: string;
        date: string;
        label: string;
        changes: string;
        isCurrent: boolean;
    }>;
    linkedProjects: Array<{
        id: string;
        name: string;
        country: string;
        countryCode: string;
        status: string;
        credits: number;
        vintage: string;
    }>;
}

export const MOCK_METHODOLOGY: MockMethodology = {
    id: 'acm0002',
    name: 'ACM0002 — Grid-Connected Electricity Generation from Renewable Sources',
    code: 'ACM0002',
    registry: 'Verra',
    registryDid: 'did:hedera:mainnet:FEeRpPMGU2QMFkECVRrJ',
    sector: 'Energy',
    type: 'Avoidance',
    status: 'Active',
    version: 'v1.3',
    description: 'This methodology quantifies emission reductions from renewable energy generation replacing fossil fuel-based electricity.',
    fullDescription: 'ACM0002 applies to project activities that displace more greenhouse gas (GHG) intensive electricity generation from the grid with electricity generated from renewable sources. The methodology covers solar, wind, hydro, geothermal and other renewable energy technologies connected to an electricity grid.',
    topicId: '0.0.1234567',
    instanceTopicId: '0.0.7654321',
    policyName: 'Renewable Energy Policy v1.3',
    lastVerified: '2023-10-20',
    createdAt: '2019-03-15',
    stats: {
        totalIssuance: 2840000,
        totalRetirement: 1920000,
        activeProjects: 14,
        projectCount: 18,
    },
    emissionReduction: {
        baselineScenario: 'Fossil fuel grid electricity generation',
        projectScenario: 'Renewable energy generation displacing grid electricity',
        calculationMethod: 'Grid emission factor displacement with leakage adjustment',
    },
    sectoralScopes: ['Energy Industries (Renewable / Non-Renewable Sources)', 'Energy Efficiency', 'Grid Connected'],
    versionHistory: [
        { version: 'v1.3', date: 'Jan 2023', label: 'Current', changes: 'Improved baseline calculation methodology and updated grid emission factors', isCurrent: true },
        { version: 'v1.2', date: 'Aug 2021', label: '', changes: 'Added monitoring guidelines for small-scale installations', isCurrent: false },
        { version: 'v1.1', date: 'Mar 2019', label: '', changes: 'Initial release with core methodology framework', isCurrent: false },
    ],
    linkedProjects: [
        { id: '1', name: 'Solar Farm Kenya', country: 'Kenya', countryCode: 'KEN', status: 'Issuing', credits: 125000, vintage: '2024' },
        { id: '3', name: 'Wind Energy India', country: 'India', countryCode: 'IND', status: 'Verified', credits: 87500, vintage: '2023' },
        { id: '5', name: 'Solar Chile', country: 'Chile', countryCode: 'CHL', status: 'Registered', credits: 42000, vintage: '2024' },
    ],
};
