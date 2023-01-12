import { AccountId, Client } from '@hashgraph/sdk';

/**
 * Environment class
 */
export class Environment {
    /**
     * Mainnet message API
     */
    public static readonly HEDERA_MAINNET_MESSAGE_API: string = 'https://mainnet-public.mirrornode.hedera.com/api/v1/topics/messages';
    /**
     * Mainnet topic API
     */
    public static readonly HEDERA_MAINNET_TOPIC_API: string = 'https://mainnet-public.mirrornode.hedera.com/api/v1/topics/';
    /**
     * Mainnet account API
     */
    public static readonly HEDERA_MAINNET_ACCOUNT_API: string = 'https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/';
    /**
     * Testnet message API
     */
    public static readonly HEDERA_TESTNET_MESSAGE_API: string = 'https://testnet.mirrornode.hedera.com/api/v1/topics/messages';
    /**
     * Testnet topic API
     */
    public static readonly HEDERA_TESTNET_TOPIC_API: string = 'https://testnet.mirrornode.hedera.com/api/v1/topics/';
    /**
     * Testnet account API
     */
    public static readonly HEDERA_TESTNET_ACCOUNT_API: string = 'https://testnet.mirrornode.hedera.com/api/v1/accounts/';
    /**
     * Preview message API
     */
    public static readonly HEDERA_PREVIEW_MESSAGE_API: string = 'https://preview.mirrornode.hedera.com/api/v1/topics/messages';
    /**
     * Preview topic API
     */
    public static readonly HEDERA_PREVIEW_TOPIC_API: string = 'https://preview.mirrornode.hedera.com/api/v1/topics/';
    /**
     * Preview account API
     */
    public static readonly HEDERA_PREVIEW_ACCOUNT_API: string = 'https://preview.mirrornode.hedera.com/api/v1/accounts/';
    /**
     * Localnode message API
     */
    public static HEDERA_LOCALNODE_MESSAGE_API: string = `https://localhost:5551/api/v1/topics/messages`;
    /**
     * Localnode topic API
     */
    public static HEDERA_LOCALNODE_TOPIC_API: string = `https://localhost:5551/api/v1/topics/`;
    /**
     * Localnode topic API
     */
    public static HEDERA_LOCALNODE_ACCOUNT_API: string = `https://localhost:5551/api/v1/accounts/`;
    /**
     * Localnode protocol
     */
    private static _localnodeprotocol: string = 'http'

    /**
     * Network
     * @private
     */
    private static _network: string = 'testnet';
    /**
     * LocalNode Address
     */
    private static _localnodeaddress = 'localhost'
    /**
     * Message API
     * @private
     */
    private static _messagesApi: string = Environment.HEDERA_TESTNET_MESSAGE_API;
    /**
     * Topic API
     * @private
     */
    private static _topicsApi: string = Environment.HEDERA_TESTNET_TOPIC_API;
    /**
     * Account API
     * @private
     */
    private static _accountsApi: string = Environment.HEDERA_TESTNET_ACCOUNT_API;

    /**
     * Set network
     * @param network
     * @param mirrornode
     */
    public static setNetwork(network: string, mirrornode?: string) {        
        switch (network) {
            case 'mainnet':
                Environment._network = 'mainnet';
                Environment._messagesApi = Environment.HEDERA_MAINNET_MESSAGE_API;
                Environment._topicsApi = Environment.HEDERA_MAINNET_TOPIC_API;
                Environment._accountsApi = Environment.HEDERA_MAINNET_ACCOUNT_API;
                break;

            case 'testnet':
                Environment._network = 'testnet';
                Environment._messagesApi = Environment.HEDERA_TESTNET_MESSAGE_API;
                Environment._topicsApi = Environment.HEDERA_TESTNET_TOPIC_API;
                Environment._accountsApi = Environment.HEDERA_TESTNET_ACCOUNT_API;
                break;

            case 'previewnet':
                Environment._network = 'previewnet';
                Environment._messagesApi = Environment.HEDERA_TESTNET_MESSAGE_API;
                Environment._topicsApi = Environment.HEDERA_TESTNET_TOPIC_API;
                Environment._accountsApi = Environment.HEDERA_TESTNET_ACCOUNT_API;
                break;

            case 'localnode':
                Environment._network = 'localnode';
                Environment._messagesApi = Environment.HEDERA_LOCALNODE_MESSAGE_API;
                Environment._topicsApi = Environment.HEDERA_LOCALNODE_TOPIC_API;
                Environment._accountsApi = Environment.HEDERA_LOCALNODE_ACCOUNT_API;
                break;

            default:
                throw new Error(`Unknown network: ${network}`)
        }

        if (mirrornode) {
            Environment._messagesApi = `${mirrornode}/api/v1/topics/messages`;
            Environment._topicsApi = `${mirrornode}/api/v1/topics/`;
            Environment._accountsApi = `${mirrornode}/api/v1/accounts/`;
        }
    }

    /**
     * Set localnode address
     */
    public static setLocalNodeAddress(address) {
        Environment._localnodeaddress = address || 'localhost';
        Environment.HEDERA_LOCALNODE_MESSAGE_API = `${Environment._localnodeprotocol}://${Environment._localnodeaddress}:5551/api/v1/topics/messages`;
        Environment.HEDERA_LOCALNODE_TOPIC_API = `${Environment._localnodeprotocol}://${Environment._localnodeaddress}:5551/api/v1/topics/`;
        Environment.HEDERA_LOCALNODE_ACCOUNT_API = `${Environment._localnodeprotocol}://${Environment._localnodeaddress}:5551/api/v1/accounts/`;
    }

    /**
     * Set localnode protocol
     */
    public static setLocalNodeProtocol(protocol: string) {
        Environment._localnodeprotocol = protocol;
    }

    /**
     * Create client
     */
    public static createClient(): Client {
        switch (Environment._network) {
            case 'mainnet':
                return Client.forMainnet();

            case 'testnet':
                return Client.forTestnet();

            case 'previewnet':
                return Client.forPreviewnet();

            case 'localnode':
                const node = {} as any;
                node[`${Environment._localnodeaddress}:50211`] = new AccountId(3)
                return Client.forNetwork(node).setMirrorNetwork(`${Environment._localnodeaddress}:5600`);

            default:
                throw new Error(`Unknown network: ${Environment._network}`)
        }
    }

    /**
     * Network
     */
    public static get network(): string {
        return Environment._network;
    }

    /**
     * Hedera message API
     * @constructor
     */
    public static get HEDERA_MESSAGE_API(): string {
        return Environment._messagesApi;
    }

    /**
     * Hedera topic API
     * @constructor
     */
    public static get HEDERA_TOPIC_API(): string {
        return Environment._topicsApi;
    }

    /**
     * Hedera account API
     * @constructor
     */
    public static get HEDERA_ACCOUNT_API(): string {
        return Environment._accountsApi;
    }
}

