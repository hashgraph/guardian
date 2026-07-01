import { registerAs } from '@nestjs/config';

export const ROOT_TOPICS: Record<string, string> = {
    mainnet: '0.0.1368856',
    testnet: '0.0.1960',
    previewnet: '0.0.10071',
};

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

/**
 * Configuration for a single Guardian instance whose Application Events Module
 * (AEM) HTTP stream is consumed by the guardian-sync process.
 */
export interface GuardianInstanceConfig {
    /** Unique instance label as provided in GUARDIAN_INSTANCES (e.g. "local-testnet"). */
    id: string;
    /**
     * SE dataset / queue namespace this instance feeds. guardian-sync activates
     * an instance only when this equals the process's HEDERA_NET. Defaults to
     * hederaNet, so multiple instances on the same Hedera net (e.g. local-testnet
     * + deploy-testnet) share one "testnet" dataset; set GUARDIAN_<ID>_NETWORK to
     * give an instance its own isolated dataset instead.
     */
    network: string;
    /** Base URL of the Guardian Application Events Module, e.g. https://guardian.example.com */
    aemUrl: string;
    /** Hedera network this Guardian instance runs on (e.g. "mainnet", "testnet"). */
    hederaNet: string;
    /** Optional HTTP Authorization header value sent with AEM requests. */
    authHeader?: string;
    /** Optional allowlist of event types to process; undefined means all events. */
    eventFilter?: string[];
}

/**
 * Parses GUARDIAN_INSTANCES (comma-separated composite ids) and returns a
 * GuardianInstanceConfig for each id that has a valid AEM_URL configured.
 *
 * Instances with no AEM_URL are silently skipped — this is intentional so that
 * partially-configured environments do not crash the guardian-sync process.
 *
 * Mirrors the CSV split/trim/lowercase/filter idiom used by getConfiguredNetworks()
 * in database.config.ts.
 */
export function getGuardianInstances(): GuardianInstanceConfig[] {
    const raw = process.env.GUARDIAN_INSTANCES || '';
    if (!raw.trim()) {
        return [];
    }

    const ids = raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0);

    const results: GuardianInstanceConfig[] = [];

    for (const id of ids) {
        const prefix = `GUARDIAN_${id.toUpperCase().replace(/-/g, '_')}_`;

        const aemUrl = process.env[`${prefix}AEM_URL`] || '';
        if (!aemUrl) {
            // Required — skip instance without AEM_URL, do not throw
            continue;
        }

        // Hedera network: explicit env var or infer from the last '-'-delimited segment of id
        const envHederaNet = process.env[`${prefix}HEDERA_NET`] || '';
        let hederaNet: string;
        if (envHederaNet) {
            hederaNet = envHederaNet;
        } else {
            const dashIdx = id.lastIndexOf('-');
            hederaNet = dashIdx !== -1 ? id.slice(dashIdx + 1) : id;
        }

        // SE dataset / queue namespace this instance feeds. Defaults to hederaNet
        // so several instances on the same Hedera net share one dataset (e.g.
        // local-testnet + deploy-testnet → "testnet"); override for isolation.
        const network = (process.env[`${prefix}NETWORK`] || hederaNet)
            .trim()
            .toLowerCase();

        const rawAuthHeader = process.env[`${prefix}AUTH_HEADER`] || '';
        const authHeader: string | undefined = rawAuthHeader || undefined;

        const rawEvents = process.env[`${prefix}EVENTS`] || '';
        let eventFilter: string[] | undefined;
        if (rawEvents.trim()) {
            const parsed = rawEvents
                .split(',')
                .map((e) => e.trim())
                .filter((e) => e.length > 0);
            eventFilter = parsed.length > 0 ? parsed : undefined;
        }

        results.push({ id, network, aemUrl, hederaNet, authHeader, eventFilter });
    }

    return results;
}

