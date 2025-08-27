import { IPFS_CID_PATTERN, Message, MessageType } from "@indexer/interfaces";

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
}