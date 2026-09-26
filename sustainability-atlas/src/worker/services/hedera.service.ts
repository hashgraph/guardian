import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

// ── Interfaces ───────────────────────────────────────────────────────────

export interface TopicMessage {
    consensus_timestamp: string;
    topic_id: string;
    message: string;
    sequence_number: number;
    chunk_info?: {
        initial_transaction_id: string;
        number: number;
        total: number;
    };
}

export interface TokenInfo {
    token_id: string;
    name: string;
    symbol: string;
    type: string;
    total_supply: string;
    decimals: string;
    treasury_account_id: string;
    memo: string;
    created_timestamp: string;
    modified_timestamp: string;
}

export interface NftInfo {
    token_id: string;
    serial_number: number;
    metadata: string;
    /** Current holder. Present on every NFT record; used to detect transfers
     *  out of the treasury, which leave no Guardian-side record at all. */
    account_id?: string | null;
    deleted?: boolean;
}

/** One entry of a transaction's `token_transfers` array. For a TOKENMINT the
 *  treasury credit carries the amount the ledger actually minted, in the
 *  token's smallest units. */
export interface TokenTransfer {
    token_id: string;
    account: string;
    amount: number;
}

/** One NFT movement inside a CRYPTOTRANSFER. Guardian writes no transfer
 *  document, so this is the only record that a credit changed hands. */
export interface NftTransfer {
    token_id: string;
    serial_number: number;
    sender_account_id: string | null;
    receiver_account_id: string | null;
}

export interface TransferTransaction {
    consensus_timestamp: string;
    nft_transfers?: NftTransfer[];
}

export interface TransferTransactionsResponse {
    transactions: TransferTransaction[];
    nextLink: string | null;
}

export interface MintTransaction {
    consensus_timestamp: string;
    /** Base64 transaction memo. Guardian writes the mint VP-Document's consensus
     *  timestamp here for fungible mints (non-fungible mints carry it in each
     *  serial's metadata instead, so this is empty for them). */
    memo_base64: string | null;
    token_transfers?: TokenTransfer[];
}

export interface ContractLog {
    /** Consensus timestamp of the transaction that emitted this log. Note the
     *  contract-logs endpoint calls this `timestamp`, not `consensus_timestamp`
     *  as the transactions endpoint does. */
    timestamp: string;
    /** Position of this log within its transaction — part of its identity, since
     *  one retirement transaction can emit several logs. */
    index: number;
    contract_id: string;
    /** topics[0] is the event signature hash. */
    topics: string[];
    data: string;
}

export interface ContractLogsResponse {
    logs: ContractLog[];
    nextLink: string | null;
}

export interface TopicMessagesResponse {
    messages: TopicMessage[];
    nextLink: string | null;
}

export interface MintTransactionsResponse {
    transactions: MintTransaction[];
    nextLink: string | null;
}

export interface NftSerialsResponse {
    nfts: NftInfo[];
    nextLink: string | null;
}

// ── Service ──────────────────────────────────────────────────────────────

@Injectable()
export class HederaService {
    private readonly logger = new Logger(HederaService.name);
    private readonly baseUrl: string;
    private readonly client: AxiosInstance;

    private static readonly REST_API_MAX_LIMIT = 100;
    private static readonly TIMEOUT = 120000;

