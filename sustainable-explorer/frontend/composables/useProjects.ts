import type { Project, ProjectIssuance, IssuanceEvent, LinkedSchema, LinkedVc, Milestone } from '~/types/models';

// country display name → ISO 3166-1 alpha-3 for CountryFlag component
export const COUNTRY_ALPHA3: Record<string, string> = {
    // A
    'Afghanistan': 'AFG', 'Albania': 'ALB', 'Algeria': 'DZA', 'Andorra': 'AND',
    'Angola': 'AGO', 'Antigua and Barbuda': 'ATG', 'Argentina': 'ARG', 'Armenia': 'ARM',
    'Australia': 'AUS', 'Austria': 'AUT', 'Azerbaijan': 'AZE',
    // B
    'Bahamas': 'BHS', 'Bahrain': 'BHR', 'Bangladesh': 'BGD', 'Barbados': 'BRB',
    'Belarus': 'BLR', 'Belgium': 'BEL', 'Belize': 'BLZ', 'Benin': 'BEN',
    'Bhutan': 'BTN', 'Bolivia': 'BOL', 'Bosnia and Herzegovina': 'BIH',
    'Botswana': 'BWA', 'Brazil': 'BRA', 'Brunei': 'BRN', 'Brunei Darussalam': 'BRN',
    'Bulgaria': 'BGR', 'Burkina Faso': 'BFA', 'Burundi': 'BDI',
    // C
    'Cabo Verde': 'CPV', 'Cape Verde': 'CPV', 'Cambodia': 'KHM', 'Cameroon': 'CMR',
    'Canada': 'CAN', 'Central African Republic': 'CAF', 'Chad': 'TCD',
    'Chile': 'CHL', 'China': 'CHN', 'Colombia': 'COL', 'Comoros': 'COM',
    'Congo': 'COG', 'Republic of the Congo': 'COG', 'Costa Rica': 'CRI',
    'Croatia': 'HRV', 'Cuba': 'CUB', 'Cyprus': 'CYP', 'Czech Republic': 'CZE', 'Czechia': 'CZE',
    // D
    'Denmark': 'DNK', 'Djibouti': 'DJI', 'Dominica': 'DMA', 'Dominican Republic': 'DOM',
    'DR Congo': 'COD', 'Democratic Republic of the Congo': 'COD',
    // E
    'Ecuador': 'ECU', 'Egypt': 'EGY', 'El Salvador': 'SLV', 'Equatorial Guinea': 'GNQ',
    'Eritrea': 'ERI', 'Estonia': 'EST', 'Eswatini': 'SWZ', 'Swaziland': 'SWZ',
    'Ethiopia': 'ETH',
    // F
    'Fiji': 'FJI', 'Finland': 'FIN', 'France': 'FRA',
    // G
    'Gabon': 'GAB', 'Gambia': 'GMB', 'Georgia': 'GEO', 'Germany': 'DEU',
    'Ghana': 'GHA', 'Greece': 'GRC', 'Grenada': 'GRD', 'Guatemala': 'GTM',
    'Guinea': 'GIN', 'Guinea-Bissau': 'GNB', 'Guyana': 'GUY',
    // H
    'Haiti': 'HTI', 'Honduras': 'HND', 'Hungary': 'HUN',
    'Hong Kong': 'HKG',
    // I
    'Iceland': 'ISL', 'India': 'IND', 'Indonesia': 'IDN', 'Iran': 'IRN',
    'Iraq': 'IRQ', 'Ireland': 'IRL', 'Israel': 'ISR', 'Italy': 'ITA',
    'Ivory Coast': 'CIV', "Côte d'Ivoire": 'CIV', 'Cote d\'Ivoire': 'CIV',
    // J
    'Jamaica': 'JAM', 'Japan': 'JPN', 'Jordan': 'JOR',
    // K
    'Kazakhstan': 'KAZ', 'Kenya': 'KEN', 'Kiribati': 'KIR', 'Kuwait': 'KWT',
    'Kyrgyzstan': 'KGZ',
    // L
    'Laos': 'LAO', 'Lao PDR': 'LAO', "Lao People's Democratic Republic": 'LAO',
    'Latvia': 'LVA', 'Lebanon': 'LBN', 'Lesotho': 'LSO', 'Liberia': 'LBR',
    'Libya': 'LBY', 'Liechtenstein': 'LIE', 'Lithuania': 'LTU', 'Luxembourg': 'LUX',
    // M
    'Madagascar': 'MDG', 'Malawi': 'MWI', 'Malaysia': 'MYS', 'Maldives': 'MDV',
    'Mali': 'MLI', 'Malta': 'MLT', 'Marshall Islands': 'MHL', 'Mauritania': 'MRT',
    'Mauritius': 'MUS', 'Mexico': 'MEX', 'Micronesia': 'FSM', 'Moldova': 'MDA',
    'Monaco': 'MCO', 'Mongolia': 'MNG', 'Montenegro': 'MNE', 'Morocco': 'MAR',
    'Mozambique': 'MOZ', 'Myanmar': 'MMR', 'Burma': 'MMR', "MEX": 'MEX', 'Macau': 'MAC',
    // N
    'Namibia': 'NAM', 'Nauru': 'NRU', 'Nepal': 'NPL', 'Netherlands': 'NLD',
    'New Zealand': 'NZL', 'Nicaragua': 'NIC', 'Niger': 'NER', 'Nigeria': 'NGA',
    'North Korea': 'PRK', 'North Macedonia': 'MKD', 'Macedonia': 'MKD', 'Norway': 'NOR',
    // O
    'Oman': 'OMN',
    // P
    'Pakistan': 'PAK', 'Palau': 'PLW', 'Palestine': 'PSE', 'Panama': 'PAN',
    'Papua New Guinea': 'PNG', 'Paraguay': 'PRY', 'Peru': 'PER', 'Philippines': 'PHL',
    'Poland': 'POL', 'Portugal': 'PRT', 'Puerto Rico': 'PRI', 
    // Q
    'Qatar': 'QAT',
    // R
    'Romania': 'ROU', 'Russia': 'RUS', 'Russian Federation': 'RUS', 'Rwanda': 'RWA', 'Réunion': 'REU',
    // S
    'Saint Kitts and Nevis': 'KNA', 'Saint Lucia': 'LCA',
    'Saint Vincent and the Grenadines': 'VCT', 'Samoa': 'WSM', 'San Marino': 'SMR',
    'Sao Tome and Principe': 'STP', 'Saudi Arabia': 'SAU', 'Senegal': 'SEN',
    'Serbia': 'SRB', 'Seychelles': 'SYC', 'Sierra Leone': 'SLE', 'Singapore': 'SGP',
    'Slovakia': 'SVK', 'Slovenia': 'SVN', 'Solomon Islands': 'SLB', 'Somalia': 'SOM',
    'South Africa': 'ZAF', 'South Korea': 'KOR', 'Republic of Korea': 'KOR',
    'South Sudan': 'SSD', 'Spain': 'ESP', 'Sri Lanka': 'LKA', 'Sudan': 'SDN',
    'Suriname': 'SUR', 'Sweden': 'SWE', 'Switzerland': 'CHE',
    'Syria': 'SYR', 'Syrian Arab Republic': 'SYR',
    // T
    'Taiwan': 'TWN', 'Tajikistan': 'TJK', 'Tanzania': 'TZA',
    'United Republic of Tanzania': 'TZA', 'Thailand': 'THA',
    'Timor-Leste': 'TLS', 'East Timor': 'TLS', 'Togo': 'TGO', 'Tonga': 'TON',
    'Trinidad and Tobago': 'TTO', 'Tunisia': 'TUN', 'Turkey': 'TUR', 'Türkiye': 'TUR',
    'Turkmenistan': 'TKM', 'Tuvalu': 'TUV',
    // U
    'Uganda': 'UGA', 'Ukraine': 'UKR', 'United Arab Emirates': 'ARE', 'UAE': 'ARE',
    'United Kingdom': 'GBR', 'United States': 'USA', 'United States of America': 'USA',
    'Uruguay': 'URY', 'Uzbekistan': 'UZB',
    // V
    'Vanuatu': 'VUT', 'Vatican City': 'VAT', 'Venezuela': 'VEN',
    'Vietnam': 'VNM', 'Viet Nam': 'VNM',
    // Y
    'Yemen': 'YEM',
    // Z
    'Zambia': 'ZMB', 'Zimbabwe': 'ZWE',
};

