import { PrivateKey, PublicKey, TopicId } from '@hiero-ledger/sdk';
import { Environment } from '../environment.js';
import { Hashing } from '../hashing.js';
import { IVerificationMethod, IDidDocument } from '@guardian/interfaces';
import { Bls12381G2KeyPair } from '@mattrglobal/jsonld-signatures-bbs';

/**
 * Did Root Key Base
 * @deprecated 2024-02-12
 */
export abstract class DidRootKeyBase {
    /**
     * ID
     * @private
     */
    protected id: string;
    /**
     * Type
     * @private
     */
    protected type: string;
    /**
     * Controller
     * @private
     */
    protected controller: string;
    /**
     * Public key base58
     * @private
     */
    protected publicKeyBase58: string;
    /**
     * Private key base58
     * @private
     */
    protected privateKeyBase58: string;
    /**
     * Private key
     * @private
     */
    protected privateKey: PrivateKey;
    /**
     * Public key
     * @private
     */
    protected publicKey: PublicKey;

    /**
     * Get method
     */
    public abstract getMethod();

    /**
     * Get ID
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Get type
     */
    public getType(): string {
        return this.type;
    }

    /**
     * Get controller
     */
    public getController(): string {
        return this.controller;
    }

    /**
     * Get public key base58
     */
    public getPublicKeyBase58(): string {
        return this.publicKeyBase58;
    }

    /**
     * Get private key base58
     */
    public getPrivateKeyBase58(): string {
        return this.privateKeyBase58;
    }

    /**
     * Get private key
     */
    public getPrivateKey(): PrivateKey {
        return this.privateKey;
    }

    /**
     * Get public key
     */
    public getPublicKey(): PublicKey {
        return this.publicKey;
    }

    /**
     * To JSON tree
     */
    public toJsonTree(): any {
        const result: any = {};
        result.id = this.id;
        result.type = this.type;
        result.controller = this.controller;
        result.publicKeyBase58 = this.publicKeyBase58;
        return result;
    }

    /**
     * To JSON
     */
    public toJson(): string {
        return JSON.stringify(this.toJsonTree());
    }

    /**
     * Get verification method
     */
    public getVerificationMethod(): IVerificationMethod {
        const result: any = {};
        result.id = this.id;
        result.type = this.type;
        result.controller = this.controller;
        result.publicKeyBase58 = this.publicKeyBase58;
        return result;
    }

    /**
     * Get private verification method
     */
    public getPrivateVerificationMethod(): IVerificationMethod {
        const result: any = {};
        result.id = this.id;
        result.type = this.type;
        result.controller = this.controller;
        result.publicKeyBase58 = this.publicKeyBase58;
        result.privateKeyBase58 = this.privateKeyBase58;
        return result;
    }
}

/**
 * BBS DID root key
 * @deprecated 2024-02-12
 */
export class BBSDidRootKey extends DidRootKeyBase {
    /**
     * DID root key name
     */
    public static DID_ROOT_KEY_NAME = '#did-root-key-bbs';

    /**
     * DID root key type
     */
    public static DID_ROOT_KEY_TYPE = 'Bls12381G2Key2020';

    /**
     * Get method
     */
    public getMethod(): string {
        return BBSDidRootKey.DID_ROOT_KEY_NAME;
    }

    /**
     * Create by private key
     * @param did
     * @param key
     */
    public static async createByPrivateKey(
        did: string,
        key: PrivateKey | string
    ): Promise<BBSDidRootKey> {
        if (!did) {
            throw new Error('DID cannot be ' + did);
        }
        if (!key) {
            throw new Error('DID root key cannot be ' + key);
        }
        const privateKey =
            typeof key === 'string' ? PrivateKey.fromString(key) : key;
        const publicKey = privateKey.publicKey;
        const result = new BBSDidRootKey();
        result.privateKey = privateKey;
        result.publicKey = publicKey;
        const generatedKey = await Bls12381G2KeyPair.generate({
            id: did + BBSDidRootKey.DID_ROOT_KEY_NAME,
            controller: did,
            seed: Buffer.from(privateKey.toStringDer())
        });
        result.id = generatedKey.id;
        result.controller = generatedKey.controller;
        result.type = generatedKey.type;
        result.publicKeyBase58 = generatedKey.publicKey;
        result.privateKeyBase58 = generatedKey.privateKey;
        return result;
    }
}

/**
 * DID root key
 * @deprecated 2024-02-12
 */
