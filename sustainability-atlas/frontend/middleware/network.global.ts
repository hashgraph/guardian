export default defineNuxtRouteMiddleware((to, from) => {
    const network = useState('selected-network', () => 'mainnet');

    const q = to.query.network as string;
    if (q === 'mainnet' || q === 'testnet') {
        network.value = q;
        return;
    }

    const isInitialLoad = import.meta.server || from.fullPath === to.fullPath;

    return navigateTo(
        {
            path: to.path,
            query: { ...to.query, network: network.value },
            hash: to.hash,
        },
        { replace: isInitialLoad },
    );
});
