import axios from 'axios';
import { Environment, TokenInfo, TokenInstances, TopicInfo } from '@indexer/common';

export class HederaService {
    private static mirrorNodeUrl: string;

    /**
     * Rest API max limit
     */
    public static readonly REST_API_MAX_LIMIT: number = 100;

    public static async init() {
        HederaService.mirrorNodeUrl = Environment.mirrorNode;
    }

    public static async getMessages(topicId: string, lastNumber: number): Promise<TopicInfo | null> {
        try {
            const url = HederaService.mirrorNodeUrl + 'topics/' + topicId + '/messages';
            const option: any = {
                params: {
                    limit: HederaService.REST_API_MAX_LIMIT
                },
                responseType: 'json',
                timeout: 2 * 60 * 1000,
            };
            if (lastNumber > 0) {
                option.params.sequencenumber = `gt:${lastNumber}`;
            }
            const response = await axios.get(url, option);
            const topicInfo = response?.data as TopicInfo;
            if (topicInfo && Array.isArray(topicInfo.messages)) {
                if (!topicInfo.links) {
                    topicInfo.links = { next: null };
                }
                return topicInfo;
            } else {
                return null;
            }
        } catch (error) {
            console.log('getMessages ', topicId, error.message);
            throw error;
        }
    }

    public static async getToken(tokenId: string): Promise<TokenInfo | null> {
        try {
            const url = HederaService.mirrorNodeUrl + 'tokens/' + tokenId;
            const option: any = {
                responseType: 'json',
                timeout: 2 * 60 * 1000,
            };
            const response = await axios.get(url, option);
            const tokenInfo = response?.data as TokenInfo;
            if (tokenInfo) {
                return tokenInfo;
            } else {
                return null;
            }
        } catch (error) {
            console.log('getToken ', tokenId, error.message);
            throw error;
        }
    }

    public static async getSerials(tokenId: string, lastNumber: number): Promise<TokenInstances | null> {
        const url = HederaService.mirrorNodeUrl + 'tokens/' + tokenId + '/nfts';
        const option: any = {
            params: {
                order: 'asc',
                limit: HederaService.REST_API_MAX_LIMIT
            },
            responseType: 'json',
            timeout: 2 * 60 * 1000,
        };
        if (lastNumber > 0) {
            option.params.serialnumber = `gt:${lastNumber}`;
        }
        const response = await axios.get(url, option);
        const tokenInfo = response?.data as TokenInstances;
        if (tokenInfo && Array.isArray(tokenInfo.nfts)) {
            if (!tokenInfo.links) {
                tokenInfo.links = { next: null };
            }
            return tokenInfo;
        } else {
            return null;
        }
    }
}
