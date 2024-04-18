import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    IPage,
    IResults,
    DataBaseHelper,
    MessageCache,
    DataBaseUtils,
    TopicCache,
    Message,
    TokenCache,
    NFTCache
} from '@indexer/common';

@Controller()
export class SearchService {
    /**
     * 
     * @param msg options
     */
    @MessagePattern(IndexerMessageAPI.GET_SEARCH_API)
    async search(
        @Payload()
        msg: {
            search: string;
        }
    ) {
        try {
            const { search } = msg;
            if (!search || typeof search !== 'string') {
                return new MessageResponse<IResults<any>>({ results: null });
            }

            const em = DataBaseHelper.getEntityManager();
            const topics = await em.find(TopicCache, { topicId: search });
            const tokens = await em.find(TokenCache, { tokenId: search });
            const messages = await em.find(MessageCache, { consensusTimestamp: search });
            const documents = await em.find(Message, { consensusTimestamp: search });

            const results = [];
            for (const topic of topics) {
                results.push({
                    type: 'topic',
                    id: topic.topicId
                })
            }
            for (const token of tokens) {
                results.push({
                    type: 'token',
                    id: token.tokenId
                })
            }
            for (const message of messages) {
                results.push({
                    type: 'message',
                    id: message.consensusTimestamp
                })
            }
            for (const document of documents) {
                results.push({
                    type: document.type,
                    id: document.consensusTimestamp
                })
            }

            return new MessageResponse<IResults<any>>({ results });
        } catch (error) {
            return new MessageError(error);
        }
    }
}