export default registerAs('app', () => {
    // Worker uses HEDERA_NET (single network). For the API, see
    // getConfiguredNetworks() in database.config.ts which reads HEDERA_NETWORKS.
    const hederaNet = process.env.HEDERA_NET || 'testnet';

    return {
        // Hedera (worker-scoped — the network this process syncs from)
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
            // Per-gateway auth tokens. Format: url::token,url2::token2
            // e.g. IPFS_GATEWAY_TOKENS=https://w3s.link/ipfs/::your-storacha-token
            gatewayTokens: process.env.IPFS_GATEWAY_TOKENS || '',
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

        // Registry allowlist (only discover these topics from the seed topic)
        onlyRegistryTopics: process.env.ONLY_REGISTRY_TOPIC || '',

        // Materialized views
        mvRefreshInterval: parseInt(process.env.MV_REFRESH_INTERVAL || '60', 10),

        // Mirror node polling
        mirrorNodePollDelay: parseInt(process.env.MIRROR_NODE_POLL_DELAY || '30000', 10),

        // Logging
        logLevel: process.env.LOG_LEVEL || 'info',

        // Guardian environment
        guardianEnv: process.env.GUARDIAN_ENV || '',

        // System database — stores only the raw override string to avoid a
        // circular import of database.config (which owns getSystemDatabaseName()).
        // Name resolution: DB_SYSTEM_NAME → {GUARDIAN_ENV}_system_{DB_DATABASE}
        //   (or system_{DB_DATABASE} when GUARDIAN_ENV is empty).
        // Shares DB_HOST / DB_PORT / DB_USER / DB_PASSWORD with the network DBs.
        systemDatabase: {
            nameOverride: process.env.DB_SYSTEM_NAME?.trim() || '',
        },

        // Auth / JWT — secrets (jwtAccessSecret, jwtRefreshSecret, passwordPepper,
        // apiKeyPepper) MUST come from environment / secret manager; never commit them.
        auth: {
            jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
            jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
            accessTokenTtlMinutes: parseInt(process.env.ACCESS_TOKEN_TTL_MINUTES || '15', 10),
            refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10),
            sessionAbsoluteTtlDays: parseInt(process.env.SESSION_ABSOLUTE_TTL_DAYS || '30', 10),
            // Pepper values: random 32-byte hex strings from a secret manager.
            // Used to prevent rainbow-table attacks against the DB if it is leaked.
            passwordPepper: process.env.PASSWORD_PEPPER || '',
            apiKeyPepper: process.env.API_KEY_PEPPER || '',
            bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
            // Cookie topology: same-domain reverse-proxy (frontend + API share domain).
            cookieDomain: process.env.AUTH_COOKIE_DOMAIN || '',
            cookieSameSite: process.env.AUTH_COOKIE_SAMESITE || 'Lax',
            cookieSecure: (process.env.AUTH_COOKIE_SECURE || 'true') === 'true',
            // Base URL of the public frontend, used to build email verification and
            // password-reset links (e.g. https://app.example.com). Must have no trailing
            // slash — links are path-appended in the email-token service.
            publicAppUrl: process.env.APP_PUBLIC_URL || '',
            // Minimum seconds between verification-email resends, per user.
            resendVerificationCooldownSeconds: parseInt(process.env.RESEND_VERIFICATION_COOLDOWN_SECONDS || '300', 10),
        },

        // Rate limits — applied GLOBALLY per user / API key (never per-network).
        rateLimit: {
            systemUserPerHour: parseInt(process.env.RATE_LIMIT_SYSTEM_USER_PER_HOUR || '1000', 10),
            adminPerHour: parseInt(process.env.RATE_LIMIT_ADMIN_PER_HOUR || '10000', 10),
            maxQuota: parseInt(process.env.RATE_LIMIT_MAX_QUOTA || '10000', 10),
            loginMaxFailures: parseInt(process.env.LOGIN_MAX_FAILURES || '10', 10),
            loginLockMinutes: parseInt(process.env.LOGIN_LOCK_MINUTES || '15', 10),
            // Max ACTIVE API keys a single user may hold (default 3); enforced
            // atomically at API-key creation.
            apiKeyMaxActivePerUser: parseInt(process.env.API_KEY_MAX_ACTIVE_PER_USER || '3', 10),
            // Throttler enforcement (Redis-backed). OFF by default — flag-gated.
            enforce: (process.env.RATE_LIMIT_ENFORCE || 'false') === 'true',
            // Hourly request quota for unauthenticated/guest traffic (per IP).
            guestPerHour: parseInt(process.env.RATE_LIMIT_GUEST_PER_HOUR || '600', 10),
        },

        // Initial admin — break-glass admin seeded on first boot. MUST be set via
        // environment / secret manager; do NOT commit real values.
        initialAdmin: {
            email: process.env.INITIAL_ADMIN_EMAIL || '',
            password: process.env.INITIAL_ADMIN_PASSWORD || '',
        },

        // SMTP — email verification + forgot-password.
        smtp: {
            host: process.env.SMTP_HOST || '',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            user: process.env.SMTP_USER || '',
            password: process.env.SMTP_PASSWORD || '',
            from: process.env.SMTP_FROM || '',
            secure: (process.env.SMTP_SECURE || 'false') === 'true',
        },

        // Public-data access control. OFF by default — flipping
        // enforce=true requires network-scoped data endpoints to come from EITHER
        // the trusted frontend (browser Origin in API_CORS_ORIGINS, or the
        // FRONTEND_SHARED_SECRET header for SSR server-to-server) OR a valid API
        // key. Guests browse via the frontend; programmatic callers need a key.
        dataAccess: {
            enforce: (process.env.DATA_ACCESS_ENFORCE || 'false') === 'true',
            frontendSecret: process.env.FRONTEND_SHARED_SECRET || '',
        },
    };
});