export class DidRootKey extends DidRootKeyBase {
    /**
     * DID root key name
     */
    public static DID_ROOT_KEY_NAME = '#did-root-key';
    /**
     * DID root key type
     */
    public static DID_ROOT_KEY_TYPE = 'Ed25519VerificationKey2018';

    /**
     * Get method
     */
    public getMethod(): string {
        return DidRootKey.DID_ROOT_KEY_NAME;
    }

    /**
     * From JSON tree
     * @param json
     */
    public static fromJsonTree(json: any): DidRootKey {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = new DidRootKey();
        result.id = json.id;
        result.type = json.type;
        result.controller = json.controller;
        result.publicKeyBase58 = json.publicKeyBase58;
        return result;
    }

    /**
     * From JSON
     * @param json
     */
    public static fromJson(json: string): DidRootKey {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        return DidRootKey.fromJsonTree(JSON.parse(json));
    }

    /**
     * Public key to ID string
     * @param didRootKey
     */
    public static publicKeyToIdString(didRootKey: PublicKey): string {
        return Hashing.base58.encode(Hashing.sha256.digest(didRootKey.toBytes()));
    }

    /**
     * Create
     * @param did
     */
    public static create(did: string): DidRootKey {
        if (!did) {
            throw new Error('DID cannot be ' + did);
        }
        const result = new DidRootKey();
        result.privateKey = null;
        result.publicKey = null;
        result.controller = did.split('#')[0];
        result.id = result.controller + DidRootKey.DID_ROOT_KEY_NAME;
        result.publicKeyBase58 = null;
        result.privateKeyBase58 = null;
        result.type = DidRootKey.DID_ROOT_KEY_TYPE;
        return result;
    }

    /**
     * Create public key
     * @param did
     * @param key
     */
    public static createByPublicKey(did: string, key: PublicKey | string): DidRootKey {
        if (!did) {
            throw new Error('DID cannot be ' + did);
        }
        if (!key) {
            throw new Error('DID root key cannot be ' + key);
        }
        const publicKey = (typeof key === 'string') ? PublicKey.fromString(key) : key;
        const result = new DidRootKey();
        result.privateKey = null;
        result.publicKey = publicKey;
        result.controller = did;
        result.id = result.controller + DidRootKey.DID_ROOT_KEY_NAME;
        result.publicKeyBase58 = Hashing.base58.encode(publicKey.toBytes());
        result.privateKeyBase58 = null;
        result.type = DidRootKey.DID_ROOT_KEY_TYPE;
        return result;
    }

    /**
     * Create by private key
     * @param did
     * @param key
     */
    public static createByPrivateKey(
        did: string,
        key: PrivateKey | string
    ): DidRootKey {
        if (!did) {
            throw new Error('DID cannot be ' + did);
        }
        if (!key) {
            throw new Error('DID root key cannot be ' + key);
        }
        const privateKey =
            typeof key === 'string' ? PrivateKey.fromString(key) : key;
        const publicKey = privateKey.publicKey;
        const result = new DidRootKey();
        result.privateKey = privateKey;
        result.publicKey = publicKey;
        result.controller = did;
        result.id = result.controller + DidRootKey.DID_ROOT_KEY_NAME;
        result.publicKeyBase58 = Hashing.base58.encode(publicKey.toBytes());
        const privateBytes = privateKey.toBytes();
        const publicBytes = publicKey.toBytes();
        const secretKey = new Uint8Array(
            publicBytes.byteLength + privateBytes.byteLength
        );
        secretKey.set(new Uint8Array(privateBytes), 0);
        secretKey.set(new Uint8Array(publicBytes), privateBytes.byteLength);
        result.privateKeyBase58 = Hashing.base58.encode(secretKey);
        result.type = DidRootKey.DID_ROOT_KEY_TYPE;
        return result;
    }
}

/**
 * Did document base
 * @deprecated 2024-02-12
 */
