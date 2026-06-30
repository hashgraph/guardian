import { DidURL, DocumentLoader, HederaDid, IDocumentFormat } from '../hedera-modules/index.js';
import { IPFS, TTLCache, Workers } from '../helpers/index.js';
import { WorkerTaskType } from '@guardian/interfaces';

/**
 * Remote DID Document loader
 */
export class RemoteDidLoader extends DocumentLoader {
    /**
     * Resolved DID documents, keyed by controller DID.
     * DID documents are immutable, so a short TTL collapses the
     * per-signature Hedera + IPFS round-trips for a shared issuer.
     */
    private static readonly cache = new TTLCache<string, any>(500, 10 * 60 * 1000);

    /**
     * Get formatted document
     * @param iri
     */
    public async get(iri: string): Promise<IDocumentFormat> {
        const did = DidURL.getController(iri);
        const didDocument = await RemoteDidLoader.cache.getOrLoad(
            did,
            () => this.resolve(did, iri)
        );
        if (!didDocument) {
            return null;
        }
        return {
            documentUrl: iri,
            document: didDocument
        };
    }

    /**
     * Resolve a DID document from Hedera + IPFS.
     * @param did
     * @param iri
     */
    private async resolve(did: string, iri: string): Promise<any> {
        const topicId = HederaDid.getTopicId(iri);
        const messages = await new Workers().addRetryableTask(
            {
                type: WorkerTaskType.GET_TOPIC_MESSAGES,
                data: {
                    dryRun: false,
                    topic: topicId,
                    payload: { userId: null }
                },
            },
            {
                priority: 10,
                dryRun: null,
                mockId: null
            }
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
        const didDocument = await IPFS.getFile(didMessage.cid, 'json', IPFS.DEFAULT_OPTIONS)

        return didDocument;
    }
}