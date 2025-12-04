import { AccountId, Client } from '@hashgraph/sdk';

/**
 * Environment class
 */
export class Environment {
    /**
     * Mainnet API
     */
    public static readonly HEDERA_MAINNET_API: string = 'https://mainnet-public.mirrornode.hedera.com/api/v1';
    /**
     * Mainnet message API
     */
    public static readonly HEDERA_MAINNET_MESSAGE_API: string = Environment.HEDERA_MAINNET_API + '/topics/messages';
    /**
     * Mainnet topic API
     */
    public static readonly HEDERA_MAINNET_TOPIC_API: string = Environment.HEDERA_MAINNET_API + '/topics/';
    /**
     * Mainnet account API
     */
    public static readonly HEDERA_MAINNET_ACCOUNT_API: string = Environment.HEDERA_MAINNET_API + '/accounts/';
    /**
     * Mainnet balances API
     */
    public static readonly HEDERA_MAINNET_BALANCES_API: string = Environment.HEDERA_MAINNET_API + '/balances';
    /**
     * Mainnet contract API
     */
    public static readonly HEDERA_MAINNET_CONTRACT_API: string = Environment.HEDERA_MAINNET_API + '/contracts/';
    /**
     * Mainnet tokens API
     */
    public static readonly HEDERA_MAINNET_TOKENS_API: string = Environment.HEDERA_MAINNET_API + '/tokens';
    /**
     * Mainnet tokens API
     */
    public static readonly HEDERA_MAINNET_TRANSACTIONS_API: string = Environment.HEDERA_MAINNET_API + '/transactions';

    /**
     * Testnet API
     */
    public static readonly HEDERA_TESTNET_API: string = 'https://testnet.mirrornode.hedera.com/api/v1';
    /**
     * Testnet message API
     */
    public static readonly HEDERA_TESTNET_MESSAGE_API: string = Environment.HEDERA_TESTNET_API + '/topics/messages';
    /**
     * Testnet topic API
     */
    public static readonly HEDERA_TESTNET_TOPIC_API: string = Environment.HEDERA_TESTNET_API + '/topics/';
    /**
     * Testnet account API
     */
    public static readonly HEDERA_TESTNET_ACCOUNT_API: string = Environment.HEDERA_TESTNET_API + '/accounts/';
    /**
     * Testnet balances API
     */
    public static readonly HEDERA_TESTNET_BALANCES_API: string = Environment.HEDERA_TESTNET_API + '/balances';
    /**
     * Testnet contract API
     */
    public static readonly HEDERA_TESTNET_CONTRACT_API: string = Environment.HEDERA_TESTNET_API + '/contracts/';
    /**
     * Testnet tokens API
     */
    public static readonly HEDERA_TESTNET_TOKENS_API: string = Environment.HEDERA_TESTNET_API + '/tokens';
    /**
     * Testnet tokens API
     */
    public static readonly HEDERA_TESTNET_TRANSACTIONS_API: string = Environment.HEDERA_TESTNET_API + '/transactions';

    /**
     * Preview API
     */
    public static readonly HEDERA_PREVIEW_API: string = 'https://preview.mirrornode.hedera.com/api/v1';
    /**
     * Preview message API
     */
    public static readonly HEDERA_PREVIEW_MESSAGE_API: string = Environment.HEDERA_PREVIEW_API + '/topics/messages';
    /**
     * Preview topic API
     */
    public static readonly HEDERA_PREVIEW_TOPIC_API: string = Environment.HEDERA_PREVIEW_API + '/topics/';
    /**
     * Preview account API
     */
    public static readonly HEDERA_PREVIEW_ACCOUNT_API: string = Environment.HEDERA_PREVIEW_API + '/accounts/';
    /**
     * Preview balances API
     */
    public static readonly HEDERA_PREVIEW_BALANCES_API: string = Environment.HEDERA_PREVIEW_API + '/balances';
    /**
     * Preview contract API
     */
    public static readonly HEDERA_PREVIEW_CONTRACT_API: string = Environment.HEDERA_PREVIEW_API + '/contracts/';
    /**
     * Preview tokens API
     */
    public static readonly HEDERA_PREVIEW_TOKENS_API: string = Environment.HEDERA_PREVIEW_API + '/tokens';
    /**
     * Preview tokens API
     */
    public static readonly HEDERA_PREVIEW_TRANSACTIONS_API: string = Environment.HEDERA_PREVIEW_API + '/transactions';

    /**
     * Localnode API
     */
    public static HEDERA_LOCALNODE_API: string = `https://localhost:5551/api/v1`;
    /**
     * Localnode message API
     */
    public static HEDERA_LOCALNODE_MESSAGE_API: string = Environment.HEDERA_LOCALNODE_API + `/topics/messages`;
    /**
     * Localnode topic API
     */
    public static HEDERA_LOCALNODE_TOPIC_API: string = Environment.HEDERA_LOCALNODE_API + `/topics/`;
    /**
     * Localnode account API
     */
    public static HEDERA_LOCALNODE_ACCOUNT_API: string = Environment.HEDERA_LOCALNODE_API + `/accounts/`;
    /**
     * Localnode balances API
     */
    public static HEDERA_LOCALNODE_BALANCES_API: string = Environment.HEDERA_LOCALNODE_API + '/balances';
    /**
     * Localnode contract API
     */
    public static HEDERA_LOCALNODE_CONTRACT_API: string = Environment.HEDERA_LOCALNODE_API + `/contracts/`;
    /**
     * Localnode tokens API
     */
    public static HEDERA_LOCALNODE_TOKENS_API: string = Environment.HEDERA_LOCALNODE_API + `/tokens/`;
    /**
     * Localnode tokens API
     */
    public static readonly HEDERA_LOCALNODE_TRANSACTIONS_API: string = Environment.HEDERA_LOCALNODE_API + '/transactions';