export class DidDocumentBase {
    /**
     * DID document context
     */
    public static readonly DID_DOCUMENT_CONTEXT = 'https://www.w3.org/ns/did/v1';
    /**
     * DID document transmute context
     */
    public static readonly DID_DOCUMENT_TRANSMUTE_CONTEXT = 'https://ns.did.ai/transmute/v1';
    /**
     * Context
     */
    public static readonly CONTEXT: string = '@context';
    /**
     * ID
     */
    public static readonly ID: string = 'id';
    /**
     * Verification method
     */
    public static readonly VERIFICATION_METHOD: string = 'verificationMethod';
    /**
     * Authentication
     */
    public static readonly AUTHENTICATION: string = 'authentication';
    /**
     * Assertion method
     */
    public static readonly ASSERTION_METHOD: string = 'assertionMethod';
    /**
     * Controller
     */
    public static readonly CONTROLLER: string = 'controller';
    /**
     * Key agreement
     */
    public static readonly KEY_AGREEMENT: string = 'keyAgreement';
    /**
     * Capability invocation
     */
    public static readonly CAPABILITY_INVOCATION: string = 'capabilityInvocation';
    /**
     * Capability delegation
     */
    public static readonly CAPABILITY_DELEGATION: string = 'capabilityDelegation';
    /**
     * Service
     */
    public static readonly SERVICE: string = 'service';

    /**
     * DID
     * @private
     */
    private did: string;
    /**
     * Context
     * @private
     */
    private readonly context: string | string[];
    /**
     * DID root key
     * @private
     */
    private didRootKey: DidRootKey;

    /**
     * BBS DID root key
     * @private
     */
    private bbsDidRootKey: DidRootKey;

    constructor() {
        this.context = DidDocumentBase.DID_DOCUMENT_CONTEXT;
    }

    /**
     * Get did document
     */
    public getDidDocument(): IDidDocument {
        const rootObject: any = {};
        rootObject[DidDocumentBase.CONTEXT] = this.context;
        rootObject[DidDocumentBase.ID] = this.getId();

        rootObject[DidDocumentBase.VERIFICATION_METHOD] = [
            this.didRootKey.getVerificationMethod()
        ];
        if (this.bbsDidRootKey) {
            rootObject[DidDocumentBase.VERIFICATION_METHOD].push(
                this.bbsDidRootKey.getVerificationMethod()
            );
        }
        rootObject[DidDocumentBase.AUTHENTICATION] = [
            this.didRootKey.getId()
        ];
        rootObject[DidDocumentBase.ASSERTION_METHOD] = [
            this.didRootKey.getMethod()
        ];
        if (this.bbsDidRootKey) {
            rootObject[DidDocumentBase.ASSERTION_METHOD].push(
                this.bbsDidRootKey.getMethod()
            );
        }
        return rootObject;
    }

    /**
     * Get private DID document
     */
    public getPrivateDidDocument(): IDidDocument {
        const rootObject: any = {};
        rootObject[DidDocumentBase.CONTEXT] = this.context;
        rootObject[DidDocumentBase.ID] = this.getId();
        rootObject[DidDocumentBase.VERIFICATION_METHOD] = [
            this.didRootKey.getPrivateVerificationMethod()
        ];
        if (this.bbsDidRootKey) {
            rootObject[DidDocumentBase.VERIFICATION_METHOD].push(
                this.bbsDidRootKey.getVerificationMethod()
            );
        }
        rootObject[DidDocumentBase.AUTHENTICATION] = [
            this.didRootKey.getId()
        ];
        rootObject[DidDocumentBase.ASSERTION_METHOD] = [
            this.didRootKey.getMethod()
        ];
        if (this.bbsDidRootKey) {
            rootObject[DidDocumentBase.ASSERTION_METHOD].push(
                this.bbsDidRootKey.getMethod()
            );
        }
        return rootObject;
    }

    /**
     * Get context
     */
    public getContext(): string | string[] {
        return this.context;
    }

    /**
     * Get ID
     */
    public getId(): string {
        return this.did;
    }

    /**
     * Create by private key
     * @param did
     * @param didRootKey
     */
    public static async createByPrivateKey(did: string, didRootKey: PrivateKey): Promise<DidDocumentBase> {
        const result = new DidDocumentBase();
        result.did = did;
        result.didRootKey = DidRootKey.createByPrivateKey(did, didRootKey);
        result.bbsDidRootKey = await BBSDidRootKey.createByPrivateKey(did, didRootKey);
        return result;
    }

    /**
     * Create by public key
     * @param did
     * @param didRootKey
     */
    public static createByPublicKey(did: string, didRootKey: PublicKey): DidDocumentBase {
        const result = new DidDocumentBase();
        result.did = did;
        result.didRootKey = DidRootKey.createByPublicKey(did, didRootKey);
        return result;
    }

