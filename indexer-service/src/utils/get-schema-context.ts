import { IPFS_CID_PATTERN } from '@indexer/interfaces';

export function getSchemaContextCID(document: { '@context' }): string {
    if (!document) {
        return null;
    }
    let contexts = document['@context'];
    if (!contexts) {
        return null;
    }
    contexts = Array.isArray(contexts) ? contexts : [contexts];
    for (const context of contexts) {
        if (typeof context === 'string') {
            const matches = context?.match(IPFS_CID_PATTERN);
            const schemaContextCID = matches && matches[0];
            if (schemaContextCID) {
                return schemaContextCID;
            }
        }
    }
    return null;
}
