import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    DataBaseHelper,
    Message,
} from '@indexer/common';
import { parsePageParams } from '../utils/parse-page-params.js';
import { Page, SearchItem } from '@indexer/interfaces';

@Controller()
export class SearchService {
    @MessagePattern(IndexerMessageAPI.GET_SEARCH_API)
    async search(
        @Payload()
        msg: {
            search: string;
            pageSize?: number;
        }
    ) {
        try {
            msg.pageSize = 10;
            const options = parsePageParams(msg);
            const { search } = msg;

            const em = DataBaseHelper.getEntityManager();
            const [results, count] = (await em.findAndCount(
                Message,
                {
                    $text: {
                        $search: search,
                    },
                } as any,
                options
            )) as any as [SearchItem[], number];

            const result = {
                items: results,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };

            return new MessageResponse<Page<SearchItem>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
}
