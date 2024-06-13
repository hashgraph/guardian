/**
 * Environment class
 */
export class Environment {
    /**
     * Mainnet API
     */
    public static readonly HEDERA_MAINNET_API: string = 'https://mainnet-public.mirrornode.hedera.com/api/v1/';
    /**
     * Testnet API
     */
    public static readonly HEDERA_TESTNET_API: string = 'https://testnet.mirrornode.hedera.com/api/v1/';
    /**
     * Previewnet API
     */
    public static readonly HEDERA_PREVIEW_API: string = 'https://Previewnet.mirrornode.hedera.com/api/v1/';
    /**
     * Localnode message API
     */
    public static HEDERA_LOCALNODE_API: string = `https://localhost:5551/api/v1/`;

    /**
     * Network
     * @private
     */
    private static _network: string = 'testnet';
    /**
     * API
     * @private
     */
    private static _api: string = Environment.HEDERA_TESTNET_API;

    /**
     * Localnode protocol
     */
    private static _localnodeprotocol: string = 'http';

    /**
     * LocalNode Address
     */
    private static _localnodeaddress = 'localhost';

    /**
     * Initialization topic ID
     */
    private static _rootTopicId = '';

    /**
     * Set network
     * @param network
     */
    public static setNetwork(network: string) {
        switch (network) {
            case 'mainnet':
                Environment._network = 'mainnet';
                Environment._api = Environment.HEDERA_MAINNET_API;
                break;

            case 'testnet':
                Environment._network = 'testnet';
                Environment._api = Environment.HEDERA_TESTNET_API;
                break;

            case 'previewnet':
                Environment._network = 'previewnet';
                Environment._api = Environment.HEDERA_PREVIEW_API;
                break;

            case 'localnode':
                Environment._network = 'localnode';
                Environment._api = Environment.HEDERA_LOCALNODE_API;
                break;

            default:
                throw new Error(`Unknown network: ${network}`)
        }
    }

    /**
     * Set hedera mirror node address
     * @param protocol
     * @param address
     */
    public static setLocalNodeAddress(protocol: string, address: string) {
        Environment._localnodeaddress = address || 'localhost';
        Environment._localnodeprotocol = protocol;
        Environment.HEDERA_LOCALNODE_API = `${Environment._localnodeprotocol}://${Environment._localnodeaddress}:5551/api/v1/`;
        Environment.setNetwork(Environment._network);
    }

    /**
     * Set hedera mirror node address
     * @param topicId
     */
    public static setRootTopicId(topicId: string) {
        Environment._rootTopicId = topicId;
    }

    /**
     * Network
     */
    public static get network(): string {
        return Environment._network;
    }

    /**
     * Network
     */
    public static get localNodeAddress(): string {
        return Environment._localnodeaddress;
    }

    /**
     * Network
     */
    public static get localNodeProtocol(): string {
        return Environment._localnodeprotocol;
    }

    /**
     * Mirror node API
     */
    public static get mirrorNode(): string {
        return Environment._api;
    }

    /**
     * Initialization topic ID
     */
    public static get rootTopicId(): string {
        return Environment._rootTopicId;
    }
}
