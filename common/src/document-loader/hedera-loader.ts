import { DidRootKey, DocumentLoader, IDocumentFormat } from '../hedera-modules';
import { DataBaseHelper, IPFS, Workers } from '../helpers';
import { DidDocument } from '../entity';
import { WorkerTaskType } from '@guardian/interfaces';

/**
 * Hedera loader
 */
export class HederaLoader extends DocumentLoader {
    /**
     * Has context
     * @param iri
     */
    public async has(iri: string): Promise<boolean> {
        if (!iri.startsWith('did:hedera:')) {
            return false;
        }
        const document = await this.getDocument(iri);
        return !document;

    }

    /**
     * Get formatted document
     * @param iri
     */
    public async get(iri: string): Promise<IDocumentFormat> {
        const did = DidRootKey.create(iri).getController();
        const splittedDid = did.split('_');
        const topicId = splittedDid[splittedDid.length - 1];

        const messages = await new Workers().addRetryableTask(
            {
                type: WorkerTaskType.GET_TOPIC_MESSAGES,
                data: {
                    operatorId: null,
                    operatorKey: null,
                    dryRun: false,
                    topic: topicId,
                },
            },
            10
        );
        const didMessage = messages
            .map(m => {
                try {
                    return JSON.parse(m.message);
                } catch (e) {
                    return undefined;
                }
            })
            .find(m => {
                return (m.type === 'DID-Document') && (m.did === did)
            });
        if (!didMessage) {
            return null
        }
        const didDocument = await IPFS.getFile(didMessage.cid, 'json')

        return {
            documentUrl: iri,
            document: didDocument
        };
    }

    /**
     * Get document
     * @param iri
     */
    public async getDocument(iri: string): Promise<any> {
        const did = DidRootKey.create(iri).getController();
        const didDocuments = await new DataBaseHelper(DidDocument).findOne({ did });
        if (didDocuments) {
            return didDocuments.document;
        }
        return false;
    }
}
