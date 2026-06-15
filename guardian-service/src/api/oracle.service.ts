import {
    DatabaseServer,
    IAuthUser,
    MessageError,
    MessageResponse,
    PinoLogger,
    Workers,
} from '@guardian/common';
import {
    GenerateUUIDv4,
    MessageAPI,
    WorkerTaskType,
} from '@guardian/interfaces';
import { Injectable } from '@nestjs/common';

/**
 * Payload describing a single oracle verdict update.
 */
export interface IOracleVerdictUpdate {
    tokenId: string;       // Hedera token id, e.g. "0.0.1234"
    isValid: boolean;
}

/**
 * Oracle configuration stored per Guardian instance.
 */
export interface IOracleConfig {
    enabled: boolean;
    contractAddress: string;   // EVM address of deployed GuardianOracle.sol
    operatorAccountId: string; // Hedera account id of the tx payer
    operatorKey: string;       // Private key (from vault in prod)
    networkName: string;       // "mainnet" | "testnet" | "previewnet" | "local"
}

/**
 * Full verdict details returned by the API.
 */
export interface IOracleVerdictResult {
    tokenId: string;
    tokenAddress: string;
    isValid: boolean;
    updatedAt: number;       // Unix timestamp (seconds)
    updatedBy: string;       // EVM address
    txId?: string;           // Hedera tx id of the last update (if available)
}

/**
 * OracleService — manages the Guardian Oracle on-chain registry.
 *
 * Responsibilities:
 *  1. Expose REST-level service methods used by {@link OracleApi} in api-gateway.
 *  2. Push verdict updates to the GuardianOracle smart contract via the
 *     worker-service task queue (keeps Hedera SDK usage centralised).
 *  3. React to trust-chain events (called by policy-engine hooks when a new
 *     VP is minted or a VC is revoked).
 */
@Injectable()
export class OracleService {
    constructor(private readonly logger: PinoLogger) {}

    // -------------------------------------------------------------------------
    // Configuration helpers
    // -------------------------------------------------------------------------

    /**
     * Read oracle configuration from the database config collection.
     * Falls back to environment variables when no DB record exists.
     */
    private async getConfig(): Promise<IOracleConfig> {
        const dbConfig = await DatabaseServer.getSystemSettings('oracle');
        if (dbConfig) {
            return dbConfig as IOracleConfig;
        }
        // Env-variable fallback (useful for first run / Docker Compose)
        return {
            enabled:           (process.env.ORACLE_ENABLED || 'false') === 'true',
            contractAddress:   process.env.ORACLE_CONTRACT_ADDRESS || '',
            operatorAccountId: process.env.ORACLE_OPERATOR_ACCOUNT_ID || '',
            operatorKey:       process.env.ORACLE_OPERATOR_KEY || '',
            networkName:       process.env.ORACLE_NETWORK || 'testnet',
        };
    }

    /** Persist updated oracle configuration to the database. */
    async saveConfig(config: IOracleConfig, userId: string): Promise<IOracleConfig> {
        await DatabaseServer.saveSystemSettings('oracle', config as any, userId);
        return config;
    }

    // -------------------------------------------------------------------------
    // Verdict push — called by internal event handlers (trust chain changes)
    // -------------------------------------------------------------------------

    /**
     * Push a single verdict update to the on-chain GuardianOracle contract.
     * Converts the Hedera token id to its EVM mirror address before calling
     * the contract.
     *
     * @param tokenId   Hedera token id (e.g. "0.0.1234")
     * @param isValid   New validity verdict
     * @param userId    Requesting user id (for audit log)
     */
    async pushVerdict(tokenId: string, isValid: boolean, userId: string): Promise<string | null> {
        const config = await this.getConfig();
        if (!config.enabled) {
            return null;
        }
        if (!config.contractAddress) {
            this.logger.warn('Oracle is enabled but ORACLE_CONTRACT_ADDRESS is not set', 'OracleService');
            return null;
        }

        const tokenAddress = this.hederaIdToEvmAddress(tokenId);
        const workers = new Workers();

        try {
            const result = await workers.addNonRetryableTask({
                type: WorkerTaskType.ORACLE_UPDATE_VERDICT,
                data: {
                    contractAddress:   config.contractAddress,
                    tokenAddress,
                    isValid,
                    operatorAccountId: config.operatorAccountId,
                    operatorKey:       config.operatorKey,
                    networkName:       config.networkName,
                    payload: { userId },
                },
            }, { priority: 15 });

            this.logger.log(
                `Oracle verdict pushed — token: ${tokenId}, valid: ${isValid}, tx: ${result?.txId}`,
                'OracleService'
            );
            return result?.txId ?? null;
        } catch (err) {
            this.logger.error(`Oracle verdict push failed for ${tokenId}: ${err}`, 'OracleService');
            return null;
        }
    }

