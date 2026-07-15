import type { NetworkId } from '~/composables/useNetwork';
import type {
    ExportDataset,
    ExportHistoryQueryParams,
    ExportHistoryResponse,
    ExportQueryParams,
} from '~/types/reports';

/** Exports API: paginated own export audit-history + authenticated fetch+Blob file download. */

const emptyExportHistoryResponse = (limit: number): ExportHistoryResponse => ({
    data: [],
    meta: { page: 1, limit, total: 0, totalPages: 1 },
});

/** Request-param keys forwarded verbatim to the download endpoint; `format`/`fields`/`dataset` are handled separately below. */
const EXPORT_FILTER_KEYS: (keyof ExportQueryParams)[] = [
    'type',
    'registry',
    'registryDid',
    'tokenId',
    'projectKey',
    'methodologyId',
    'name',
    'country',
    'methodology',
    'developer',
    'vintage',
    'status',
    'policyTopicId',
    'instanceTopicId',
    'id',
    'description',
    'decodeStatus',
    'displayName',
    'did',
    'tags',
    'geography',
    'law',
    'hideEmpty',
    'createdAtFrom',
    'createdAtTo',
];

function filenameFromContentDisposition(header: string | null): string | null {
    if (!header) return null;
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
    return match ? decodeURIComponent(match[1]) : null;
}

function buildQueryString(query: Record<string, string | number | boolean | string[] | undefined>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue;
        if (Array.isArray(value)) {
            if (value.length) parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.join('|'))}`);
        } else {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        }
    }
    return parts.join('&');
}

export const useExportsApi = () => {
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

    /** GET /api/v1/:network/exports — paginated, read-only history of the current user's own exports (newest first). */
    async function listRecent(
        params: ExportHistoryQueryParams = {},
        net: NetworkId | string = network.value,
    ): Promise<ExportHistoryResponse> {
        const limit = params.limit ?? 10;
        const query: Record<string, string | number> = {
            page: params.page ?? 1,
            limit,
        };

        try {
            const res = await apiFetch<ExportHistoryResponse>(`/api/v1/${net}/exports`, {
                baseURL: baseURL(),
                credentials: 'include',
                headers: ssrCookieHeader(),
                query,
            });
            return res ?? emptyExportHistoryResponse(limit);
        } catch (err) {
            console.error('[useExportsApi] listRecent failed:', err);
            return emptyExportHistoryResponse(limit);
        }
    }

    /** GET /api/v1/:network/exports/:dataset — generates and downloads a filtered dataset export; returns true on success, false on failure (shows an error toast). */
    async function downloadExport(
        dataset: ExportDataset,
        params: ExportQueryParams,
        net: NetworkId | string = network.value,
    ): Promise<boolean> {
        const query: Record<string, string | number | boolean | string[] | undefined> = {
            format: params.format,
        };
        if (params.fields?.length) query.fields = params.fields;
        for (const key of EXPORT_FILTER_KEYS) {
            const raw = params[key];
            if (raw === undefined || raw === null || raw === '') continue;
            query[key] = raw as string | number | boolean | string[];
        }

        const fallbackFilename = `${dataset}-export.${params.format}`;
        return downloadFile(`${baseURL()}/api/v1/${net}/exports/${dataset}`, query, fallbackFilename);
    }

    /** Shared authenticated fetch+Blob download core (client-only): fetch with credentials, error toast on failure, Blob save on success. */
    async function downloadFile(
        url: string,
        query: Record<string, string | number | boolean | string[] | undefined>,
        fallbackFilename: string,
    ): Promise<boolean> {
        if (!import.meta.client) return false;
        const { toast } = await import('vue-sonner');
        try {
            const qs = buildQueryString(query);
            const res = await fetch(qs ? `${url}?${qs}` : url, { credentials: 'include' });
            if (!res.ok) {
                let message =
                    res.status === 401
                        ? 'You must be signed in to download this export.'
                        : res.status === 400
                          ? 'Invalid export request.'
                          : res.status === 404
                            ? 'This export could not be found.'
                            : 'Failed to generate the export. Please try again.';
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
            const filename = filenameFromContentDisposition(res.headers.get('content-disposition')) ?? fallbackFilename;
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
            console.error('[useExportsApi] download failed:', err);
            toast.error('Failed to download the export. Please try again.');
            return false;
        }
    }

    return { listRecent, downloadExport };
};
