import { MOCK_PROJECTS, MOCK_CREDITS } from '~/data';
import type { Registry } from '~/types/models';
import { formatCredits } from '~/lib/format';

export function useRegistries(filters?: Ref<{ status?: string; network?: string; search?: string }>) {
    const registries = computed<Registry[]>(() => {
        // Group projects by registry
        const registryMap: Record<string, { projects: number; credits: number; methodologies: Set<string> }> = {};
        for (const p of MOCK_PROJECTS) {
            if (!registryMap[p.registry]) {
                registryMap[p.registry] = { projects: 0, credits: 0, methodologies: new Set() };
            }
            registryMap[p.registry].projects++;
            registryMap[p.registry].credits += p.credits;
            registryMap[p.registry].methodologies.add(p.methodologyId);
        }

        // Sum credit supply by registry
        const creditsByRegistry: Record<string, number> = {};
        for (const c of MOCK_CREDITS) {
            creditsByRegistry[c.registry] = (creditsByRegistry[c.registry] || 0) + c.supply;
        }

        // Known registries with their meta — derived from project data + pseudo details
        const knownRegistries: Record<string, { fullName: string; did: string; status: 'Active' | 'Inactive'; network: 'Mainnet' | 'Testnet'; userMultiplier: number; geography: string; law: string; tags: string; createdAt: string }> = {
            'Verra': { fullName: 'Verra (VCS)', did: 'did:hedera:testnet:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK', status: 'Active', network: 'Mainnet', userMultiplier: 3, geography: 'Global', law: 'USA', tags: 'VCS, REDD+, Agriculture', createdAt: '2007-11-19' },
            'Gold Standard': { fullName: 'Gold Standard', did: 'did:hedera:testnet:z6MkrHKR1DXg7k7Y2fh9H8VSrGaJ5YFhUMb25RkGqFMNS7eR', status: 'Active', network: 'Mainnet', userMultiplier: 2.9, geography: 'Global', law: 'Switzerland', tags: 'Energy, Water, Health', createdAt: '2003-05-15' },
            'CAR': { fullName: 'Climate Action Reserve', did: 'did:hedera:testnet:z6MkvTZ4dXB3k9F2dMzQpJHN4T4H8nD8cEaJ7sRQV2yjKLR9', status: 'Active', network: 'Mainnet', userMultiplier: 2.3, geography: 'North America', law: 'USA', tags: 'Forestry, Waste, Methane', createdAt: '2001-09-10' },
            'ACR': { fullName: 'American Carbon Registry', did: 'did:hedera:testnet:z6MknUfJGzFR5wZhJnYpSL2X9m4RqPCMTvk9J7WZd8KxFJSm', status: 'Active', network: 'Mainnet', userMultiplier: 2.1, geography: 'USA', law: 'USA', tags: 'Forestry, Wetlands', createdAt: '1996-03-20' },
        };

        let result: Registry[] = [];

        // Build registries purely from project data
        let idx = 1;
        for (const [name, data] of Object.entries(registryMap)) {
            const meta = knownRegistries[name];
            const users = Math.round(data.projects * (meta?.userMultiplier ?? 2));
            const totalCredits = creditsByRegistry[name] || 0;

            result.push({
                id: String(idx++),
                name: meta?.fullName ?? name,
                did: meta?.did ?? `did:hedera:testnet:z6Mk${name.replace(/\s/g, '')}`,
                policies: data.methodologies.size,
                projects: data.projects,
                users,
                credits: formatCredits(totalCredits),
                status: meta?.status ?? 'Active',
                network: meta?.network ?? 'Testnet',
                geography: meta?.geography ?? null,
                website: null,
                law: meta?.law ?? null,
                tags: meta?.tags ?? null,
                createdAt: meta?.createdAt ?? null,
            });
        }

        // Apply filters
        if (filters?.value) {
            const f = filters.value;
            if (f.status) result = result.filter(r => r.status === f.status);
            if (f.network) result = result.filter(r => r.network === f.network);
            if (f.search) {
                const q = f.search.toLowerCase();
                result = result.filter(r =>
                    r.name.toLowerCase().includes(q) ||
                    r.did.toLowerCase().includes(q) ||
                    r.network.toLowerCase().includes(q),
                );
            }
        }

        return result;
    });

    const total = computed(() => registries.value.length);

    const filterOptions = computed(() => ({
        statuses: ['Active', 'Inactive'] as const,
        networks: ['Mainnet', 'Testnet'] as const,
    }));

    return { registries, total, filterOptions };
}
