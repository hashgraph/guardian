import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    AnyResponse,
    IPage,
    IResults,
    DataBaseHelper,
    MessageCache,
    DataBaseUtils,
    TopicCache,
    Message,
    TokenCache,
    NftCache,
    MessageType
} from '@indexer/common';
import { RelationshipsUtils } from '../utils/relationships-utils.js';

interface IPageFilters {
    pageIndex?: number | string;
    pageSize?: number | string;
    orderDir?: string;
    orderField?: string;
    [field: string]: any;
}

interface IDetailsResults {
    id: string,
    uuid?: string;
    item?: any,
    history?: any[],
    row?: any
}

interface IRelationshipsResults {
    id: string,
    item?: any,
    target?: any,
    relationships?: any[],
    links?: any[]
}

const pageOptions = new Set(['pageSize', 'pageIndex', 'orderField', 'orderDir']);

function parsePageParams(msg: IPageFilters) {
    return DataBaseUtils.pageParams(msg.pageSize, msg.pageIndex, 100, msg.orderField, msg.orderDir);
}

function parsePageFilters(msg: IPageFilters) {
    const filters: any = {};
    const keys = Object.keys(msg).filter((name) => !pageOptions.has(name));
    for (const key of keys) {
        filters[key] = msg[key];
    }
    return filters;
}

async function loadDocuments(row: Message): Promise<Message> {
    if (row?.files?.length) {
        row.documents = [];
        for (const fileName of row.files) {
            const file = await DataBaseHelper.loadFile(fileName);
            row.documents.push(file);
        }
    }
    return row;
}

@Controller()
export class EntityService {

    // ----------------------------
    // ------------ VP ------------
    // ----------------------------

    /**
     * Get vp documents
     * @param {IPageFilters} msg filters
     * @returns {IPage} pages
     */
    @MessagePattern(IndexerMessageAPI.GET_VP_DOCUMENTS)
    async getVpDocuments(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.VP_DOCUMENT;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(Message, filters, options);
            const result: IPage<Message> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy
            }
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Get vp document
     * @param msg options
     * @returns details
     */
    @MessagePattern(IndexerMessageAPI.GET_VP_DOCUMENT)
    async getVpDocument(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.VP_DOCUMENT
            });
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row
                });
            }

            await loadDocuments(item);
            const history = await em.find(Message, {
                uuid: item.uuid,
                type: MessageType.VP_DOCUMENT
            }, {
                orderBy: {
                    consensusTimestamp: 'ASC'
                }
            });
            for (const row of history) {
                await loadDocuments(row);
            }
            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                history,
                row
            });
        } catch (error) {
            return new MessageError(error);
        }
    }


    /**
     * Get vp relationships
     * @param msg options
     * @returns details
     */
    @MessagePattern(IndexerMessageAPI.GET_VP_RELATIONSHIPS)
    async getVpRelationships(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IRelationshipsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.VP_DOCUMENT
            });
            if (!item) {
                return new MessageResponse<IRelationshipsResults>({
                    id: messageId
                });
            }

            const utils = new RelationshipsUtils(item);
            const { target, relationships, links } = await utils.load();

            return new MessageResponse<IRelationshipsResults>({
                id: messageId,
                item,
                target,
                relationships,
                links
            });
        } catch (error) {
            console.log(error)
            return new MessageError(error);
        }
    }

    // ----------------------------
    // ------------ VC ------------
    // ----------------------------

    /**
     * Get vc documents
     * @param {IPageFilters} msg filters
     * @returns {IPage} pages
     */
    @MessagePattern(IndexerMessageAPI.GET_VC_DOCUMENTS)
    async getVcDocuments(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.VC_DOCUMENT;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(Message, filters, options);
            const result: IPage<Message> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy
            }
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Get vc document
     * @param msg options
     * @returns details
     */
    @MessagePattern(IndexerMessageAPI.GET_VC_DOCUMENT)
    async getVcDocument(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.VC_DOCUMENT
            });
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row
                });
            }

            await loadDocuments(item);
            const history = await em.find(Message, {
                uuid: item.uuid,
                type: MessageType.VC_DOCUMENT
            }, {
                orderBy: {
                    consensusTimestamp: 'ASC'
                }
            });
            for (const row of history) {
                await loadDocuments(row);
            }
            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                history,
                row
            });
        } catch (error) {
            return new MessageError(error);
        }
    }


    /**
     * Get vc relationships
     * @param msg options
     * @returns details
     */
    @MessagePattern(IndexerMessageAPI.GET_VC_RELATIONSHIPS)
    async getVcRelationships(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IRelationshipsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.VC_DOCUMENT
            });
            if (!item) {
                return new MessageResponse<IRelationshipsResults>({
                    id: messageId
                });
            }

            const utils = new RelationshipsUtils(item);
            const { target, relationships, links } = await utils.load();

            return new MessageResponse<IRelationshipsResults>({
                id: messageId,
                item,
                target,
                relationships,
                links
            });
        } catch (error) {
            console.log(error)
            return new MessageError(error);
        }
    }

}