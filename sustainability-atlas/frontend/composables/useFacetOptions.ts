/**
 * Distinct registry / methodology names for filter dropdowns.
 *
 * Backed by the `/registries/options` and `/methodologies/options` endpoints,
 * which return just the name list — no pagination, no row payload.
 *
 * `enabled` defers the fetch until the consumer actually needs the options
 * (e.g. a modal being opened).
 */
export function useFacetOptions(enabled?: Ref<boolean>) {
    const { network } = useNetwork();
    const config = useRuntimeConfig();
    const baseURL = import.meta.server
        ? (config.apiBaseUrl as string)
        : (config.public.apiBaseUrl as string);

    const registries = ref<string[]>([]);
    const methodologies = ref<string[]>([]);

    async function load() {
        if (enabled && !enabled.value) return;
        const [regs, meths] = await Promise.all([
            $fetch<string[]>(`/api/v1/${network.value}/registries/options`, { baseURL }).catch(() => []),
            $fetch<string[]>(`/api/v1/${network.value}/methodologies/options`, { baseURL }).catch(() => []),
        ]);
        registries.value = regs ?? [];
        methodologies.value = meths ?? [];
    }

    if (import.meta.client) {
        watch(
            enabled ? [network, enabled] : [network],
            () => { void load(); },
            { immediate: true },
        );
    }

    return { registries, methodologies, reload: load };
}
