import { registerAs } from '@nestjs/config';

/**
 * Returns the default Hedera Mirror Node REST API URL for a given network.
 */
export function getDefaultMirrorNodeUrl(network: string): string {
    const urls: Record<string, string> = {
        mainnet: 'https://mainnet-public.mirrornode.hedera.com',
        testnet: 'https://testnet.mirrornode.hedera.com',
        previewnet: 'https://previewnet.mirrornode.hedera.com',
    };
    return urls[network] || urls['testnet'];
}

export default registerAs('app', () => {
    const hederaNet = process.env.HEDERA_NET || 'testnet';

    return {
        // Hedera
        hedera: {
            network: hederaNet,
            mirrorNodeUrl:
                process.env.HEDERA_MIRROR_NODE_URL ||
                getDefaultMirrorNodeUrl(hederaNet),
        },

        // IPFS
        ipfs: {
            gateways: (
                process.env.IPFS_GATEWAYS ||
                'https://gateway.pinata.cloud/ipfs/,https://dweb.link/ipfs/,https://w3s.link/ipfs/'
            ).split(',').map((g) => g.trim()),
            fetchTimeout: parseInt(process.env.IPFS_FETCH_TIMEOUT || '180000', 10),
        },

        // Database
        database: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            name: process.env.DB_DATABASE || 'sustainable_explorer',
            user: process.env.DB_USER || 'explorer',
            password: process.env.DB_PASSWORD || 'explorer_password',
            poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
            poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
        },

        // Redict (Redis-compatible cache)
        redict: {
            host: process.env.REDICT_HOST || 'localhost',
            port: parseInt(process.env.REDICT_PORT || '6379', 10),
            password: process.env.REDICT_PASSWORD || undefined,
            db: parseInt(process.env.REDICT_DB || '0', 10),
            keyPrefix: process.env.REDICT_KEY_PREFIX || 'se:',
        },

        // Worker concurrency
        worker: {
            topicConcurrency: parseInt(process.env.WORKER_TOPIC_CONCURRENCY || '5', 10),
            messageConcurrency: parseInt(process.env.WORKER_MESSAGE_CONCURRENCY || '10', 10),
            tokenConcurrency: parseInt(process.env.WORKER_TOKEN_CONCURRENCY || '2', 10),
            ipfsConcurrency: parseInt(process.env.WORKER_IPFS_CONCURRENCY || '3', 10),
        },

        // Seed topic (overrides default per-network root topic)
        seedTopicId: process.env.SEED_TOPIC_ID || '',

        // Materialized views
        mvRefreshInterval: parseInt(process.env.MV_REFRESH_INTERVAL || '60', 10),

        // Mirror node polling
        mirrorNodePollDelay: parseInt(process.env.MIRROR_NODE_POLL_DELAY || '30000', 10),

        // Logging
        logLevel: process.env.LOG_LEVEL || 'info',

        // Guardian environment
        guardianEnv: process.env.GUARDIAN_ENV || '',
    };
});
