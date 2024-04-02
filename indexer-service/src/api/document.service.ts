import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    IPage,
    DataBaseHelper,
    MessageCache,
    DataBaseUtils
} from '@indexer/common';

@Controller()
export class DocumentsService {
    /**
     * Get all notifications
     * @param msg options
     * @returns Notifications and count
     */
    @MessagePattern(IndexerMessageAPI.GET_MESSAGES)
    async getAll(
        @Payload()
        msg: {
            //page
            pageIndex: number;
            pageSize: number;
            //sort
            orderField?: string;
            orderDir?: string;
            //filters
            type?: string;
            status?: string;
        }
    ) {
        try {
            const { type, status, pageIndex, pageSize, orderField, orderDir } = msg;

            const filters: any = {};
            if (type) {
                filters.type = type;
            }
            if (status) {
                filters.status = status;
            }

            const em = DataBaseHelper.getEntityManager();
            const options = DataBaseUtils.pageParams(pageSize, pageIndex, 100, orderField, orderDir);
            const [rows, count] = await em.findAndCount(MessageCache, filters, options);

            const result: IPage<MessageCache> = {
                items: rows,
                pageIndex: pageIndex,
                pageSize: pageSize,
                total: count,
                order: options.orderBy
            }
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
}