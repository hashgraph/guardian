import { COUNTRY_ALPHA3 } from '~/composables/useProjects';
import type { Project } from '~/types/models';

// Module-level cache — persists across page navigations within the session.
const cache = new Map<string, string>(); // projectId → alpha-3 code
const cacheRef = shallowRef(0); // bump to trigger reactive updates

let queueRunning = false;
const queue: Array<{ id: string; lat: number; lng: number }> = [];

async function drainQueue() {
    if (queueRunning) return;
    queueRunning = true;
    while (queue.length > 0) {
        const item = queue.shift()!;
        if (cache.has(item.id)) continue;
        try {
            const res = await $fetch<any>('https://nominatim.openstreetmap.org/reverse', {
                params: { lat: item.lat, lon: item.lng, format: 'json', zoom: 3 },
                headers: { 'Accept-Language': 'en' },
            });
            const name: string = res?.address?.country ?? '';
            const code = COUNTRY_ALPHA3[name] ?? 'UNK';
            if (code !== 'UNK') {
                cache.set(item.id, code);
                cacheRef.value++;
            }
        } catch { /* ignore */ }
        if (queue.length > 0) await new Promise(r => setTimeout(r, 1100));
    }
    queueRunning = false;
}

export function useGeocodedCountries(projects: Ref<Project[]>) {
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

    function resolvedCode(p: Project): string {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        cacheRef.value; // subscribe to cache updates
        return cache.get(p.id) ?? p.countryCode;
    }

    return { resolvedCode };
}
