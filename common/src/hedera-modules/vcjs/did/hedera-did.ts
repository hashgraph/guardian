import { PrivateKey, PublicKey, TopicId } from '@hiero-ledger/sdk';
import { Hashing } from '../../hashing.js';
import { CommonDid } from './common-did.js';
import { HederaDidComponents } from './types/did-components.js';

/**
 * Hedera DID
 * @interface CommonDid
 */
export class HederaDid extends CommonDid {
    /**
     * DID topic separator
     * @public
     * @static
     */
    public static readonly DID_TOPIC_SEPARATOR = '_';

    /**
     * DID parameter separator
     * @deprecated only for old DID versions
     * @public
     * @static
     */
    public static readonly DID_PARAMETER_SEPARATOR = ';';

    /**
     * DID parameter value separator
     * @deprecated only for old DID versions
     * @public
     * @static
     */
    public static readonly DID_PARAMETER_VALUE_SEPARATOR = '=';

    /**
     * DID topic id
     * @deprecated only for old DID versions
     * @public
     * @static
     */
    public static readonly DID_TOPIC_ID = 'tid';

    /**
     * Hedera HCS
     * @public
     * @static
     */
    public static readonly HEDERA_HCS = 'hedera';

    /**
     * Topic ID
     * @protected
     */
    protected topicId: TopicId;

    /**
     * Network
     * @protected
     */
    protected network: string;

    /**
     * Get method
     * @returns {string} - DID Method
     * @public
     */
    public override getMethod(): string {
        return HederaDid.HEDERA_HCS;
    }

    /**
     * Get DID topic ID
     * @returns {TopicId} - Hedera Topic Id
     * @public
     */
    public getDidTopicId(): TopicId {
        return this.topicId;
    }

    /**
     * Get network
     * @returns {string} - Hedera network
     * @public
     */
    public getNetwork(): string {
        return this.network;
    }

    /**
     * Build DID
     * @returns {string} - DID
     * @private
     */
    private build(): string {
        const methodNetwork = HederaDid.HEDERA_HCS +
            CommonDid.DID_METHOD_SEPARATOR +
            this.network;

        let ret: string = CommonDid.DID_PREFIX +
            CommonDid.DID_METHOD_SEPARATOR +
            methodNetwork +
            CommonDid.DID_METHOD_SEPARATOR +
            this.identifier;

        if (this.topicId) {
            ret = ret +
                HederaDid.DID_TOPIC_SEPARATOR +
                this.topicId.toString();
        }

        return ret;
    }

    /**
     * Public key to ID string
     * @param {PublicKey} publicKey - Hedera public key
     * @returns {string} - DID identifier
     * @private
     * @static
     */
    private static publicKeyToIdString(publicKey: PublicKey): string {
        return Hashing.base58.encode(Hashing.sha256.digest(publicKey.toBytes()));
    }

    /**
     * Generate new DID
     * @param {string} network - Hedera network
     * @param {PrivateKey | string} key - Hedera private key
     * @param {TopicId | string} topicId - Hedera topic id
     * @returns {HederaDid} - DID
     * @public
     * @static
     */
    public static async generate(
        network: string,
        key: string | PrivateKey,
        topicId: string | TopicId | null
    ): Promise<HederaDid> {
        const privateKey = typeof key === 'string' ? PrivateKey.fromString(key) : key;
        const publicKey = privateKey.publicKey;
        const result = new HederaDid();
        result.topicId = null;
        if (topicId) {
            if (typeof topicId === 'string') {
                result.topicId = TopicId.fromString(topicId);
            } else {
                result.topicId = topicId;
            }
        }
        result.network = network;
        result.identifier = HederaDid.publicKeyToIdString(publicKey);
        result.did = result.build();
        return result;
    }

    /**
     * From
     * @param {string} did - DID
     * @returns {HederaDid} - DID
     * @public
     * @static
     */
    public static override from(did: string): HederaDid {
        const { prefix, method, network, key, topicId } = HederaDid.parse(did);
        const result = new HederaDid();
        result.prefix = prefix;
        result.did = did;
        result.method = method;
        result.identifier = key;
        result.network = network;
        if (topicId) {
            if (typeof topicId === 'string') {
                result.topicId = TopicId.fromString(topicId);
            } else {
                result.topicId = topicId;
            }
        }
        return result;
    }