    /**
     * From JSON tree
     * @param json
     */
    public static fromJsonTree(json: IDidDocument): DidDocumentBase {
        if (!json) {
            throw new Error('JSON Object is empty');
        }
        const result = new DidDocumentBase();
        if (json[DidDocumentBase.ID]) {
            result.did = json[DidDocumentBase.ID];
        }
        if (json[DidDocumentBase.VERIFICATION_METHOD]) {
            result.didRootKey = DidRootKey.fromJsonTree(json[DidDocumentBase.VERIFICATION_METHOD]);
        }
        return result;
    }
}

/**
 * DID document
 * @deprecated 2024-02-12
 */
export class DIDDocument {
    /**
     * DID prefix
     */
    public static readonly DID_PREFIX = 'did';
    /**
     * DID method separator
     */
    public static readonly DID_METHOD_SEPARATOR = ':';
    /**
     * DID parameter separator
     */
    public static readonly DID_PARAMETER_SEPARATOR = ';';
    /**
     * DID parameter value separator
     */
    public static readonly DID_PARAMETER_VALUE_SEPARATOR = '=';
    /**
     * DID topic id
     */
    public static readonly DID_TOPIC_ID = 'tid';
    /**
     * DID topic separator
     */
    public static readonly DID_TOPIC_SEPARATOR = '_';
    /**
     * Hedera HCS
     */
    public static readonly HEDERA_HCS = 'hedera';

    /**
     * Private key
     * @private
     */
    private privateKey: PrivateKey;
    /**
     * Public key
     * @private
     */
    private publicKey: PublicKey;
    /**
     * Topic ID
     * @private
     */
    private topicId: TopicId;
    /**
     * Network
     * @private
     */
    private network: string;
    /**
     * ID string
     * @private
     */
    private idString: string;
    /**
     * DID
     * @private
     */
    private did: string;
    /**
     * Document
     * @private
     */
    private document: DidDocumentBase;

    /**
     * Get network
     */
    public getNetwork(): string {
        return this.network;
    }

    /**
     * Get method
     */
    public getMethod(): string {
        return DIDDocument.HEDERA_HCS;
    }

    /**
     * To string
     */
    public toString(): string {
        return this.did;
    }

    /**
     * Get DID topic ID
     */
    public getDidTopicId(): TopicId {
        return this.topicId;
    }

    /**
     * Get ID string
     */
    public getIdString(): string {
        return this.idString;
    }

    /**
     * Get DID
     */
    public getDid(): string {
        return this.did;
    }

    /**
     * Get document
     */
    public getDocument(): any {
        return this.document.getDidDocument();
    }

    /**
     * Get private key
     */
    public getPrivateKey(): PrivateKey {
        return this.privateKey;
    }

    /**
     * Get public key
     */
    public getPublicKey(): PublicKey {
        return this.publicKey;
    }

    /**
     * Get private key string
     */
    public getPrivateKeyString(): string {
        if (this.privateKey) {
            return this.privateKey.toString();
        }
    }

    /**
     * Get public key string
     */
    public getPublicKeyString(): string {
        if (this.publicKey) {
            return this.publicKey.toString();
        }
    }

    /**
     * Build DID
     * @private
     */
    private buildDid(): string {
        const methodNetwork =
            DIDDocument.HEDERA_HCS +
            DIDDocument.DID_METHOD_SEPARATOR +
            this.network;

        let ret: string = DIDDocument.DID_PREFIX +
            DIDDocument.DID_METHOD_SEPARATOR +
            methodNetwork +
            DIDDocument.DID_METHOD_SEPARATOR +
            this.idString;

        if (this.topicId) {
            ret = ret +
                DIDDocument.DID_TOPIC_SEPARATOR +
                this.topicId.toString();
        }

        return ret;
    }

    /**
     * Create
     * @param privateKey
     * @param topicId
     */
    public static async create(privateKey: string | PrivateKey | null, topicId: string | TopicId | null): Promise<DIDDocument> {
        const result = new DIDDocument();
        result.privateKey = null;
        if (privateKey) {
            if (typeof privateKey === 'string') {
                result.privateKey = PrivateKey.fromString(privateKey);
            } else {
                result.privateKey = privateKey;
            }
        } else {
            result.privateKey = PrivateKey.generate();
        }
        result.publicKey = result.privateKey.publicKey;

        result.topicId = null;
        if (topicId) {
            if (typeof topicId === 'string') {
                result.topicId = TopicId.fromString(topicId);
            } else {
                result.topicId = topicId;
            }
        }
        result.network = Environment.network;
        result.idString = DidRootKey.publicKeyToIdString(result.publicKey);
        result.did = result.buildDid();
        result.document = await DidDocumentBase.createByPrivateKey(result.did, result.privateKey);
        return result;
    }