    /**
     * Localnode protocol
     * @private
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
     * Balances API
     * @private
     */
    private static _balancesApi: string = Environment.HEDERA_TESTNET_BALANCES_API;
    /**
     * Contract API
     * @private
     */
    private static _contractsApi: string = Environment.HEDERA_TESTNET_CONTRACT_API;
    /**
     * Tokens API
     * @private
     */
    private static _tokensApi: string = Environment.HEDERA_TESTNET_TOKENS_API;
    /**
     * Tokens API
     * @private
     */
    private static _transactionsApi: string = Environment.HEDERA_TESTNET_TRANSACTIONS_API;

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
     */
    public static setNetwork(network: string) {
        switch (network) {
            case 'mainnet':
                Environment._network = 'mainnet';
                Environment._messagesApi = Environment.HEDERA_MAINNET_MESSAGE_API;
                Environment._topicsApi = Environment.HEDERA_MAINNET_TOPIC_API;
                Environment._accountsApi = Environment.HEDERA_MAINNET_ACCOUNT_API;
                Environment._balancesApi = Environment.HEDERA_MAINNET_BALANCES_API;
                Environment._contractsApi = Environment.HEDERA_MAINNET_CONTRACT_API;
                Environment._tokensApi = Environment.HEDERA_MAINNET_TOKENS_API;
                Environment._transactionsApi = Environment.HEDERA_MAINNET_TRANSACTIONS_API;
                break;

            case 'testnet':
                Environment._network = 'testnet';
                Environment._messagesApi = Environment.HEDERA_TESTNET_MESSAGE_API;
                Environment._topicsApi = Environment.HEDERA_TESTNET_TOPIC_API;
                Environment._accountsApi = Environment.HEDERA_TESTNET_ACCOUNT_API;
                Environment._balancesApi = Environment.HEDERA_TESTNET_BALANCES_API;
                Environment._contractsApi = Environment.HEDERA_TESTNET_CONTRACT_API;
                Environment._tokensApi = Environment.HEDERA_TESTNET_TOKENS_API;
                Environment._transactionsApi = Environment.HEDERA_TESTNET_TRANSACTIONS_API;
                break;

            case 'previewnet':
                Environment._network = 'previewnet';
                Environment._messagesApi = Environment.HEDERA_PREVIEW_MESSAGE_API;
                Environment._topicsApi = Environment.HEDERA_PREVIEW_TOPIC_API;
                Environment._accountsApi = Environment.HEDERA_PREVIEW_ACCOUNT_API;
                Environment._balancesApi = Environment.HEDERA_PREVIEW_BALANCES_API;
                Environment._contractsApi = Environment.HEDERA_PREVIEW_CONTRACT_API;
                Environment._tokensApi = Environment.HEDERA_PREVIEW_TOKENS_API;
                Environment._transactionsApi = Environment.HEDERA_PREVIEW_TRANSACTIONS_API;
                break;

            case 'localnode':
                Environment._network = 'localnode';
                Environment._messagesApi = Environment.HEDERA_LOCALNODE_MESSAGE_API;
                Environment._topicsApi = Environment.HEDERA_LOCALNODE_TOPIC_API;
                Environment._accountsApi = Environment.HEDERA_LOCALNODE_ACCOUNT_API;
                Environment._balancesApi = Environment.HEDERA_LOCALNODE_BALANCES_API;
                Environment._contractsApi = Environment.HEDERA_LOCALNODE_CONTRACT_API;
                Environment._tokensApi = Environment.HEDERA_LOCALNODE_TOKENS_API;
                Environment._transactionsApi = Environment.HEDERA_LOCALNODE_TRANSACTIONS_API;
                break;

            default:
                throw new Error(`Unknown network: ${network}`)
        }

        if (Environment._mirrorNodes && Environment._mirrorNodes.length > 0) {
            const mirrornode = Environment._mirrorNodes[0];
            Environment._messagesApi = `${mirrornode}/api/v1/topics/messages`;
            Environment._topicsApi = `${mirrornode}/api/v1/topics/`;
            Environment._accountsApi = `${mirrornode}/api/v1/accounts/`;
            Environment._balancesApi = `${mirrornode}/api/v1/balances/`;
            Environment._contractsApi = `${mirrornode}/api/v1/contracts/`;
            Environment._tokensApi = `${mirrornode}/api/v1/tokens/`;
        }
    }

    /**
     * Set localnode address
     */
    public static setLocalNodeAddress(address) {
        Environment._localnodeaddress = address || 'localhost';
        Environment.HEDERA_LOCALNODE_API = `${Environment._localnodeprotocol}://${Environment._localnodeaddress}:5551/api/v1`;
        Environment.HEDERA_LOCALNODE_MESSAGE_API = Environment.HEDERA_LOCALNODE_API + `/topics/messages`;
        Environment.HEDERA_LOCALNODE_TOPIC_API = Environment.HEDERA_LOCALNODE_API + `/topics/`;
        Environment.HEDERA_LOCALNODE_ACCOUNT_API = Environment.HEDERA_LOCALNODE_API + `/accounts/`;
        Environment.HEDERA_LOCALNODE_BALANCES_API = Environment.HEDERA_LOCALNODE_API + `/balances`;
        Environment.HEDERA_LOCALNODE_CONTRACT_API = Environment.HEDERA_LOCALNODE_API + `/contracts/`;
        Environment.HEDERA_LOCALNODE_TOKENS_API = Environment.HEDERA_LOCALNODE_API + `/tokens/`;
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
     * Hedera account API
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
     * Hedera tokens API
     * @constructor
     */
    public static get HEDERA_TRANSACTIONS_API(): string {
        return Environment._transactionsApi;
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
}
