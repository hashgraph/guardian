import type { NetworkId } from '~/composables/useNetwork';
import type { ImpactSummary, ImpactSummaryDocumentFormat } from '~/types/reports';

/** Impact Summary API: JSON aggregate fetch + authenticated document download. */

function filenameFromContentDisposition(header: string | null): string | null {
    if (!header) return null;
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
    return match ? decodeURIComponent(match[1]) : null;
}

export const useImpactSummaryApi = () => {
    const config = useRuntimeConfig();
    const { apiFetch } = useApiFetch();
    const { network } = useNetwork();

    const baseURL = (): string =>
        import.meta.server ? (config.apiBaseUrl as string) : (config.public.apiBaseUrl as string);

    const ssrCookieHeader = (): Record<string, string> => {
        if (!import.meta.server) return {};
        const cookie = useRequestHeaders(['cookie']).cookie;
        return cookie ? { cookie } : {};
    };

    /** GET /api/v1/:network/impact-summary — combined aggregate (credits, retirements, SDGs, geography, sectors, registries); SSR-fetched via useAsyncData and re-fetched on network switch. */
    function fetchSummary() {
        const key = computed(() => `impact-summary:${network.value}`);

        return useAsyncData<ImpactSummary | null>(
            key.value,
            async () => {
                try {
                    const res = await apiFetch<ImpactSummary>(`/api/v1/${network.value}/impact-summary`, {
                        baseURL: baseURL(),
                        credentials: 'include',
                        headers: ssrCookieHeader(),
                    });
                    return res ?? null;
                } catch (err) {
                    console.error('[useImpactSummaryApi] fetchSummary failed:', err);
                    return null;
                }
            },
            {
                default: () => null,
                watch: [network],
            },
        );
    }

    /** GET /api/v1/:network/impact-summary/export?format= — generates and downloads the Impact Summary document (PDF is a curated report; CSV/XLSX include full underlying datasets). Returns true on success, false on failure (shows an error toast). */
    async function generateDocument(
        format: ImpactSummaryDocumentFormat,
        net: NetworkId | string = network.value,
    ): Promise<boolean> {
        if (!import.meta.client) return false;
        const { toast } = await import('vue-sonner');
        try {
            const res = await fetch(`${baseURL()}/api/v1/${net}/impact-summary/export?format=${encodeURIComponent(format)}`, {
                credentials: 'include',
            });
            if (!res.ok) {
                let message =
                    res.status === 401
                        ? 'You must be signed in to generate the Impact Summary.'
                        : res.status === 400
                          ? 'Invalid Impact Summary request.'
                          : res.status === 404
                            ? 'The Impact Summary export endpoint is not available yet.'
                            : 'Failed to generate the Impact Summary. Please try again.';
                try {
                    const body = await res.json();
                    if (body?.message) {
                        message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
                    }
                } catch {
                    // response body wasn't JSON — keep the status-based fallback message
                }
                toast.error(message);
                return false;
            }
            const filename = filenameFromContentDisposition(res.headers.get('content-disposition')) ?? `impact-summary.${format}`;
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(objectUrl);
            return true;
        } catch (err) {
            console.error('[useImpactSummaryApi] generateDocument failed:', err);
            toast.error('Failed to generate the Impact Summary. Please try again.');
            return false;
        }
    }

    return { fetchSummary, generateDocument };
};