    constructor(private readonly configService: ConfigService) {
        this.baseUrl = this.configService.get<string>('app.hedera.mirrorNodeUrl')!;
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: HederaService.TIMEOUT,
        });
    }

    /**
     * Fetches topic messages from the mirror node starting after a given sequence number.
     */
    async getMessages(topicId: string, fromSequenceNumber: number): Promise<TopicMessagesResponse> {
        const url = `/api/v1/topics/${topicId}/messages`;
        const params: Record<string, string | number> = {
            limit: HederaService.REST_API_MAX_LIMIT,
            order: 'asc',
        };
        if (fromSequenceNumber > 0) {
            params['sequencenumber'] = `gt:${fromSequenceNumber}`;
        }

        this.logger.debug(`GET ${url} fromSeq=${fromSequenceNumber}`);

        const response = await this.client.get(url, { params });

        return {
            messages: response.data.messages || [],
            nextLink: response.data.links?.next || null,
        };
    }

    /**
     * Fetches token info from the mirror node.
     */
    async getToken(tokenId: string): Promise<TokenInfo> {
        const url = `/api/v1/tokens/${tokenId}`;
        this.logger.debug(`GET ${url}`);
        const response = await this.client.get(url);
        return response.data;
    }

    /**
     * Fetches NFT serials for a given token from the mirror node.
     */
    async getSerials(tokenId: string, fromSerial: number): Promise<NftSerialsResponse> {
        const url = `/api/v1/tokens/${tokenId}/nfts`;
        const params: Record<string, string | number> = {
            limit: HederaService.REST_API_MAX_LIMIT,
            order: 'asc',
        };
        if (fromSerial > 0) {
            params['serialnumber'] = `gt:${fromSerial}`;
        }

        this.logger.debug(`GET ${url} fromSerial=${fromSerial}`);

        const response = await this.client.get(url, { params });

        return {
            nfts: response.data.nfts || [],
            nextLink: response.data.links?.next || null,
        };
    }

    /**
     * Fetches one page of TOKENMINT transactions for a treasury account, oldest-first.
     *
     * Mirror Node has no "transactions for a token" filter, so this queries by the
     * token's treasury account and callers must discard transfers belonging to that
     * treasury's other tokens.
     *
     * `timestampFilter` is a Mirror Node range expression (`gte:<token creation>`
     * on the first pass, `gt:<cursor>` thereafter) and is *required*: an unbounded
     * ascending query, or one whose range spans more history than Mirror Node will
     * scan, silently returns an empty page rather than an error. Anchoring the
     * first pass to the token's creation timestamp keeps the range tight.
     *
     * An empty page does NOT mean the end of the history — Mirror Node walks fixed
     * time windows and returns empty pages for quiet periods, still handing back a
     * `next` link. Callers must follow `nextLink` rather than stopping on a short page.
     */
    async getTokenMintTransactions(
        treasuryAccountId: string,
        timestampFilter: string,
    ): Promise<MintTransactionsResponse> {
        const url = '/api/v1/transactions';
        const params: Record<string, string | number> = {
            limit: HederaService.REST_API_MAX_LIMIT,
            order: 'asc',
            transactiontype: 'TOKENMINT',
            'account.id': treasuryAccountId,
            timestamp: timestampFilter,
        };

        this.logger.debug(`GET ${url} TOKENMINT treasury=${treasuryAccountId} timestamp=${timestampFilter}`);

        const response = await this.client.get(url, { params });

        return {
            transactions: response.data.transactions || [],
            nextLink: response.data.links?.next || null,
        };
    }

    /**
     * Fetches CRYPTOTRANSFER transactions for an account, oldest-first.
     *
     * Used to read a token treasury's outbound distributions — the hop that
     * moves freshly minted credits from the registry to whoever they were
     * issued for. Mirror Node has no per-token transfer feed, so this is scoped
     * by account and callers must discard `nft_transfers` for other tokens.
     *
     * Same pagination caveats as getTokenMintTransactions: an ascending query
     * needs a tight lower bound, and empty pages carry a live `next` link.
     */
    async getAccountNftTransfers(
        accountId: string,
        timestampFilter: string,
    ): Promise<TransferTransactionsResponse> {
        const url = '/api/v1/transactions';
        const params: Record<string, string | number> = {
            limit: HederaService.REST_API_MAX_LIMIT,
            order: 'asc',
            transactiontype: 'CRYPTOTRANSFER',
            'account.id': accountId,
            timestamp: timestampFilter,
        };

        this.logger.debug(`GET ${url} CRYPTOTRANSFER account=${accountId} timestamp=${timestampFilter}`);

        const response = await this.client.get(url, { params });

        return {
            transactions: response.data.transactions || [],
            nextLink: response.data.links?.next || null,
        };
    }

    /**
     * Resolves an EVM address to its Hedera account ID.
     *
     * Guardian's retirement events identify the retiring party by EVM address.
     * For an ECDSA account that address is derived from the public key and
     * carries no account number, so the ledger is the only place the mapping
     * exists. Returns null when the address is not a known account — the caller
     * keeps the raw address rather than dropping the retirement record.
     */
    async getAccountId(evmAddress: string): Promise<string | null> {
        const url = `/api/v1/accounts/${evmAddress}`;
        this.logger.debug(`GET ${url}`);
        try {
            const response = await this.client.get(url);
            const account = response.data?.account;
            return typeof account === 'string' ? account : null;
        } catch (error) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            // 404 = no such account; 400 = the mirror node rejected the address
            // format. Neither is retryable, and neither should stall the sweep.
            if (status === 404 || status === 400) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Fetches contract event logs, oldest-first.
     *
     * Used to read Guardian's RETIRE contracts, whose events are the only
     * documented record of a retirement — Mirror Node's `deleted` flag on an NFT
     * says a serial is gone but not when, by whom, or under which policy.
     *
     * `fromTimestamp` is the watermark of the last log already ingested.
     */
    async getContractLogs(contractId: string, fromTimestamp: string | null): Promise<ContractLogsResponse> {
        const url = `/api/v1/contracts/${contractId}/results/logs`;
        const params: Record<string, string | number> = {
            limit: HederaService.REST_API_MAX_LIMIT,
            order: 'asc',
        };
        if (fromTimestamp) {
            params['timestamp'] = `gt:${fromTimestamp}`;
        }

        this.logger.debug(`GET ${url} from=${fromTimestamp ?? 'start'}`);

        const response = await this.client.get(url, { params });

        return {
            logs: response.data.logs || [],
            nextLink: response.data.links?.next || null,
        };
    }
}
