export type NetworkId = 'mainnet' | 'testnet';

export interface NetworkOption {
    id: NetworkId;
    label: string;
    dotColor: string;
}

export const networkOptions: NetworkOption[] = [
    { id: 'mainnet', label: 'Hedera Mainnet', dotColor: 'bg-green-500' },
    { id: 'testnet', label: 'Hedera Testnet', dotColor: 'bg-yellow-500' },
];

export const useNetwork = () => {
    const network = useState<NetworkId>('selected-network', () => 'mainnet');
    const router = useRouter();
    const route = useRoute();

    const currentNetwork = computed(() =>
        networkOptions.find((n) => n.id === network.value)!,
    );

    const displayLabel = computed(() => currentNetwork.value.label);

    const setNetwork = (id: NetworkId) => {
        network.value = id;
        router.replace({ query: { ...route.query, network: id } });
    };

    return {
        network,
        currentNetwork,
        displayLabel,
        setNetwork,
    };
};
