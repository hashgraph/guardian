import { MongoDriver, MongoEntityManager, ObjectId } from '@mikro-orm/mongodb';
import { DataBaseHelper, Job, Message } from '@indexer/common';
import { LogService } from './log-service.js';
import { MessageService } from './message-service.js';

export class FileService {
    public static CYCLE_TIME: number = 0;
    public static InProgress: ObjectId[] = [];

    public static async updateFile(job: Job) {
        try {
            const em = DataBaseHelper.getEntityManager();
            const row = await FileService.randomMessage(em);
            if (!row) {
                job.sleep();
                return;
            }
            const documents = await MessageService.loadDocuments(row);
            if (documents) {
                row.documents = documents;
                row.loaded = MessageService.checkFiles(row);
                await em.nativeUpdate(Message, {
                    _id: row._id,
                }, {
                    documents,
                    loaded: true
                });
            }
        } catch (error) {
            await LogService.error(error, 'update message');
        }
    }

    private static async randomMessage(em: MongoEntityManager<MongoDriver>): Promise<Message> {
        const now = Date.now();
        const delay = now - FileService.CYCLE_TIME;

        const collection = em.getCollection(Message);

        const sample = await collection.aggregate([
            { $match: { lastUpdate: { $lt: delay }, loaded: false } },
            { $sort:  { lastUpdate: 1 } },
            { $limit: 50 },
            { $sample: { size: 1 } },
            { $project: { _id: 1 } }
        ]).toArray();

        const candidate = sample[0];
        if (!candidate) {
            return null;
        }

        const result = await collection.findOneAndUpdate(
            { _id: candidate._id, lastUpdate: { $lt: delay } },
            { $set: { lastUpdate: now } },
            { returnDocument: 'before' }
        );

        if (result) {
            return em.map(Message, result);
        }

        return null;
    }
}
