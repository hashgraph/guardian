import { MongoDriver, MongoEntityManager, ObjectId } from '@mikro-orm/mongodb';
import { RequiredEntityData } from '@mikro-orm/core';
import { Parser } from '../utils/parser.js';
import { IPFSService } from '../loaders/ipfs-service.js';
import { LogService } from './log-service.js';
import { DataBaseHelper, Job, MessageCache, Message } from '@indexer/common';

export interface IFile {
    id?: ObjectId;
    cid: string;
    document: string;
}

export class MessageService {
    public static CYCLE_TIME: number = 0;

    public static async updateMessage(job: Job) {
        try {
            const em = DataBaseHelper.getEntityManager();
            const row = await MessageService.randomMessage(em);
            if (!row) {
                job.sleep();
                return;
            }

            const json = Parser.parseMassage(row);
            if (json) {
                const documents = await MessageService.loadDocuments(json);
                json.documents = documents;
                const messageRow = await MessageService.insertMessage(json, em);
                if (messageRow) {
                    row.status = 'LOADED';
                } else {
                    row.status = 'ERROR';
                }
            } else {
                row.status = 'UNSUPPORTED';
            }
            await em.flush();
        } catch (error) {
            await LogService.error(error, 'update message');
        }
    }

    private static async randomMessage(em: MongoEntityManager<MongoDriver>): Promise<MessageCache> {
        const delay = Date.now() - MessageService.CYCLE_TIME;
        const rows = await em.find(MessageCache,
            {
                type: "Message",
                $or: [
                    { status: 'LOADING', lastUpdate: { $lt: delay } },
                    { status: 'COMPRESSED' }
                ]
            },
            {
                limit: 50
                // fields: ['id', 'data', 'topicId', 'consensusTimestamp'],
            }
        )
        const index = Math.min(Math.floor(Math.random() * rows.length), rows.length - 1);
        const row = rows[index];

        if (!row) {
            return null;
        }

        const count = await em.nativeUpdate(MessageCache, {
            _id: row._id,
            $or: [
                { status: 'LOADING', lastUpdate: { $lt: delay } },
                { status: 'COMPRESSED' }
            ]
        }, {
            lastUpdate: Date.now(),
            status: 'LOADING'
        });

        if (count) {
            return row;
        } else {
            return null;
        }
    }

    public static async insertMessage(
        message: RequiredEntityData<Message>,
        em: MongoEntityManager<MongoDriver>
    ): Promise<Message> {
        try {
            const row = em.create(Message, message);
            em.persist(row);
            await em.flush();
            return row;
        } catch (error) {
            return await em.findOne(Message, { consensusTimestamp: message.consensusTimestamp });
        }
    }

    public static async saveImmediately(rows: MessageCache[]): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        for (const message of rows) {
            try {
                const ref = em.getReference(MessageCache, message._id);
                const json = Parser.parseMassage(message);
                if (json) {
                    if (!json.files || !json.files.length) {
                        const row = em.create(Message, json);
                        row.documents = [];
                        em.persist(row);
                        ref.status = 'LOADED';
                        await em.flush();
                    }
                } else {
                    ref.status = 'UNSUPPORTED';
                    await em.flush();
                }
            } catch (error) {
                await LogService.error(error, 'save immediately');
            }
        }
    }

    public static async loadDocuments(message: Message): Promise<string[] | null> {
        const cids = MessageService.getCIDs(message);

        if (!cids) {
            return null;
        }

        if (!cids.length) {
            return [];
        }

        const fileIds: string[] = [];
        for (const cid of cids) {
            const fileId = await MessageService.loadFiles(cid);
            if (fileId === null) {
                return null;
            }
            fileIds.push(fileId);
        }
        return fileIds;
    }

    public static getCIDs(message: Message): string[] | null {
        const cids = [];
        if (Array.isArray(message.files)) {
            for (const file of message.files) {
                const cid = IPFSService.parseCID(file);
                if (cid && cid.version === 1) {
                    cids.push(cid.toString());
                } else {
                    return null;
                }
            }
        }
        return cids;
    }

    public static async loadFiles(cid: string): Promise<string | null> {
        const existingFile = await DataBaseHelper.gridFS.find({
            filename: cid
        }).toArray();
        if (existingFile.length > 0) {
            return existingFile[0]._id.toString();
        }
        const document = await IPFSService.getFile(cid);
        if (!document) {
            return null;
        }
        return new Promise<string>((resolve, reject) => {
            try {
                const fileStream = DataBaseHelper.gridFS.openUploadStream(cid);
                fileStream.write(document);
                fileStream.end(() => {
                    console.log('wrote: ', fileStream.id);
                    resolve(fileStream.id?.toString());
                });
            } catch (error) {
                console.log(error);
                reject(error);
            }
        });
    }
}
