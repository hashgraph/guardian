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
            search?: string
        }
    ) {
        try {
            if (!msg.pageIndex || !msg.pageSize) {
                throw new Error('Invalid page parameters')
            }
            const options = parsePageParams(msg);
            const search = msg.search ?? '';

            const em = DataBaseHelper.getEntityManager();

            const [tokens, tokensCount] = (await em.findAndCount(
                TokenCache,
                {
                    'tokenId': search
                } as any,
                options
            )) as any as [SearchItem[], number];

            const messagesFilter = {
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
            } as any;
            // When the token match already fills the requested page this subtraction
            // yields 0, which MongoDB reads as "no limit" rather than "nothing left to
            // fetch" - a single request would then load the whole Message collection.
            // Skip the document query and count instead, so total stays correct.
            const messagesLimit = Math.max(options.limit - tokens.length, 0);

            let messages: SearchItem[] = [];
            let messagesCount: number;
            if (messagesLimit > 0) {
                [messages, messagesCount] = (await em.findAndCount(
                    Message,
                    messagesFilter,
                    {
                        ...options,
                        offset: Math.max(options.offset - tokensCount, 0),
                        limit: messagesLimit,
                    }
                )) as any as [SearchItem[], number];
            } else {
                messagesCount = await em.count(Message, messagesFilter);
            }

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
