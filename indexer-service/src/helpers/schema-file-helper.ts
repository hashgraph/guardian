import { IPFS_CID_PATTERN, Message, MessageAction, MessageType } from "@indexer/interfaces";
import { MongoDriver, MongoEntityManager } from "@mikro-orm/mongodb";
import { DataBaseHelper, Message as MessageCollection } from "@indexer/common";

export class SchemaFileHelper {
    public static getDocumentFile(row: Message): string | null {
        if (row && Array.isArray(row.files)) {
            return row.files[0];
        }
        return null;
    }

    public static getContextFile(row: Message): string | null {
        if (row && Array.isArray(row.files)) {
            const id = row.files[1];
            if (typeof id === 'string') {
                if (row.virtual) {
                    return id.split('#')[0];
                } else {
                    return id;
                }
            }
        }
        return null;
    }

    public static getSchemaFilter(
        type: { context: string, type: string },
        topicId?: string
    ) {
        const filter: any = {
            type: MessageType.SCHEMA,
            $or: [{
                'files.1': type.context
            }, {
                'files.1': type.context + '#' + type.type
            }]
        }
        if (topicId) {
            filter.topicId = topicId;
        }
        return filter;
    }

    public static findInMap(
        schemaMap: Map<string, Message>,
        type: { context: string, type: string }
    ): Message | null {
        return (
            schemaMap.get(type.context) ||
            schemaMap.get(type.context + '#' + type.type)
        );
    }

    public static getDocumentContext(file: string | any): { context: string, type: string } | null {
        try {
            const document = typeof file === 'string' ? JSON.parse(file) : file;
            const credentialSubject = SchemaFileHelper.getCredentialSubject(document);
            const type = credentialSubject?.type;
            let contexts = document['@context'];
            contexts = Array.isArray(contexts) ? contexts : [contexts];
            for (const context of contexts) {
                if (typeof context === 'string') {
                    const matches = context?.match(IPFS_CID_PATTERN);
                    const contextCID = matches && matches[0];
                    if (contextCID) {
                        return { context: contextCID, type };
                    }
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    public static getCredentialSubject(document: any) {
        if (document) {
            if (document.credentialSubject) {
                if (Array.isArray(document.credentialSubject)) {
                    return document.credentialSubject[0]
                } else {
                    return document.credentialSubject;
                }
            }
        }
        return document;
    }

    public static async unpack(
        em: MongoEntityManager<MongoDriver>,
        item: MessageCollection,
        allSchemas: MessageCollection[],
        fileMap: Map<string, string>
    ) {
        const documentFileId = item.files[0];
        const contextFileId = item.documents[1];
        const metadataFileId = item.files[2];
        const documentString = fileMap.get(documentFileId);
        const metadataString = fileMap.get(metadataFileId);

        const documentMap = SchemaFileHelper.parseDocument(documentString);
        const schemas = SchemaFileHelper.parseMetadata(metadataString);

        for (let index = 0; index < schemas.length; index++) {
            const schema = schemas[index];
            const document = documentMap[schema.id];
            const documentId = await SchemaFileHelper.saveDocument(document, documentFileId + schema.id);
            const json = {
                topicId: item.topicId,
                consensusTimestamp: `${item.consensusTimestamp}_${index + 1}`,
                owner: item.owner,
                sequenceNumber: item.sequenceNumber,
                status: item.status,
                statusReason: item.statusReason,
                lang: item.lang,
                responseType: item.responseType,
                type: MessageType.SCHEMA,
                action: (
                    item.action === MessageAction.PublishSchemas ?
                        MessageAction.PublishSchema :
                        MessageAction.PublishSystemSchema
                ),
                uuid: item.uuid,
                options: {
                    id: schema.id,
                    name: schema.name,
                    description: schema.description,
                    entity: schema.entity,
                    owner: schema.owner,
                    uuid: schema.uuid,
                    version: schema.version,
                    codeVersion: schema.codeVersion,
                    packageMessageId: item.consensusTimestamp,
                    unpacked: true
                },
                documents: [documentId, contextFileId],
                files: [
                    item.files[0] + schema.id,
                    item.files[1] + schema.id,
                ],
                virtual: true,
                loaded: true,
                lastUpdate: Date.now()
            }
            const row = em.create(MessageCollection, json);
            allSchemas.push(row);
        }
        return allSchemas;
    }


    private static parseMetadata(file: string): any[] | null {
        try {
            if (file) {
                const metadata = JSON.parse(file);
                const schemas = metadata.schemas;
                if (Array.isArray(schemas)) {
                    return schemas;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    private static parseDocument(file: string): any {
        try {
            if (file) {
                const map = JSON.parse(file);
                if (typeof map === 'object') {
                    return map;
                }
            }
            return {};
        } catch (error) {
            return {};
        }
    }

    private static saveDocument(document: any, name: string) {
        return new Promise<string>((resolve, reject) => {
            try {
                if (!document) {
                    resolve(null);
                    return;
                }
                const text = JSON.stringify(document);
                const fileStream = DataBaseHelper.gridFS.openUploadStream(name);
                fileStream.write(text);
                fileStream.end(() => {
                    resolve(fileStream.id?.toString());
                });
            } catch (error) {
                console.log(error);
                reject(error);
            }
        });
    }
}