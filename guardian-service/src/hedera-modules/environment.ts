import { Client } from '@hashgraph/sdk';

export class Environment {
    public static readonly HEDERA_MAINNET_MESSAGE_API: string = 'https://mainnet-public.mirrornode.hedera.com/api/v1/topics/messages';
    public static readonly HEDERA_MAINNET_TOPIC_API: string = 'https://mainnet-public.mirrornode.hedera.com/api/v1/topics/';
    public static readonly HEDERA_TESTNET_MESSAGE_API: string = 'https://testnet.mirrornode.hedera.com/api/v1/topics/messages';
    public static readonly HEDERA_TESTNET_TOPIC_API: string = 'https://testnet.mirrornode.hedera.com/api/v1/topics/';

    private static _network: string = 'testnet';
    private static _messagesApi: string = this.HEDERA_TESTNET_MESSAGE_API;
    private static _topicsApi: string = this.HEDERA_TESTNET_TOPIC_API;

    public static setNetwork(network: string, mirrornode?: string) {
        if (network == 'mainnet') {
            this._network = 'mainnet';
            this._messagesApi = this.HEDERA_MAINNET_MESSAGE_API;
            this._topicsApi = this.HEDERA_MAINNET_TOPIC_API;
        } else {
            this._network = 'testnet';
            this._messagesApi = this.HEDERA_TESTNET_MESSAGE_API;
            this._topicsApi = this.HEDERA_TESTNET_TOPIC_API;
        }
        if (mirrornode) {
            this._messagesApi = `${mirrornode}/api/v1/topics/messages`;
            this._topicsApi = `${mirrornode}/api/v1/topics/`;
        }
    }

    public static createClient(): Client {
        if (this._network == 'mainnet') {
            return Client.forMainnet();
        } else {
            return Client.forTestnet();
        }
    }

    public static get network(): string {
        return this._network;
    }

    public static get HEDERA_MESSAGE_API(): string {
        return this._messagesApi;
    }

    public static get HEDERA_TOPIC_API(): string {
        return this._topicsApi;
    }
}