    /**
     * Parse DID
     * @param {string} did - DID
     * @returns {HederaDidComponents} - DID components
     * @public
     * @static
     */
    public static override parse(did: string): HederaDidComponents {
        if (!did) {
            throw new Error('DID string cannot be null');
        }
        if (did.indexOf(HederaDid.DID_PARAMETER_SEPARATOR)) {
            return HederaDid.parseV1(did);
        } else {
            return HederaDid.parseV2(did);
        }
    }

    /**
     * Parse DID (v2)
     * @param {string} did - DID
     * @returns {HederaDidComponents} - DID components
     * @public
     * @static
     */
    public static parseV2(did: string): HederaDidComponents {
        const mainParts = did.split(HederaDid.DID_TOPIC_SEPARATOR);
        if (mainParts.length !== 2) {
            throw new Error('DID string is invalid: invalid did format.');
        }
        const didParts = mainParts[0].split(HederaDid.DID_METHOD_SEPARATOR);
        if (didParts.length !== 4) {
            throw new Error('DID string is invalid: invalid did format.');
        }
        const prefix = didParts[0];
        const method = didParts[1];
        const network = didParts[2];
        const key = didParts[3];
        const topicId = mainParts[1];
        if (prefix !== HederaDid.DID_PREFIX) {
            throw new Error('DID string is invalid: invalid prefix.');
        }
        if (method !== HederaDid.HEDERA_HCS) {
            throw new Error('DID string is invalid: invalid method name: ' + method);
        }
        const identifier = key;
        return { prefix, method, identifier, network, key, topicId };
    }

    /**
     * Parse old DID
     * @param {string} did - DID
     * @returns {HederaDidComponents} - DID components
     * @deprecated only for old DID versions
     * @private
     * @static
     */
    private static parseV1(did: string): HederaDidComponents {
        const mainParts = did.split(HederaDid.DID_PARAMETER_SEPARATOR);
        const didParts = mainParts[0].split(HederaDid.DID_METHOD_SEPARATOR);
        const prefix = didParts[0];
        const method = didParts[1];
        const network = didParts[2];
        const key = didParts[3];
        if (prefix !== HederaDid.DID_PREFIX) {
            throw new Error('DID string is invalid: invalid prefix.');
        }
        if (method !== HederaDid.HEDERA_HCS) {
            throw new Error('DID string is invalid: invalid method name: ' + method);
        }
        const paramMap: any = {};
        for (let i = 1; i < mainParts.length; i++) {
            const extractParameters = mainParts[i];
            const paramParts = extractParameters.split(HederaDid.DID_METHOD_SEPARATOR);
            const param = paramParts[2];
            const value = param.split(HederaDid.DID_PARAMETER_VALUE_SEPARATOR);
            paramMap[value[0]] = value[1];
        }
        const topicId = paramMap[HederaDid.DID_TOPIC_ID];
        const identifier = key;
        return { prefix, method, identifier, network, key, topicId };
    }

    /**
     * Check DID type
     * @param {string} did - DID
     * @returns {boolean}
     * @public
     * @static
     */
    public static override implement(did: string): boolean {
        if (!did || typeof did !== 'string') {
            return false;
        }
        const parts = did.split(CommonDid.DID_METHOD_SEPARATOR);
        if (parts[0] !== CommonDid.DID_PREFIX || parts[1] !== HederaDid.HEDERA_HCS) {
            return false;
        }
        return true;
    }

    /**
     * Get topic id
     * @param {string} did - DID
     * @returns {string} - Hedera topic id
     * @public
     * @static
     */
    public static getTopicId(did: string): string {
        const splittedDid = did.split(HederaDid.DID_TOPIC_SEPARATOR);
        const topicId = splittedDid[splittedDid.length - 1];
        return topicId;
    }
}