    /**
     * Pars DID
     * @param did
     */
    public static parse(did: string): {
        /**
         * Get private key
         */
        prefix: string,
        /**
         * Get private key
         */
        method: string,
        /**
         * Get private key
         */
        network: string,
        /**
         * Get private key
         */
        key: string,
        /**
         * Get private key
         */
        topicId: string
    } {
        if (!did) {
            throw new Error('DID string cannot be null');
        }
        const mainParts = did.split(DIDDocument.DID_TOPIC_SEPARATOR);
        if (mainParts.length !== 2) {
            throw new Error('DID string is invalid: invalid did format.');
        }
        const didParts = mainParts[0].split(DIDDocument.DID_METHOD_SEPARATOR);
        if (didParts.length !== 4) {
            throw new Error('DID string is invalid: invalid did format.');
        }
        const prefix = didParts[0];
        const method = didParts[1];
        const network = didParts[2];
        const key = didParts[3];
        const topicId = mainParts[1];
        if (prefix !== DIDDocument.DID_PREFIX) {
            throw new Error('DID string is invalid: invalid prefix.');
        }
        if (method !== DIDDocument.HEDERA_HCS) {
            throw new Error('DID string is invalid: invalid method name: ' + method);
        }
        return {
            prefix,
            method,
            network,
            key,
            topicId
        }
    }

    /**
     * From
     * @param did
     * @param didRootKey
     * @deprecated only for old DID versions
     */
    public static from(did: string, didRootKey: PublicKey | string): DIDDocument {
        try {
            if (!did) {
                throw new Error('DID string cannot be null');
            }
            if (!didRootKey) {
                throw new Error('DID Root Key is empty');
            }
            const mainParts = did.split(DIDDocument.DID_PARAMETER_SEPARATOR);
            const didParts = mainParts[0].split(DIDDocument.DID_METHOD_SEPARATOR);
            const prefix = didParts[0];
            const method = didParts[1];
            const network = didParts[2];
            const key = didParts[3];

            if (prefix !== DIDDocument.DID_PREFIX) {
                throw new Error('DID string is invalid: invalid prefix.');
            }
            if (method !== DIDDocument.HEDERA_HCS) {
                throw new Error('DID string is invalid: invalid method name: ' + method);
            }

            const paramMap: any = {};
            for (let i = 1; i < mainParts.length; i++) {
                const extractParameters = mainParts[i];
                const paramParts = extractParameters.split(DIDDocument.DID_METHOD_SEPARATOR);
                const param = paramParts[2];
                const value = param.split(DIDDocument.DID_PARAMETER_VALUE_SEPARATOR);
                paramMap[value[0]] = value[1];
            }

            const topicId = paramMap[DIDDocument.DID_TOPIC_ID];

            const result = new DIDDocument();
            result.privateKey = null;
            if (typeof didRootKey === 'string') {
                result.publicKey = PublicKey.fromString(didRootKey);
            } else {
                result.publicKey = didRootKey;
            }
            if (topicId) {
                if (typeof topicId === 'string') {
                    result.topicId = TopicId.fromString(topicId);
                } else {
                    result.topicId = topicId;
                }
            }
            result.network = network;
            result.idString = DidRootKey.publicKeyToIdString(result.publicKey);
            result.did = result.buildDid();
            result.document = DidDocumentBase.createByPublicKey(result.did, result.publicKey);
            if (key !== result.idString) {
                throw new Error('The specified DID does not correspond to the given DID root key');
            }
            return result;
        } catch (error) {
            throw new Error('DID string is invalid. ' + error.message);
        }
    }

    /**
     * From JSON tree
     * @param json
     */
    public static fromJsonTree(json: IDidDocument): DIDDocument {
        if (!json) {
            throw new Error('JSON Object is empty');
        }
        const result = new DIDDocument();
        result.document = DidDocumentBase.fromJsonTree(json);
        if (result.document) {
            result.did = result.document.getId();
        }
        return result;
    }

    /**
     * To JSON tree
     */
    public toJsonTree(): IDidDocument {
        return this.getDocument();
    }

    /**
     * To credential hash
     */
    public toCredentialHash(): string {
        const map = this.getDocument();
        const json: string = JSON.stringify(map);
        const hash: Uint8Array = Hashing.sha256.digest(json);
        return Hashing.base58.encode(hash);
    }
}
