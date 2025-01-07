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
        const delay = Date.now() - FileService.CYCLE_TIME;
        const rows = await em.find(Message,
            {
                lastUpdate: { $lt: delay },
                loaded: false
            },
            {
                orderBy: { lastUpdate: 'ASC' },
                limit: 50,
            }
        )
        const index = Math.min(Math.floor(Math.random() * rows.length), rows.length - 1);
        const row = rows[index];

        if (!row) {
            return null;
        }

        const count = await em.nativeUpdate(Message, {
            _id: row._id,
            lastUpdate: { $lt: delay }
        }, {
            lastUpdate: Date.now()
        });

        if (count) {
            return row;
        } else {
            return null;
        }
    }
}