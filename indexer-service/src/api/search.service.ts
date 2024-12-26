import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    DataBaseHelper,
    Message,
    TokenCache,
} from '@indexer/common';
import { parsePageParams } from '../utils/parse-page-params.js';
import { Page, SearchItem } from '@indexer/interfaces';
import escapeStringRegexp from 'escape-string-regexp';

function createRegex(text: string) {
    return {
        $regex: `.*${escapeStringRegexp(text).trim()}.*`,
        $options: 'si',
    }
}

@Controller()
export class SearchService {
    @MessagePattern(IndexerMessageAPI.GET_SEARCH_API)
    async search(
        @Payload()
        msg: {
            pageIndex: number,
            pageSize: number,
            search: string
        }
    ) {
        try {
            if (!msg.pageIndex || !msg.pageSize) {
                throw new Error('Invalid page parameters')
            }
            const options = parsePageParams(msg);
            const { search } = msg;

            const em = DataBaseHelper.getEntityManager();

            const [tokens, tokensCount] = (await em.findAndCount(
                TokenCache,
                {
                    'tokenId': search
                } as any,
                options
            )) as any as [SearchItem[], number];
            const [messages, messagesCount] = (await em.findAndCount(
                Message,
                {
                    $or: [
                        {
                            'analytics.textSearch': createRegex(search)
                        },
                        {
                            'topicId': search
                        },
                        {
                            'tokenId': search
                        },
                        {
                            'consensusTimestamp': search
                        },
                        {
                            'owner': search
                        },
                        {
                            'type': search
                        },
                        {
                            'action': search
                        },
                    ]
                } as any,
                {
                    ...options,
                    offset: Math.max(options.offset - tokensCount, 0),
                    limit: Math.max(options.limit - tokens.length, 0),
                }
            )) as any as [SearchItem[], number];

            const result = {
                items: [...tokens, ...messages],
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: tokensCount + messagesCount,
                order: options.orderBy,
            };

            return new MessageResponse<Page<SearchItem>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
}
