/** Hard ceiling on rows a table CSV export downloads directly; matches the Reports/Export Data and Impact Summary caps so the "download more via the API" messaging is consistent everywhere. */
export const EXPORT_ROW_CAP = 1000;

/** Page size used while filling the capped export — small parallel batches instead of one huge page, per the "fetch 100 at a time, combined" requirement. */
const BATCH_SIZE = 100;

export function useApiDownload() {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    /**
     * Fetches up to EXPORT_ROW_CAP matching rows in parallel batches of
     * BATCH_SIZE, returning the (possibly capped) rows plus the true total
     * match count so the caller can warn the user when more rows exist than
     * were downloaded.
     */
    async function fetchCappedRows<T extends { data: any[]; meta?: Record<string, any> }>(
        endpoint: string,
        query: Record<string, string | number | boolean> = {},
    ): Promise<{ data: any[]; total: number; capped: boolean }> {
        const baseQuery = { ...query, limit: BATCH_SIZE };

        const first = await $fetch<T>(endpoint, { baseURL, query: { ...baseQuery, page: 1 } });
        const meta = first?.meta ?? {};
        const total: number = meta['total'] ?? (first?.data?.length ?? 0);

        let allData: any[] = [...(first?.data ?? [])];

        const rowsToFetch = Math.min(total, EXPORT_ROW_CAP);
        const pagesNeeded = Math.ceil(rowsToFetch / BATCH_SIZE);

        if (pagesNeeded > 1) {
            const rest = await Promise.all(
                Array.from({ length: pagesNeeded - 1 }, (_, i) =>
                    $fetch<T>(endpoint, { baseURL, query: { ...baseQuery, page: i + 2 } })
                        .then(r => r?.data ?? []),
                ),
            );
            allData = [...allData, ...rest.flat()];
        }

        allData = allData.slice(0, EXPORT_ROW_CAP);

        return { data: allData, total, capped: total > EXPORT_ROW_CAP };
    }

    return { fetchCappedRows };
}
