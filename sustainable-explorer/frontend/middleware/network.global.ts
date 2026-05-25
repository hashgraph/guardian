export default defineNuxtRouteMiddleware((to) => {
    const network = useState('selected-network', () => 'mainnet');

    const q = to.query.network as string;
    if (q === 'mainnet' || q === 'testnet') {
        network.value = q;
    } else {
        return navigateTo(
            {
                path: to.path,
                query: { ...to.query, network: network.value },
                hash: to.hash,
            },
            { replace: true },
        );
    }
});
