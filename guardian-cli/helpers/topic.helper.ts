import {
    Client,
    PrivateKey,
    TopicCreateTransaction,
    TopicInfoQuery,
    TopicMessageQuery,
    Timestamp,
    TopicId,
    TopicMessageSubmitTransaction,
    AccountId,
} from '@hashgraph/sdk';

import { Network } from './contract-publisher.helper.js';

export interface TopicMessageResult {
    consensusTimestamp: string;
    sequenceNumber: number;
    runningHash: string;
    message: string;
}

function createClient(
    account: string,
    key: string,
    network?: Network
): Client {
    const accountId = AccountId.fromString(account);
    const privateKey = PrivateKey.fromString(key);

    let client: Client;

    if (network === Network.MAINNET) {
        client = Client.forMainnet();
    } else if (network === Network.PREVIEWNET) {
        client = Client.forPreviewnet();
    } else {
        client = Client.forTestnet();
    }

    client.setOperator(accountId, privateKey);

    return client;
}

/**
 * Topic helper
 */
export class TopicHelper {
    /**
     * Create configured Hedera client
     * @param operatorId
     * @param operatorKey
     * @param network
     */
    private static createClient(
        operatorId: string,
        operatorKey: string,
        network?: Network
    ): Client {
        let client: Client;

        switch (network) {
            case Network.MAINNET: {
                client = Client.forMainnet();
                break;
            }
            case Network.PREVIEWNET: {
                client = Client.forPreviewnet();
                break;
            }
            default: {
                client = Client.forTestnet();
            }
        }

        const key = PrivateKey.fromString(operatorKey);
        client.setOperator(operatorId, key);

        return client;
    }

    /**
     * Create new topic
     */
    public static async createTopic(
        operatorId: string,
        operatorKey: string,
        memo?: string,
        network?: Network
    ): Promise<string> {
        const client = this.createClient(operatorId, operatorKey, network);

        try {
            const tx = await new TopicCreateTransaction()
                .setTopicMemo(memo || '')
                .execute(client);

            const receipt = await tx.getReceipt(client);
            const topicId = receipt.topicId;

            if (!topicId) {
                throw new Error('TopicId is empty in receipt');
            }

            return topicId.toString();
        } finally {
            client.close();
        }
    }

    /**
     * Get topic info
     */
    public static async getTopicInfo(
        operatorId: string,
        operatorKey: string,
        topicId: string,
        network?: Network
    ): Promise<any> {
        const client = this.createClient(operatorId, operatorKey, network);

        try {
            const info = await new TopicInfoQuery()
                .setTopicId(topicId)
                .execute(client);

            return info;
        } finally {
            client.close();
        }
    }

    /**
     * Get messages from topic
     */
    public static async getMessages(
        account: string,
        key: string,
        topicId: string,
        options: {
            startTime?: string;
            limit?: number;
        },
        network?: Network
    ): Promise<TopicMessageResult[]> {
        const client = createClient(account, key, network);
        const id = TopicId.fromString(topicId);

        const limit = options.limit && options.limit > 0
            ? options.limit
            : undefined;

        const startTimestamp = options.startTime
            ? Timestamp.fromDate(new Date(options.startTime))
            : Timestamp.fromDate(new Date(0));

        const query = new TopicMessageQuery()
            .setTopicId(id)
            .setStartTime(startTimestamp);

        if (limit) {
            query.setLimit(limit);
        }

        const result: TopicMessageResult[] = [];

        return new Promise<TopicMessageResult[]>((resolve, reject) => {
            const subscription = query.subscribe(
                client,
                (error) => {
                    client.close();
                    reject(error);
                },
                (msg) => {
                    const text = Buffer
                        .from(msg.contents)
                        .toString('utf8');

                    result.push({
                        sequenceNumber: Number(msg.sequenceNumber.toString()),
                        consensusTimestamp: msg.consensusTimestamp
                            .toDate()
                            .toISOString(),
                        message: text,
                        runningHash: Buffer
                            .from(msg.runningHash)
                            .toString('hex'),
                    });

                    if (limit && result.length >= limit) {
                        subscription.unsubscribe();
                        client.close();
                        resolve(result);
                    }
                }
            );

            setTimeout(() => {
                subscription.unsubscribe();
                client.close();
                resolve(result);
            }, 3000);
        });
    }

    /**
     * Publish message
     */
    public static async publishMessage(
        operatorId: string,
        operatorKey: string,
        topicId: string,
        message: string,
        network?: Network
    ): Promise<{
        topicId: string;
        sequenceNumber: number;
        runningHash: string | null;
    }> {
        const client = this.createClient(operatorId, operatorKey, network);

        try {
            const tx = await new TopicMessageSubmitTransaction()
                .setTopicId(TopicId.fromString(topicId))
                .setMessage(message)
                .execute(client);

            const receipt = await tx.getReceipt(client);

            const sequenceNumber = receipt.topicSequenceNumber
                ? Number(receipt.topicSequenceNumber.toString())
                : 0;

            const runningHash = receipt.topicRunningHash
                ? Buffer.from(receipt.topicRunningHash).toString('hex')
                : null;

            return {
                topicId,
                sequenceNumber,
                runningHash
            };
        } finally {
            client.close();
        }
    }
}
