import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    DataBaseHelper,
    Message,
    ElasticCache,
    ElasticHelper,
    ElasticItem,
    FileHelper
} from '@indexer/common';
import { readFile } from 'fs/promises';
import path from 'path';

@Controller()
export class ElasticService {
    public static async updateElastic() {
        const filePath = path.join(process.cwd(), 'certificates', 'http_ca.crt');
        const http_ca = await readFile(filePath);
        const elastic = new ElasticHelper({
            node: process.env.ELASTIC_NODE,
            auth: {
                username: process.env.ELASTIC_USER,
                password: process.env.ELASTIC_PASSWORD
            },
            tls: {
                ca: http_ca,
                rejectUnauthorized: false
            }
        });
        const em = DataBaseHelper.getEntityManager();
        const fh = new FileHelper(DataBaseHelper.gridFS);

        await fh.load();

        const elasticCache = new Map<string, number>();
        const elasticCollection = em.getCollection(ElasticCache).find({});
        while (await elasticCollection.hasNext()) {
            const row = await elasticCollection.next();
            elasticCache.set(row.consensusTimestamp, row.status || 0);
        }

        const dataset: ElasticItem[] = [];
        const collection = em.getCollection(Message);
        const messages = collection.find({});

        let i = 1;
        while (await messages.hasNext()) {
            const message = await messages.next();
            const status = elasticCache.get(message.consensusTimestamp);
            if (status === 200) {
                continue;
            }

            message.documents = [];
            if (message.files.length) {
                for (const fileName of message.files) {
                    const file = await fh.get(fileName);
                    message.documents.push(file);
                }
            }

            const id = message.consensusTimestamp;
            const index = await elastic.getIndex(message.type);

            dataset.push({
                index,
                document: {
                    id,
                    timestamp: message.consensusTimestamp,
                    type: message.type,
                    status: message.status,
                    statusReason: message.statusReason,
                    statusMessage: message.statusMessage,
                    action: message.action,
                    lang: message.lang,
                    attributes: message.options,
                    documents: message.documents
                },
            });

            if (dataset.length % 100 === 0) {
                const elasticResponse = await elastic.insert(dataset);
                const rows = elasticResponse.map((row) => {
                    return { consensusTimestamp: row.id, status: row.status, error: row.error }
                })
                await em.upsertMany(ElasticCache, rows);
                dataset.length = 0;
            }
        }
        if (dataset.length) {
            const elasticResponse = await elastic.insert(dataset);
            const rows = elasticResponse.map((row) => {
                return { consensusTimestamp: row.id, status: row.status, error: row.error }
            })
            await em.upsertMany(ElasticCache, rows);
        }

        fh.close();
        await elastic.close();
    }


    /**
     * 
     * @param msg options
     */
    @MessagePattern(IndexerMessageAPI.ELASTIC_UPDATE_DATA)
    async start(
        @Payload()
        msg: {}
    ) {
        try {
            await ElasticService.updateElastic();
            return new MessageResponse(true);
        } catch (error) {
            return new MessageError(error);
        }
    }
}