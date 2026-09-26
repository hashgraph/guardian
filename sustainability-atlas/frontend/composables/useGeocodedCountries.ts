import { resolveCountryCode } from '~/composables/useProjects';
import { nominatimReverse } from '~/composables/useNominatim';

// Structural subset of `Project` — lets non-Project callers (e.g. the
// dashboard's per-point map data) reuse this recovery without reshaping
// their data into a full Project.
export interface GeocodableEntity {
    id: string;
    country: string;
    countryCode: string;
    lat: number;
    lng: number;
}

// Module-level cache — persists across page navigations within the session.
const cache = new Map<string, string>(); // projectId → alpha-3 code
const nameCache = new Map<string, string>(); // projectId → country name
const cacheRef = shallowRef(0); // bump to trigger reactive updates

let queueRunning = false;
const queue: Array<{ id: string; lat: number; lng: number }> = [];

async function drainQueue() {
    if (queueRunning) return;
    queueRunning = true;
    while (queue.length > 0) {
        const item = queue.shift()!;
        if (cache.has(item.id)) continue;
        const result = await nominatimReverse(item.lat, item.lng, n => resolveCountryCode(n));
        if (result) {
            cache.set(item.id, result.code);
            nameCache.set(item.id, result.name);
            cacheRef.value++;
        }
        if (queue.length > 0) await new Promise(r => setTimeout(r, 1100));
    }
    queueRunning = false;
}

export function useGeocodedCountries(projects: Ref<GeocodableEntity[]>) {
    watch(projects, (list) => {
        let added = false;
        for (const p of list) {
            if (p.countryCode !== 'UNK' || !p.lat || !p.lng) continue;
            if (cache.has(p.id)) continue;
            if (queue.some(q => q.id === p.id)) continue;
            queue.push({ id: p.id, lat: p.lat, lng: p.lng });
            added = true;
        }
        if (added) drainQueue();
    }, { immediate: true });

    function resolvedCode(p: GeocodableEntity): string {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        cacheRef.value; // subscribe to cache updates
        return cache.get(p.id) ?? p.countryCode;
    }

    function resolvedName(p: GeocodableEntity): string {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        cacheRef.value;
        return nameCache.get(p.id) ?? p.country;
    }

    return { resolvedCode, resolvedName };
}
