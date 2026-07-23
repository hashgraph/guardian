const PAGE_LIMIT = 1000;

export function useApiDownload() {
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    async function fetchAllPages<T extends { data: any[]; meta?: Record<string, any> }>(
        endpoint: string,
        query: Record<string, string | number | boolean> = {},
    ): Promise<any[]> {
        const baseQuery = { ...query, limit: PAGE_LIMIT };

        const first = await $fetch<T>(endpoint, { baseURL, query: { ...baseQuery, page: 1 } });
        const meta = first?.meta ?? {};
        const total: number = meta['total'] ?? (first?.data?.length ?? 0);
        const totalPages: number = meta['totalPages'] ?? (Math.ceil(total / PAGE_LIMIT) || 1);

        let allData: any[] = [...(first?.data ?? [])];

        if (totalPages > 1) {
            const rest = await Promise.all(
                Array.from({ length: totalPages - 1 }, (_, i) =>
                    $fetch<T>(endpoint, { baseURL, query: { ...baseQuery, page: i + 2 } })
                        .then(r => r?.data ?? []),
                ),
            );
            allData = [...allData, ...rest.flat()];
        }

        return allData;
    }

    return { fetchAllPages };
}
