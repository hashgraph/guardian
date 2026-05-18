import { AccountId, Client } from '@hiero-ledger/sdk';
import { ensurePrefix, stripPrefix } from '../helpers/utils.js';

/**
 * Environment class
 */
export class Environment {
    /**
     * Mainnet API
     */
    private static HEDERA_MAINNET_API: string = 'https://mainnet.mirrornode.hedera.com/api/v1';

    /**
     * Testnet API
     */
    private static readonly HEDERA_TESTNET_API: string = 'https://testnet.mirrornode.hedera.com/api/v1';

    /**
     * Preview API
     */
    private static readonly HEDERA_PREVIEW_API: string = 'https://preview.mirrornode.hedera.com/api/v1';

    /**
     * Localnode API
     */
    private static HEDERA_LOCALNODE_API: string = `http://localhost:5551/api/v1`;

    /**
     * Network
     * @private
     */
    private static _network: string = 'testnet';

    /**
     * Localnode protocol
     * @private
     */
    private static _localnodeprotocol: string = 'http'

    /**
     * Localnode address
     */
    private static _localnodeaddress = 'localhost'

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
     * Hedera mirror nodes base api
     * @private
     */
    private static _mirrorNodesBaseApi: string = '/api/v1';

    /**
     * API
     * @private
     */
    private static _api: string = Environment.HEDERA_TESTNET_API;

    /**
     * Messages API
     * @private
     */
    private static _messagesApi: string = Environment._api + '/topics/messages';

    /**
     * Topics API
     * @private
     */
    private static _topicsApi: string = Environment._api + '/topics';

    /**
     * Accounts API
     * @private
     */
    private static _accountsApi: string = Environment._api + '/accounts';

    /**
     * Balances API
     * @private
     */
    private static _balancesApi: string = Environment._api + '/balances';

    /**
     * Contracts API
     * @private
     */
    private static _contractsApi: string = Environment._api + '/contracts';

    /**
     * Tokens API
     * @private
     */
    private static _tokensApi: string = Environment._api + '/tokens';

    /**
     * Transactions API
     * @private
     */
    private static _transactionsApi: string = Environment._api + '/transactions';

    /**
     * Set network
     * @param network
     */
    public static setNetwork(network: string) {
        switch (network) {
            case 'mainnet':
                Environment._network = network;
                Environment._api = Environment.HEDERA_MAINNET_API;
                break;

            case 'testnet':
                Environment._network = network;
                Environment._api = Environment.HEDERA_TESTNET_API;
                break;

            case 'previewnet':
                Environment._network = network;
                Environment._api = Environment.HEDERA_PREVIEW_API;
                break;

            case 'localnode':
                Environment._network = network;
                Environment._api = Environment.HEDERA_LOCALNODE_API;
                break;

            default:
                throw new Error(`Unknown network: ${network}`)
        }

        if (Environment._mirrorNodes && Environment._mirrorNodes.length > 0) {
            const mirrornodeUrl = ensurePrefix(Environment._mirrorNodes[0], ['http://', 'https://'], 'https://');
            Environment._api = `${mirrornodeUrl}${Environment._mirrorNodesBaseApi}`;
        }

        Environment._messagesApi = Environment._api + '/topics/messages';
        Environment._topicsApi = Environment._api + '/topics';
        Environment._accountsApi = Environment._api + '/accounts';
        Environment._balancesApi = Environment._api + '/balances';
        Environment._contractsApi = Environment._api + '/contracts';
        Environment._tokensApi = Environment._api + '/tokens';
        Environment._transactionsApi = Environment._api + '/transactions';
    }

    /**
     * Set mainnet address
     */
    public static setMainnetApiUrl(apiUrl: string) {
        Environment.HEDERA_MAINNET_API = apiUrl;
        Environment.setNetwork(Environment._network);
    }

    /**
     * Set localnode address
     */
    public static setLocalNodeAddress(address: string) {
        Environment._localnodeaddress = address || 'localhost';
        Environment.HEDERA_LOCALNODE_API = `${Environment._localnodeprotocol}://${Environment._localnodeaddress}:5551/api/v1`;
        Environment.setNetwork(Environment._network);
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
     * Set hedera mirror nodes base api
     * @param baseApi Base api
     */
    public static setMirrorNodesBaseApi(baseApi: string = '') {
        let api = baseApi;

        if (api.length > 0 && !api.startsWith('/')) {
            api = '/' + api;
        }

        if (api.endsWith('/') && api.length > 1) {
            api = api.slice(0, -1);
        }

        Environment._mirrorNodesBaseApi = api;
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
                client = Client.forTestnet();
                break;
            case 'previewnet':
                client = Client.forPreviewnet();
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
            const mirrornodeUrls = Environment._mirrorNodes.map(node => stripPrefix(node, ['http://', 'https://']));
            client.setMirrorNetwork(mirrornodeUrls);
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

    /**
     * Hedera balances API
     * @constructor
     */
    public static get HEDERA_BALANCES_API(): string {
        return Environment._balancesApi;
    }

    /**
     * Hedera contract API
     * @constructor
     */
    public static get HEDERA_CONTRACT_API(): string {
        return Environment._contractsApi;
    }

    /**
     * Hedera tokens API
     * @constructor
     */
    public static get HEDERA_TOKENS_API(): string {
        return Environment._tokensApi;
    }

    /**
     * Hedera transactions API
     * @constructor
     */
    public static get HEDERA_TRANSACTIONS_API(): string {
        return Environment._transactionsApi;
    }

    /**
     * Localnode address
     */
    public static get localNodeAddress(): string {
        return Environment._localnodeaddress;
    }

    /**
     * Localnode protocol
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
     * Mirror nodes base api
     */
    public static get mirrorNodesBaseApi(): string {
        return Environment._mirrorNodesBaseApi;
    }
}