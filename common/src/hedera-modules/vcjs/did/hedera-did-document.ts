import { PrivateKey, TopicId } from '@hiero-ledger/sdk';
import { DocumentContext } from './components/document-context.js';
import { HederaDid } from './hedera-did.js';
import { CommonDidDocument } from './common-did-document.js';
import { HederaEd25519Method } from './components/hedera-ed25519-method.js';
import { HederaBBSMethod } from './components/hedera-bbs-method.js';
import { IDidDocument } from './types/did-document.js';

/**
 * Hedera DID document
 * @interface CommonDidDocument
 */
export class HederaDidDocument extends CommonDidDocument {
    /**
     * Topic ID
     * @protected
     */
    protected topicId: TopicId;

    /**
     * Get DID topic ID
     * @returns {TopicId} - Hedera Topic Id
     * @public
     */
    public getDidTopicId(): TopicId {
        return this.topicId;
    }

    /**
     * Get DID topic ID
     * @param {TopicId | string} topicId - Hedera Topic Id
     * @public
     */
    public setDidTopicId(topicId: string | TopicId): void {
        this.topicId = typeof topicId === 'string' ?
            TopicId.fromString(topicId) :
            topicId;
    }

    /**
     * From document
     * @param {IDidDocument | string} document - DID document
     * @returns {HederaDidDocument} - DID document
     * @public
     * @static
     */
    public static override from(document: IDidDocument | string): HederaDidDocument {
        let result: HederaDidDocument;
        if (typeof document === 'object') {
            result = new HederaDidDocument();
            result = CommonDidDocument._from(document, result);
        } else if (typeof document === 'string') {
            result = new HederaDidDocument();
            result = CommonDidDocument._from(JSON.parse(document), result);
        } else {
            throw new Error('Invalid document format');
        }
        if (result.did instanceof HederaDid) {
            result.setDidTopicId(result.did.getDidTopicId());
        }
        return result;
    }

    /**
     * Generate new DID Document
     * @param {string} network - Hedera network
     * @param {PrivateKey | string} key - Hedera private key
     * @param {TopicId | string} topicId - Hedera topic id
     * @returns {HederaDidDocument} - DID document
     * @public
     * @static
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
     * @param {string} did - DID
     * @param {PrivateKey | string} key - Hedera private key
     * @returns {HederaDidDocument} - DID document
     * @public
     * @static
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
     * @param {HederaDid} did - Hedera DID
     * @param {PrivateKey | string} key - Hedera private key
     * @returns {HederaDidDocument} - DID document
     * @private
     * @static
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
     * @param {IDidDocument} json - DID document
     * @returns {HederaDidDocument} - DID document
     * @public
     * @static
     */
    public static fromJsonTree(json: IDidDocument): HederaDidDocument {
        return HederaDidDocument.from(json);
    }

    /**
     * To JSON tree
     * @returns {IDidDocument} - DID document
     * @public
     */
    public toJsonTree(): IDidDocument {
        return this.getDocument();
    }
}
