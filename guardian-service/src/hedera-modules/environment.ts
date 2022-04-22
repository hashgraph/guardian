import { Client } from "@hashgraph/sdk";

export class Environment {
    public static readonly HEDERA_MESSAGE_API: string = "https://testnet.mirrornode.hedera.com/api/v1/topics/messages";
    public static readonly HEDERA_TOPIC_API: string = "https://testnet.mirrornode.hedera.com/api/v1/topics/";

    public static createClient(): Client {
        return Client.forTestnet();
    }

    public static getNetwork(): string {
        return 'testnet';
    }
}