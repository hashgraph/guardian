const reverseCache = new Map<string, { name: string; code: string }>();
const centerCache = new Map<string, { lat: number; lng: number }>();

function getUrls() {
    const config = useRuntimeConfig();
    return {
        reverseUrl: config.public.geocoderUrl as string,
        searchUrl: config.public.geocoderSearchUrl as string,
    };
}

export async function nominatimReverse(
    lat: number,
    lng: number,
    alpha3: (name: string) => string,
): Promise<{ name: string; code: string } | null> {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (reverseCache.has(key)) return reverseCache.get(key)!;
    try {
        const { reverseUrl } = getUrls();
        const res = await $fetch<any>(reverseUrl, {
            params: { lat, lon: lng, format: 'json', zoom: 3 },
            headers: { 'Accept-Language': 'en' },
        });
        const name: string = res?.address?.country ?? '';
        const code = alpha3(name);
        if (code !== 'UNK') {
            const result = { name, code };
            reverseCache.set(key, result);
            return result;
        }
    } catch { /* ignore */ }
    return null;
}

export async function nominatimCountryCenter(
    country: string,
): Promise<{ lat: number; lng: number } | null> {
    if (centerCache.has(country)) return centerCache.get(country)!;
    try {
        const { searchUrl } = getUrls();
        const results = await $fetch<Array<{ lat: string; lon: string }>>(searchUrl, {
            params: { country, format: 'json', limit: 1, featuretype: 'country' },
            headers: { 'Accept-Language': 'en' },
        });
        if (results?.length) {
            const coords = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
            centerCache.set(country, coords);
            return coords;
        }
    } catch { /* ignore */ }
    return null;
}