function parseSdgs(sdgs: unknown): number[] {
    if (Array.isArray(sdgs)) return (sdgs as unknown[]).map(Number).filter(Boolean);
    if (typeof sdgs === 'string' && sdgs.trim()) {
        return sdgs.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    }
    return [];
}

export function mapApiProject(raw: Record<string, any>): Project {
    const countryCode = COUNTRY_ALPHA3[raw.country] || 'UNK';
    return {
        id: raw.sourceTimestamp || raw.id,
        name: raw.name ?? '',
        description: raw.description ?? '',
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
        creditingPeriodStart: raw.creditingPeriodStart ?? null,
        creditingPeriodEnd: raw.creditingPeriodEnd ?? null,
        topicId: raw.topicId ?? undefined,
        policyTopicId: raw.policyTopicId ?? undefined,
        instanceTopicId: raw.instanceTopicId ?? null,
        registryDid: raw.registryDid ?? undefined,
        sourceTimestamp: raw.sourceTimestamp ?? undefined,
        projectKey: raw.projectKey ?? null,
        issuanceCount: typeof raw.issuanceCount === 'number' ? raw.issuanceCount : 0,
        issuances: Array.isArray(raw.issuances)
            ? (raw.issuances as Array<Record<string, any>>).map((i): ProjectIssuance => ({
                tokenId: i['tokenId'] ?? '',
                name: i['name'] ?? null,
                symbol: i['symbol'] ?? null,
                type: i['type'] ?? null,
                supply: typeof i['supply'] === 'number' ? i['supply'] : 0,
                mintDate: i['mintDate'] ?? null,
                rawVc: i['rawVc'] ?? null,
            }))
            : [],
        issuanceEvents: Array.isArray(raw.issuanceEvents)
            ? (raw.issuanceEvents as Array<Record<string, any>>).map((e): IssuanceEvent => ({
                mintConsensusTimestamp: typeof e['mintConsensusTimestamp'] === 'string' ? e['mintConsensusTimestamp'] : '',
                tokenId: typeof e['tokenId'] === 'string' ? e['tokenId'] : null,
                name: typeof e['name'] === 'string' ? e['name'] : null,
                symbol: typeof e['symbol'] === 'string' ? e['symbol'] : null,
                type: typeof e['type'] === 'string' ? e['type'] : null,
                amount: typeof e['amount'] === 'number' ? e['amount'] : null,
                mintDate: typeof e['mintDate'] === 'string' ? e['mintDate'] : null,
                linkMethod: typeof e['linkMethod'] === 'string' ? e['linkMethod'] : null,
                rawVc: e['rawVc'] && typeof e['rawVc'] === 'object' ? (e['rawVc'] as Record<string, any>) : null,
            }))
            : [],
        totalIssued: typeof raw.totalIssued === 'number' ? raw.totalIssued : 0,
        totalRetired: typeof raw.totalRetired === 'number' ? raw.totalRetired : 0,
        totalActive: typeof raw.totalActive === 'number' ? raw.totalActive : 0,
        linkedSchemas: Array.isArray(raw.linkedSchemas)
            ? (raw.linkedSchemas as Array<Record<string, any>>).map((s): LinkedSchema => ({
                schemaUuid: s['schemaUuid'] ?? '',
                schemaName: s['schemaName'] ?? null,
                isProjectSchema: Boolean(s['isProjectSchema']),
                docType: typeof s['docType'] === 'string' ? s['docType'] : 'unknown',
                vcCount: typeof s['vcCount'] === 'number' ? s['vcCount'] : 0,
                linkedVcs: Array.isArray(s['linkedVcs'])
                    ? (s['linkedVcs'] as Array<Record<string, any>>).map((v): LinkedVc => ({
                        consensusTimestamp: v['consensusTimestamp'] ?? '',
                        topicId: v['topicId'] ?? '',
                        csId: v['csId'] ?? null,
                    }))
                    : [],
            }))
            : [],
        decodeMethod: typeof raw.decodeMethod === 'string' ? raw.decodeMethod : null,
        metadata: raw.metadata && typeof raw.metadata === 'object' ? (raw.metadata as Record<string, unknown>) : null,
        lifecycleStage: typeof raw.lifecycleStage === 'string' ? raw.lifecycleStage : ((raw.totalIssued ?? 0) > 0 ? 'Issued' : 'Registered'),
        expectedIssuanceYear: typeof raw.expectedIssuanceYear === 'string' ? raw.expectedIssuanceYear : null,
        projectedVolume: typeof raw.projectedVolume === 'number' ? raw.projectedVolume : null,
        milestones: Array.isArray(raw.milestones)
            ? (raw.milestones as Array<Record<string, any>>).map((m): Milestone => ({
                key: typeof m['key'] === 'string' ? m['key'] : '',
                label: typeof m['label'] === 'string' ? m['label'] : '',
                state: typeof m['state'] === 'string' ? (m['state'] as Milestone['state']) : 'pending',
                date: typeof m['date'] === 'string' ? m['date'] : null,
                dateType: typeof m['dateType'] === 'string' ? (m['dateType'] as Milestone['dateType']) : null,
            }))
            : [],
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

    // Page size used for the bulk dashboard fetch. The first page also carries
    // meta.total so we know whether to fetch additional pages.
    const PAGE_SIZE = 1000;

    async function fetchAll(): Promise<{ data: Record<string, any>[]; meta: { total: number } }> {
        const first = await $fetch<{ data: Record<string, any>[]; meta: { total: number } }>(
            url.value, { baseURL, query: { limit: PAGE_SIZE, page: 1 } },
        );
        const total = first?.meta?.total ?? first?.data?.length ?? 0;
        const totalPages = Math.ceil(total / PAGE_SIZE);
        if (totalPages <= 1) return first ?? { data: [], meta: { total: 0 } };

        const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
                $fetch<{ data: Record<string, any>[] }>(url.value, {
                    baseURL,
                    query: { limit: PAGE_SIZE, page: i + 2 },
                }).then(r => r?.data ?? []),
            ),
        );

        return { data: [...first.data, ...rest.flat()], meta: { total } };
    }

    const { data, pending, error } = useAsyncData<{ data: Record<string, any>[]; meta: { total: number } }>(
        key.value,
        fetchAll,
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
    schemaName: string | null;
}

const VALID_ACTIVITY_TYPES = new Set(['document', 'verification', 'registry', 'monitoring', 'credit']);

function mapActivityEvent(raw: Record<string, unknown>): ActivityEvent {
    const type = typeof raw.type === 'string' && VALID_ACTIVITY_TYPES.has(raw.type)
        ? raw.type
        : 'document';
    return {
        date: typeof raw.date === 'string' ? raw.date : '',
        action: typeof raw.action === 'string' ? raw.action : 'Activity recorded',
        type,
        schemaName: typeof raw.schemaName === 'string' ? raw.schemaName : null,
    };
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
                const raw = await $fetch<Record<string, unknown>[]>(url.value, { baseURL });
                return Array.isArray(raw) ? raw.map(mapActivityEvent) : [];
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
