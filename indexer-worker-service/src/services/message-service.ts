import { MongoDriver, MongoEntityManager, ObjectId } from '@mikro-orm/mongodb';
import { RequiredEntityData } from '@mikro-orm/core';
import { Parser } from '../utils/parser.js';
import { IPFSService } from '../loaders/ipfs-service.js';
import { LogService } from './log-service.js';
import { DataBaseHelper, Job, MessageCache, Message, IndexerMessageAPI } from '@indexer/common';
import { MessageStatus, PriorityOptions, PriorityStatus } from '@indexer/interfaces';
import { ChannelService } from 'api/channel.service.js';

export interface IFile {
    id?: ObjectId;
    cid: string;
    document: string;
}

export class MessageService {
    public static CYCLE_TIME: number = 0;
    public static CHANNEL: ChannelService | null;

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
                json.loaded = MessageService.checkFiles(json);
                json.lastUpdate = Date.now();
                const messageRow = await MessageService.insertMessage(json, em);
                if (messageRow) {
                    row.status = MessageStatus.LOADED;
                } else {
                    row.status = MessageStatus.ERROR;
                }
            } else {
                row.status = MessageStatus.UNSUPPORTED;
            }
            
            row.priorityStatus = PriorityStatus.FINISHED;
            await em.flush();
            MessageService.onMessageFinished(row);
        } catch (error) {
            await LogService.error(error, 'update message');
        }
    }
    
    public static onMessageFinished(row: MessageCache) {
        if (MessageService.CHANNEL && row.priorityTimestamp) {
            MessageService.CHANNEL.publicMessage(IndexerMessageAPI.ON_PRIORITY_DATA_LOADED, {
                priorityTimestamp: row.priorityTimestamp
            });
        }
    }

    private static async randomMessage(em: MongoEntityManager<MongoDriver>): Promise<MessageCache> {
        const delay = Date.now() - MessageService.CYCLE_TIME;
        const rows = await em.find(MessageCache,
            {
                type: 'Message',
                $or: [
                    { priorityDate: { $ne: null } },
                    { status: MessageStatus.LOADING, lastUpdate: { $lt: delay } },
                    { status: MessageStatus.COMPRESSED }
                ]
            },
            {
                orderBy: [
                    { priorityDate: 'DESC' }
                ],
                limit: 50
                // fields: ['id', 'data', 'topicId', 'consensusTimestamp'],
            }
        )
        
        if (!rows || rows.length <= 0) {
            return null;
        }

        let row: any;
        if (rows[0].priorityDate) {
            row = rows[0]
        } else {
            const index = Math.min(Math.floor(Math.random() * rows.length), rows.length - 1);
            row = rows[index];
        }

        if (!row) {
            return null;
        }

        const count = await em.nativeUpdate(MessageCache, {
            _id: row._id,
            $or: [
                { priorityDate: { $ne: null } },
                { status: MessageStatus.LOADING, lastUpdate: { $lt: delay } },
                { status: MessageStatus.COMPRESSED }
            ]
        }, {
            lastUpdate: Date.now(),
            status: MessageStatus.LOADING,
            priorityDate: null,
            priorityStatus: PriorityStatus.RUNNING
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

    public static async saveImmediately(rows: MessageCache[], priorityOptions?: PriorityOptions): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        for (const message of rows) {
            try {
                const ref = em.getReference(MessageCache, message._id);
                const json = Parser.parseMassage(message);
                if (json) {
                    if (!json.files || !json.files.length) {
                        const row = em.create(Message, json);
                        row.documents = [];
                        row.loaded = MessageService.checkFiles(row);
                        row.lastUpdate = Date.now();
                        em.persist(row);
                        ref.status = MessageStatus.LOADED;
                        ref.priorityDate = null;
                        ref.priorityStatus = PriorityStatus.FINISHED;
                        ref.priorityStatusDate = priorityOptions.priorityStatusDate;
                        ref.priorityTimestamp = priorityOptions.priorityTimestamp;
                        await em.flush();
                    }
                } else {
                    ref.status = MessageStatus.UNSUPPORTED;
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
                if (cid) {
                    cids.push(file);
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

    public static checkFiles(message: Message): boolean {
        const links = message.files?.length || 0;
        const files = message.documents?.length || 0;
        return links === files;
    }
}
