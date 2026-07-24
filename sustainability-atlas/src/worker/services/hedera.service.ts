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
    deleted?: boolean;
}

export interface TopicMessagesResponse {
    messages: TopicMessage[];
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
}
