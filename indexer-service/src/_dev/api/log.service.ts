import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    IPage,
    DataBaseHelper,
    MessageCache,
    DataBaseUtils,
    TopicCache,
    Message,
    TokenCache,
    NftCache
} from '@indexer/common';

@Controller()
export class LogService {
    /**
     * Get all messages
     * @param msg options
     * @returns messages
     */
    @MessagePattern(IndexerMessageAPI.GET_LOG_MESSAGES)
    async getAllMessages(
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
            timestamp?: string;
        }
    ) {
        try {
            const { type, status, timestamp, pageIndex, pageSize, orderField, orderDir } = msg;

            const filters: any = {};
            if (type) {
                filters.type = type;
            }
            if (status) {
                filters.status = status;
            }
            if (timestamp) {
                filters.consensusTimestamp = timestamp;
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


    /**
     * Get all topics
     * @param msg options
     * @returns topics
     */
    @MessagePattern(IndexerMessageAPI.GET_LOG_TOPICS)
    async getAllTopics(
        @Payload()
        msg: {
            //page
            pageIndex: number;
            pageSize: number;
            //sort
            orderField?: string;
            orderDir?: string;
            //filters
        }
    ) {
        try {
            const { pageIndex, pageSize, orderField, orderDir } = msg;

            const filters: any = {};
            const em = DataBaseHelper.getEntityManager();
            const options = DataBaseUtils.pageParams(pageSize, pageIndex, 100, orderField, orderDir);
            const [rows, count] = await em.findAndCount(TopicCache, filters, options);

            const result: IPage<TopicCache> = {
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

    /**
     * Get all topics
     * @param msg options
     * @returns topics
     */
    @MessagePattern(IndexerMessageAPI.GET_LOG_DOCUMENTS)
    async getAllDocuments(
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
            action?: string;
            timestamp?: string;
        }
    ) {
        try {
            const {
                type,
                status,
                action,
                timestamp,
                pageIndex,
                pageSize,
                orderField,
                orderDir
            } = msg;

            const filters: any = {};
            if (type) {
                filters.type = type;
            }
            if (status) {
                filters.status = status;
            }
            if (action) {
                filters.action = action;
            }
            if (timestamp) {
                filters.consensusTimestamp = timestamp;
            }

            const em = DataBaseHelper.getEntityManager();
            const options = DataBaseUtils.pageParams(pageSize, pageIndex, 100, orderField, orderDir);
            const [rows, count] = await em.findAndCount(Message, filters, options);

            for (const row of rows) {
                row.documents = [];
                for (const fileName of row.files) {
                    try {
                        const file = await DataBaseHelper.loadFile(fileName);
                        row.documents.push(file);
                    } catch (error) {
                        row.documents.push(null);
                    }
                }
            }

            const result: IPage<Message> = {
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

    /**
     * Get all topics
     * @param msg options
     * @returns topics
     */
    @MessagePattern(IndexerMessageAPI.GET_LOG_DOCUMENT_FILTERS)
    async getDocumentFilters() {
        try {
            const em = DataBaseHelper.getEntityManager();
            const status = await em.aggregate(Message, [{ $group: { _id: '$status' } }]);
            const action = await em.aggregate(Message, [{ $group: { _id: '$action' } }]);
            const type = await em.aggregate(Message, [{ $group: { _id: '$type' } }]);
            const result = {
                actions: action.map((row) => row._id),
                types: type.map((row) => row._id),
                statuses: status.map((row) => row._id)
            }
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Get all tokens
     * @param msg options
     * @returns tokens
     */
    @MessagePattern(IndexerMessageAPI.GET_LOG_TOKENS)
    async getAllTokens(
        @Payload()
        msg: {
            //page
            pageIndex: number;
            pageSize: number;
            //sort
            orderField?: string;
            orderDir?: string;
            //filters
            type?: number;
            tokenId?: string;
        }
    ) {
        try {
            const {
                pageIndex,
                pageSize,
                orderField,
                orderDir,
                type,
                tokenId
            } = msg;

            const filters: any = {};
            if (type) {
                filters.type = type;
            }
            if (tokenId) {
                filters.tokenId = tokenId;
            }
            const em = DataBaseHelper.getEntityManager();
            const options = DataBaseUtils.pageParams(pageSize, pageIndex, 100, orderField, orderDir);
            const [rows, count] = await em.findAndCount(TokenCache, filters, options);

            const result: IPage<TokenCache> = {
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

    /**
     * Get all tokens
     * @param msg options
     * @returns tokens
     */
    @MessagePattern(IndexerMessageAPI.GET_LOG_NFTS)
    async getAllNfts(
        @Payload()
        msg: {
            //page
            pageIndex: number;
            pageSize: number;
            //sort
            orderField?: string;
            orderDir?: string;
            //filters
            tokenId?: string;
            serialNumber?: number;
            metadata?: string;
        }
    ) {
        try {
            const {
                pageIndex,
                pageSize,
                orderField,
                orderDir,
                tokenId,
                serialNumber,
                metadata
            } = msg;

            const filters: any = {};
            if (tokenId) {
                filters.tokenId = tokenId;
            }
            if (tokenId) {
                filters.serialNumber = serialNumber;
            }
            if (metadata) {
                filters.metadata = metadata;
            }

            const em = DataBaseHelper.getEntityManager();
            const options = DataBaseUtils.pageParams(pageSize, pageIndex, 100, orderField, orderDir);
            const [rows, count] = await em.findAndCount(NftCache, filters, options);

            const result: IPage<NftCache> = {
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