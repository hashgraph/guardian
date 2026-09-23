import { AccountId, Client } from '@hiero-ledger/sdk';
import { Environment, stripPrefix } from '@guardian/common';

/**
 * Builds a Hedera client from the network configuration held by
 * {@link Environment}. Lives here rather than on `Environment` itself so that
 * `@guardian/common` – and therefore every service that does not talk to
 * Hedera – stays free of `@hiero-ledger/sdk`.
 */
export class HederaClientFactory {
    /**
     * Create client
     */
    public static createClient(): Client {
        let client: Client;

        switch (Environment.network) {
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
                node[`${Environment.localNodeAddress}:50211`] = new AccountId(3)
                client = Client.forNetwork(node).setMirrorNetwork(`${Environment.localNodeAddress}:5600`);
                break;
            default:
                throw new Error(`Unknown network: ${Environment.network}`)
        }

        const nodes = Environment.nodes;
        if (nodes && Object.keys(nodes).length) {
            client.setNetwork(nodes);
        }
        const mirrorNodes = Environment.mirrorNodes;
        if (mirrorNodes?.length) {
            client.setMirrorNetwork(mirrorNodes.map(node => stripPrefix(node, ['http://', 'https://'])));
        }

        return client;
    }
}
