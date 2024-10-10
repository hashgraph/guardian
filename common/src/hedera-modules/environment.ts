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
     * Testnet message API
     */
    public static readonly HEDERA_TESTNET_MESSAGE_API: string = 'https://testnet.mirrornode.hedera.com/api/v1/topics/messages';
    /**
     * Testnet topic API
     */
    public static readonly HEDERA_TESTNET_TOPIC_API: string = 'https://testnet.mirrornode.hedera.com/api/v1/topics/';
    /**
     * Previewnet message API
     */
    public static readonly HEDERA_PREVIEW_MESSAGE_API: string = 'https://Previewnet.mirrornode.hedera.com/api/v1/topics/messages';
    /**
     * Previewnet topic API
     */
    public static readonly HEDERA_PREVIEW_TOPIC_API: string = 'https://Previewnet.mirrornode.hedera.com/api/v1/topics/';
    /**
     * Localnode message API
     */
    public static HEDERA_LOCALNODE_MESSAGE_API: string = `https://localhost:5551/api/v1/topics/messages`;
    /**
     * Localnode topic API
     */
    public static HEDERA_LOCALNODE_TOPIC_API: string = `https://localhost:5551/api/v1/topics/`;
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
     * Hedera nodes
     * @private
     */
    private static _nodes: any = {};

    /**
     * Hedera mirror nodes
     * @private
     */
    private static _mirrorNodes: string[] = [];

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
                break;

            case 'testnet':
                Environment._network = 'testnet';
                Environment._messagesApi = Environment.HEDERA_TESTNET_MESSAGE_API;
                Environment._topicsApi = Environment.HEDERA_TESTNET_TOPIC_API;
                break;

            case 'previewnet':
                Environment._network = 'previewnet';
                Environment._messagesApi = Environment.HEDERA_PREVIEW_MESSAGE_API;
                Environment._topicsApi = Environment.HEDERA_PREVIEW_TOPIC_API;
                break;

            case 'localnode':
                Environment._network = 'localnode';
                Environment._messagesApi = Environment.HEDERA_LOCALNODE_MESSAGE_API;
                Environment._topicsApi = Environment.HEDERA_LOCALNODE_TOPIC_API;
                break;

            default:
                throw new Error(`Unknown network: ${network}`)
        }

        if (mirrornode) {
            Environment._messagesApi = `${mirrornode}/api/v1/topics/messages`;
            Environment._topicsApi = `${mirrornode}/api/v1/topics/`;
        }
    }

    /**
     * Set localnode address
     */
    public static setLocalNodeAddress(address) {
        Environment._localnodeaddress = address || 'localhost';
        Environment.HEDERA_LOCALNODE_MESSAGE_API = `${Environment._localnodeprotocol}://${Environment._localnodeaddress}:5551/api/v1/topics/messages`;
        Environment.HEDERA_LOCALNODE_TOPIC_API = `${Environment._localnodeprotocol}://${Environment._localnodeaddress}:5551/api/v1/topics/`;
    }

    /**
     * Set localnode protocol
     */
    public static setLocalNodeProtocol(protocol: string) {
        Environment._localnodeprotocol = protocol;
    }

    /**
     * Set hedera nodes
     * @param nodes Hedera nodes
     */
    public static setNodes(nodes: any) {
        Environment._nodes = nodes;
    }

    /**
     * Set hedera mirror nodes
     * @param mirrorNodes Hedera mirror nodes
     */
    public static setMirrorNodes(mirrorNodes: string[]) {
        Environment._mirrorNodes = mirrorNodes;
    }

    /**
     * Create client
     */
    public static createClient(): Client {
        let client: Client;

        switch (Environment._network) {
            case 'mainnet':
                client = Client.forMainnet();
                break;
            case 'testnet':
                client =  Client.forTestnet();
                break;
            case 'previewnet':
                client =  Client.forPreviewnet();
                break;
            case 'localnode':
                const node = {} as any;
                node[`${Environment._localnodeaddress}:50211`] = new AccountId(3)
                client = Client.forNetwork(node).setMirrorNetwork(`${Environment._localnodeaddress}:5600`);
                break;
            default:
                throw new Error(`Unknown network: ${Environment._network}`)
        }

        if (Environment._nodes && Object.keys(Environment._nodes).length) {
            client.setNetwork(Environment._nodes);
        }
        if (Environment._mirrorNodes?.length) {
            client.setMirrorNetwork(Environment._mirrorNodes);
        }

        return client;
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
     * Nodes
     */
    public static get nodes(): any {
        return Environment._nodes;
    }

    /**
     * Mirror nodes
     */
    public static get mirrorNodes(): string[] {
        return Environment._mirrorNodes;
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
}
