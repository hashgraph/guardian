import { PrivateKey, TopicId } from '@hashgraph/sdk';
import { DocumentContext } from './components/document-context';
import { HederaDid } from './hedera-did';
import { CommonDidDocument } from './common-did-document';
import { HederaEd25519Method } from './components/hedera-ed25519-method';
import { HederaBBSMethod } from './components/hedera-bbs-method';
import { IDidDocument } from './types/did-document';

export class HederaDidDocument extends CommonDidDocument {
    /**
     * Topic ID
     * @protected
     */
    protected topicId: TopicId;

    /**
     * Get DID topic ID
     */
    public getDidTopicId(): TopicId {
        return this.topicId;
    }

    /**
     * Get DID topic ID
     */
    public setDidTopicId(topicId: string | TopicId): void {
        this.topicId = typeof topicId === 'string' ?
            TopicId.fromString(topicId) :
            topicId;
    }

    public static override from(document: IDidDocument): HederaDidDocument {
        if (typeof document !== 'object') {
            throw new Error('Invalid document format');
        }

        let result = new HederaDidDocument();
        result = CommonDidDocument._from(document, result);
        if (result.did instanceof HederaDid) {
            result.setDidTopicId(result.did.getDidTopicId());
        }

        return result;
    }

    /**
     * Generate new DID Document
     * @param network
     * @param key
     * @param topicId
     */
    public static async generate(
        network: string,
        key: PrivateKey | string,
        topicId: string | TopicId
    ): Promise<HederaDidDocument> {
        const hederaDid = await HederaDid.generate(network, key, topicId);
        return await HederaDidDocument._generate(hederaDid, key);
    }

    /**
     * Generate DID Document by DID
     * @param did
     * @param key
     */
    public static async generateByDid(
        did: string,
        key: PrivateKey | string,
    ): Promise<HederaDidDocument> {
        const hederaDid = HederaDid.from(did);
        return await HederaDidDocument._generate(hederaDid, key);
    }

    /**
     * Generate new DID Document
     * @param network
     * @param key
     * @param topicId
     */
    private static async _generate(
        did: HederaDid,
        key: PrivateKey | string,
    ): Promise<HederaDidDocument> {
        const result = new HederaDidDocument();

        //DID
        result.did = did;
        const controller = result.did.toString();

        //Context
        result.context = new DocumentContext();
        result.context.add(CommonDidDocument.DID_DOCUMENT_CONTEXT);

        //alsoKnownAs
        // --- Not set

        //controller
        // --- Not set

        //Verification Method
        result.verificationMethod = [];
        result.verificationMethod.push(await HederaEd25519Method.generate(controller, key));
        result.verificationMethod.push(await HederaBBSMethod.generate(controller, key));

        //authentication
        result.authentication = [];
        result.authentication.push(result.verificationMethod[0].getId());

        //assertionMethod
        result.assertionMethod = [];
        for (const method of result.verificationMethod) {
            result.assertionMethod.push(method.getName());
        }

        //keyAgreement
        // --- Not set

        //capabilityInvocation
        // --- Not set

        //capabilityDelegation
        // --- Not set

        //service
        // --- Not set

        result.setDidTopicId(did.getDidTopicId());

        return result;
    }

    /**
     * From JSON tree
     * @param json
     */
    public static fromJsonTree(json: IDidDocument): HederaDidDocument {
        return HederaDidDocument.from(json);
    }

    /**
     * To JSON tree
     */
    public toJsonTree(): IDidDocument {
        return this.getDocument();
    }
}
