import { VueQueryPlugin, QueryClient, dehydrate, hydrate } from '@tanstack/vue-query';

export default defineNuxtPlugin((nuxtApp) => {
    const state = useState<unknown>('vue-query');

    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                retry: 1,
                refetchOnWindowFocus: true,
            },
        },
    });

    nuxtApp.vueApp.use(VueQueryPlugin, { queryClient });

    if (import.meta.server) {
        nuxtApp.hooks.hook('app:rendered', () => {
            state.value = dehydrate(queryClient);
        });
    }

    if (import.meta.client) {
        nuxtApp.hooks.hook('app:created', () => {
            hydrate(queryClient, state.value);
        });
    }
});
