import { MOCK_PROJECTS } from '~/data'; // kept aside — not used for live data
import type { Project, ProjectIssuance } from '~/types/models';

// country display name → ISO 3166-1 alpha-3 for CountryFlag component
const COUNTRY_ALPHA3: Record<string, string> = {
    'Afghanistan': 'AFG', 'Albania': 'ALB', 'Algeria': 'DZA', 'Angola': 'AGO',
    'Argentina': 'ARG', 'Australia': 'AUS', 'Austria': 'AUT', 'Bangladesh': 'BGD',
    'Bolivia': 'BOL', 'Brazil': 'BRA', 'Cambodia': 'KHM', 'Canada': 'CAN',
    'Chile': 'CHL', 'China': 'CHN', 'Colombia': 'COL', 'Congo': 'COD',
    'Costa Rica': 'CRI', 'Cuba': 'CUB', 'DR Congo': 'COD', 'Ecuador': 'ECU',
    'El Salvador': 'SLV', 'Ethiopia': 'ETH', 'France': 'FRA', 'Germany': 'DEU',
    'Ghana': 'GHA', 'Guatemala': 'GTM', 'Haiti': 'HTI', 'Honduras': 'HND',
    'Iceland': 'ISL', 'India': 'IND', 'Indonesia': 'IDN', 'Jamaica': 'JAM',
    'Japan': 'JPN', 'Kenya': 'KEN', 'Malawi': 'MWI', 'Malaysia': 'MYS',
    'Mexico': 'MEX', 'Mozambique': 'MOZ', 'Myanmar': 'MMR', 'Nepal': 'NPL',
    'Nicaragua': 'NIC', 'Nigeria': 'NGA', 'Pakistan': 'PAK', 'Panama': 'PAN',
    'Paraguay': 'PRY', 'Peru': 'PER', 'Philippines': 'PHL', 'Rwanda': 'RWA',
    'Singapore': 'SGP', 'South Africa': 'ZAF', 'South Korea': 'KOR',
    'Sri Lanka': 'LKA', 'Switzerland': 'CHE', 'Taiwan': 'TWN', 'Tanzania': 'TZA',
    'Thailand': 'THA', 'Trinidad and Tobago': 'TTO', 'Uganda': 'UGA',
    'United Kingdom': 'GBR', 'United States': 'USA', 'Uruguay': 'URY',
    'Venezuela': 'VEN', 'Vietnam': 'VNM',
};

function parseSdgs(sdgs: unknown): number[] {
    if (Array.isArray(sdgs)) return (sdgs as unknown[]).map(Number).filter(Boolean);
    if (typeof sdgs === 'string' && sdgs.trim()) {
        return sdgs.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    }
    return [];
}

function mapApiProject(raw: Record<string, any>): Project {
    const countryCode = COUNTRY_ALPHA3[raw.country] || 'UNK';
    return {
        id: raw.sourceTimestamp || raw.id,
        name: raw.name ?? '',
        country: raw.country ?? '',
        countryCode,
        flag: '',
        lat: raw.lat ?? 0,
        lng: raw.lng ?? 0,
        methodology: raw.methodology ?? '',
        methodologyId: raw.methodologyId ?? '',
        registry: raw.registryName ?? raw.registry ?? raw.registryDid ?? 'Unknown Registry',
        developer: raw.developer ?? '',
        credits: raw.credits ?? 0,
        status: raw.status ?? 'Issuing',
        vintage: raw.vintage ?? '',
        sdgs: parseSdgs(raw.sdgs),
        category: raw.category ?? '',
        sector: raw.sector ?? '',
        sectoralScope: raw.sectoralScope ?? '',
        createdAt: raw.createdAt ?? '',
        topicId: raw.topicId ?? undefined,
        policyTopicId: raw.policyTopicId ?? undefined,
        registryDid: raw.registryDid ?? undefined,
        sourceTimestamp: raw.sourceTimestamp ?? undefined,
        issuances: Array.isArray(raw.issuances)
            ? (raw.issuances as Array<Record<string, any>>).map((i): ProjectIssuance => ({
                tokenId: i['tokenId'] ?? '',
                name: i['name'] ?? null,
                symbol: i['symbol'] ?? null,
                type: i['type'] ?? null,
                supply: typeof i['supply'] === 'number' ? i['supply'] : 0,
                mintDate: i['mintDate'] ?? null,
            }))
            : [],
        totalIssued: typeof raw.totalIssued === 'number' ? raw.totalIssued : 0,
        totalRetired: typeof raw.totalRetired === 'number' ? raw.totalRetired : 0,
        totalActive: typeof raw.totalActive === 'number' ? raw.totalActive : 0,
    };
}

export function useProjects() {
    const { network } = useNetwork();
    const config = useRuntimeConfig();

    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const key = computed(() => `projects:${network.value}`);
    const url = computed(() => `/api/v1/${network.value}/projects`);

    const { data, pending, error } = useAsyncData<{ data: Record<string, any>[]; meta: { total: number } }>(
        key.value,
        () => $fetch(url.value, { baseURL, query: { limit: 500 } }),
        {
            watch: [network],
            default: () => ({ data: [], meta: { total: 0 } }),
        },
    );

    const projects = computed<Project[]>(() => {
        const items = data.value?.data ?? [];
        return items.map(mapApiProject);
    });

    const total = computed(() => data.value?.meta?.total ?? 0);

    const filterOptions = computed(() => ({
        registries: [...new Set(projects.value.map(p => p.registry).filter(Boolean))].sort(),
        developers: [...new Set(projects.value.map(p => p.developer).filter(Boolean))].sort(),
        statuses: [...new Set(projects.value.map(p => p.status).filter(Boolean))].sort(),
        vintages: [...new Set(projects.value.map(p => p.vintage).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
        sectors: [...new Set(projects.value.map(p => p.sector).filter(Boolean))].sort(),
        sectoralScopes: [...new Set(projects.value.map(p => p.sectoralScope).filter(Boolean))].sort(),
    }));

    return { projects, total, filterOptions, pending, error };
}

export function useMockProjects() {
    return MOCK_PROJECTS;
}

export function useProjectDetail(id: Ref<string>) {
    const { network } = useNetwork();
    const config = useRuntimeConfig();

    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const key = computed(() => `project:${network.value}:${id.value}`);
    const url = computed(() => `/api/v1/${network.value}/projects/${id.value}`);

    const { data, pending, error } = useAsyncData<Record<string, any>>(
        key.value,
        () => $fetch(url.value, { baseURL }),
        {
            watch: [network, id],
            default: () => null,
        },
    );

    const project = computed<Project | null>(() => {
        if (!data.value) return null;
        return mapApiProject(data.value);
    });

    return { project, pending, error };
}

export interface ActivityEvent {
    date: string;
    action: string;
    type: string;
}

export function useProjectActivity(id: Ref<string>) {
    const { network } = useNetwork();
    const config = useRuntimeConfig();

    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const key = computed(() => `project-activity:${network.value}:${id.value}`);
    const url = computed(() => `/api/v1/${network.value}/projects/${id.value}/activity`);

    const { data, pending, error } = useAsyncData<ActivityEvent[]>(
        key.value,
        async () => {
            try {
                return await $fetch<ActivityEvent[]>(url.value, { baseURL });
            } catch {
                return [];
            }
        },
        {
            watch: [network, id],
            default: () => [],
        },
    );

    return { activity: data, pending, error };
}
