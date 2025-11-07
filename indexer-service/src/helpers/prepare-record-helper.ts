import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction } from '@indexer/interfaces';
import { BatchLoadHelper } from "./batch-load-helper.js";
import { PerfHelper } from "./pefr-hepler.js";
import { fastLoadFiles } from './load-files.js';
import { SchemaFileHelper } from './schema-file-helper.js';


enum Files {
    DOCUMENT_FILE = 0,
    SCHEMA_FILE = 0,
    CONTEXT_FILE = 1
}

export class PrepareRecordHelper {
    private static parseFile(file: string | undefined): any | null {
        try {
            if (file) {
                return JSON.parse(file);
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    private static getSubject(documentFile: any): any {
        if (documentFile && documentFile.credentialSubject) {
            return documentFile.credentialSubject[0] || documentFile.credentialSubject
        }
        return null;
    }

    public static async prepareVCMessages() {
        console.log(`prepare VCs: `);
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');
        const documents = collection.find({
            type: MessageType.VC_DOCUMENT,
            action: MessageAction.CreateVC,
            files: { $exists: true, $not: { $size: 0 } }, //Process only messages with files
            loaded: true, //Not process record without loaded status
            parsedContextId: { $exists: false }, //Skip already processed          
        });

        await BatchLoadHelper.load<Message>(documents, BatchLoadHelper.DEFAULT_BATCH_SIZE, async (rows, counter) => {
            console.log(`prepare VCs: batch ${counter.batchIndex}} start. Loaded ${counter.loadedTotal}`);
            const cids = rows.map((document) => document.files[Files.DOCUMENT_FILE]);
            const fileMap = await fastLoadFiles(new Set(cids));
            for (const document of rows) {
                const documentFileId = document.files[Files.DOCUMENT_FILE];
                const documentFileString = fileMap.get(documentFileId);
                const documentFile = this.parseFile(documentFileString);
                const subject = this.getSubject(documentFile);
                if (!subject) {
                    continue;
                }
                const schemaContext = SchemaFileHelper.getDocumentContext(documentFile);
                let context = null;
                if (schemaContext) {
                    context = schemaContext;
                }

                //Save parsed data
                const row = em.getReference(Message, document._id);
                row.parsedContextId = context;
                em.persist(row)

            }
            console.log(`prepare VCs: flush batch`);
            await em.flush();
            await em.clear();
        });
    }

    private static getVcs(documentFile: any): any[] | null {
        if (documentFile && documentFile.verifiableCredential) {
            return Array.isArray(documentFile.verifiableCredential)
                ? documentFile.verifiableCredential
                : [documentFile.verifiableCredential];;
        }
        return null;
    }

    public static async prepareVPMessages() {
        console.log(`prepare VPs: `);
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');
        const documents = collection.find({
            type: MessageType.VP_DOCUMENT,
            files: { $exists: true, $not: { $size: 0 } }, //Process only messages with files
            loaded: true, //Not process record without loaded status
            parsedLinkedContextIds: { $exists: false }, //Skip already processed                
        });

        await BatchLoadHelper.load<Message>(documents, BatchLoadHelper.DEFAULT_BATCH_SIZE, async (rows, counter) => {
            console.log(`prepare VPs: batch ${counter.batchIndex} start. Loaded ${counter.loadedTotal}`);
            const cids = rows.map((document) => document.files[Files.DOCUMENT_FILE]);
            const fileMap = await fastLoadFiles(new Set(cids));
            for (const document of rows) {
                if (Array.isArray(document.files) && document.files.length > 0) {
                    const documentFileId = document.files[0];
                    const documentFileString = fileMap.get(documentFileId);
                    const documentFile = this.parseFile(documentFileString);
                    const vcs = this.getVcs(documentFile);

                    let contextIds = [];
                    if (vcs) {
                        for (const vc of vcs) {
                            const subject = this.getSubject(vc);
                            if (subject) {
                                const schemaContext = SchemaFileHelper.getDocumentContext(vc);
                                if (schemaContext) {
                                    contextIds.push(schemaContext);
                                }
                            }
                        }
                    }

                    //Save parsed data
                    const row = em.getReference(Message, document._id);
                    row.parsedLinkedContextIds = contextIds;
                    em.persist(row)
                }
            }
            console.log(`prepare VPs: flush batch`);
            await em.flush();
            await em.clear();
        });
    }
}