    /**
     * Push multiple verdict updates in a single on-chain batch transaction.
     * More gas-efficient and reduces Hedera consensus latency.
     */
    async pushVerdicts(updates: IOracleVerdictUpdate[], userId: string): Promise<string | null> {
        const config = await this.getConfig();
        if (!config.enabled || !config.contractAddress) {
            return null;
        }

        const tokenAddresses = updates.map(u => this.hederaIdToEvmAddress(u.tokenId));
        const validities     = updates.map(u => u.isValid);
        const workers        = new Workers();

        try {
            const result = await workers.addNonRetryableTask({
                type: WorkerTaskType.ORACLE_UPDATE_VERDICTS_BATCH,
                data: {
                    contractAddress:   config.contractAddress,
                    tokenAddresses,
                    validities,
                    operatorAccountId: config.operatorAccountId,
                    operatorKey:       config.operatorKey,
                    networkName:       config.networkName,
                    payload: { userId },
                },
            }, { priority: 15 });

            this.logger.log(
                `Oracle batch verdicts pushed — ${updates.length} tokens, tx: ${result?.txId}`,
                'OracleService'
            );
            return result?.txId ?? null;
        } catch (err) {
            this.logger.error(`Oracle batch verdict push failed: ${err}`, 'OracleService');
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // Query — mirror-node read (no on-chain call needed)
    // -------------------------------------------------------------------------

    /**
     * Read current verdict from the Hedera Mirror Node (free, no gas).
     */
    async getVerdict(tokenId: string): Promise<IOracleVerdictResult | null> {
        const config = await this.getConfig();
        if (!config.enabled || !config.contractAddress) {
            return null;
        }

        const tokenAddress = this.hederaIdToEvmAddress(tokenId);
        const workers      = new Workers();

        try {
            const result = await workers.addNonRetryableTask({
                type: WorkerTaskType.ORACLE_GET_VERDICT,
                data: {
                    contractAddress: config.contractAddress,
                    tokenAddress,
                    networkName:     config.networkName,
                },
            }, { priority: 10 });

            return {
                tokenId,
                tokenAddress,
                isValid:   result?.isValid   ?? false,
                updatedAt: result?.updatedAt ?? 0,
                updatedBy: result?.updatedBy ?? '',
            };
        } catch (err) {
            this.logger.error(`Oracle read failed for ${tokenId}: ${err}`, 'OracleService');
            return null;
        }
    }

    /**
     * Get configuration (strips secret key before returning).
     */
    async getPublicConfig(): Promise<Omit<IOracleConfig, 'operatorKey'>> {
        const config = await this.getConfig();
        const { operatorKey: _omit, ...safeConfig } = config;
        return safeConfig;
    }

    // -------------------------------------------------------------------------
    // Sync — called after a trust chain is built or a VC is revoked
    // -------------------------------------------------------------------------

    /**
     * Called by the Guardian policy engine when a new VP document is minted
     * (trust chain created → mark token as valid).
     */
    async onTrustChainCreated(tokenId: string, userId: string): Promise<void> {
        if (!tokenId) return;
        await this.pushVerdict(tokenId, true, userId);
    }

    /**
     * Called by the Guardian policy engine when a VC in the chain is revoked
     * (trust chain broken → mark token as invalid).
     */
    async onTrustChainRevoked(tokenId: string, userId: string): Promise<void> {
        if (!tokenId) return;
        await this.pushVerdict(tokenId, false, userId);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Convert a Hedera token id ("0.0.1234") to its canonical EVM mirror
     * address (0-padded 20-byte hex).
     *
     * Hedera maps token ids to EVM addresses as:
     *   address = 0x{shard (4 bytes)}{realm (8 bytes)}{num (8 bytes)}
     * For shard=0, realm=0 this simplifies to:
     *   address = 0x000000000000000000000000{num as 8-byte hex}
     */
    private hederaIdToEvmAddress(hederaId: string): string {
        const parts = hederaId.split('.');
        if (parts.length !== 3) {
            throw new Error(`Invalid Hedera id: ${hederaId}`);
        }
        const num = BigInt(parts[2]);
        return '0x' + num.toString(16).padStart(40, '0');
    }
}
