import { PrivateKey, PublicKey, TopicId } from "@hashgraph/sdk";
import { Environment } from "./../environment";
import { Hashing } from "./../hashing";
import { IVerificationMethod, IDidDocument } from "interfaces";

export class DidRootKey {
    public static DID_ROOT_KEY_NAME = '#did-root-key';
    public static DID_ROOT_KEY_TYPE = 'Ed25519VerificationKey2018';

    private id: string;
    private type: string;
    private controller: string;
    private publicKeyBase58: string;
    private privateKeyBase58: string;
    private privateKey: PrivateKey;
    private publicKey: PublicKey;

    constructor() {
    }

    public getMethod(): string {
        return DidRootKey.DID_ROOT_KEY_NAME;
    }

    public getId(): string {
        return this.id;
    }

    public getType(): string {
        return this.type;
    }

    public getController(): string {
        return this.controller;
    }

    public getPublicKeyBase58(): string {
        return this.publicKeyBase58;
    }

    public getPrivateKeyBase58(): string {
        return this.privateKeyBase58;
    }

    public getPrivateKey(): PrivateKey {
        return this.privateKey;
    }

    public getPublicKey(): PublicKey {
        return this.publicKey;
    }

    public toJsonTree(): any {
        const result: any = {};
        result.id = this.id;
        result.type = this.type;
        result.controller = this.controller;
        result.publicKeyBase58 = this.publicKeyBase58;
        return result;
    }

    public toJson(): string {
        return JSON.stringify(this.toJsonTree());
    }

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

    public static fromJson(json: string): DidRootKey {
        if (!json) {
            throw new Error('JSON Object is empty');
        }
        
        return DidRootKey.fromJsonTree(JSON.parse(json));
    }

    public static publicKeyToIdString(didRootKey: PublicKey): string {
        return Hashing.base58.encode(Hashing.sha256.digest(didRootKey.toBytes()));
    }

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

    public static createByPublicKey(did: string, key: PublicKey | string): DidRootKey {
        if (!did) {
            throw new Error('DID cannot be ' + did);
        }
        if (!key) {
            throw new Error('DID root key cannot be ' + key);
        }
        const publicKey = (typeof key == 'string') ? PublicKey.fromString(key) : key;
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

    public static createByPrivateKey(did: string, key: PrivateKey | string): DidRootKey {
        if (!did) {
            throw new Error('DID cannot be ' + did);
        }
        if (!key) {
            throw new Error('DID root key cannot be ' + key);
        }
        const privateKey = (typeof key == 'string') ? PrivateKey.fromString(key) : key;
        const publicKey = privateKey.publicKey;
        const result = new DidRootKey();
        result.privateKey = privateKey;
        result.publicKey = publicKey;
        result.controller = did;
        result.id = result.controller + DidRootKey.DID_ROOT_KEY_NAME;
        result.publicKeyBase58 = Hashing.base58.encode(publicKey.toBytes());
        const privateBytes = privateKey.toBytes();
        const publicBytes = publicKey.toBytes();
        const secretKey = new Uint8Array(publicBytes.byteLength + privateBytes.byteLength);
        secretKey.set(new Uint8Array(privateBytes), 0);
        secretKey.set(new Uint8Array(publicBytes), privateBytes.byteLength);
        result.privateKeyBase58 = Hashing.base58.encode(secretKey);
        result.type = DidRootKey.DID_ROOT_KEY_TYPE;
        return result;
    }

    public getVerificationMethod(): IVerificationMethod {
        const result: any = {};
        result.id = this.id;
        result.type = this.type;
        result.controller = this.controller;
        result.publicKeyBase58 = this.publicKeyBase58;
        return result;
    }

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

export class DidDocumentBase {
    public static readonly DID_DOCUMENT_CONTEXT = 'https://www.w3.org/ns/did/v1';
    public static readonly DID_DOCUMENT_TRANSMUTE_CONTEXT = 'https://ns.did.ai/transmute/v1';
    public static readonly CONTEXT: string = '@context';
    public static readonly ID: string = 'id';
    public static readonly VERIFICATION_METHOD: string = 'verificationMethod';
    public static readonly AUTHENTICATION: string = 'authentication';
    public static readonly ASSERTION_METHOD: string = 'assertionMethod';

    private did: string;
    private context: string[];
    private didRootKey: DidRootKey;

    constructor() {
        this.context = [
            DidDocumentBase.DID_DOCUMENT_CONTEXT,
            DidDocumentBase.DID_DOCUMENT_TRANSMUTE_CONTEXT
        ];
    }

    public getDidDocument(): IDidDocument {
        const rootObject: any = {};
        rootObject[DidDocumentBase.CONTEXT] = [
            DidDocumentBase.DID_DOCUMENT_CONTEXT,
            DidDocumentBase.DID_DOCUMENT_TRANSMUTE_CONTEXT
        ];
        rootObject[DidDocumentBase.ID] = this.getId();
        rootObject[DidDocumentBase.VERIFICATION_METHOD] = [
            this.didRootKey.getVerificationMethod()
        ];
        rootObject[DidDocumentBase.AUTHENTICATION] = this.didRootKey.getId();
        rootObject[DidDocumentBase.ASSERTION_METHOD] = [
            this.didRootKey.getMethod()
        ];
        return rootObject;
    }

    public getPrivateDidDocument(): IDidDocument {
        const rootObject: any = {};
        rootObject[DidDocumentBase.CONTEXT] = [
            DidDocumentBase.DID_DOCUMENT_CONTEXT,
            DidDocumentBase.DID_DOCUMENT_TRANSMUTE_CONTEXT
        ];
        rootObject[DidDocumentBase.ID] = this.getId();
        rootObject[DidDocumentBase.VERIFICATION_METHOD] = [
            this.didRootKey.getPrivateVerificationMethod()
        ];
        rootObject[DidDocumentBase.AUTHENTICATION] = this.didRootKey.getId();
        rootObject[DidDocumentBase.ASSERTION_METHOD] = [
            this.didRootKey.getMethod()
        ];
        return rootObject;
    }

    public getContext(): string[] {
        return this.context;
    }

    public getId(): string {
        return this.did;
    }

    public static createByPrivateKey(did: string, didRootKey: PrivateKey): DidDocumentBase {
        const result = new DidDocumentBase();
        result.did = did;
        result.didRootKey = DidRootKey.createByPrivateKey(did, didRootKey);
        return result;
    }

    public static createByPublicKey(did: string, didRootKey: PublicKey): DidDocumentBase {
        const result = new DidDocumentBase();
        result.did = did;
        result.didRootKey = DidRootKey.createByPublicKey(did, didRootKey);
        return result;
    }
}

export class DIDDocument {
    public static readonly DID_PREFIX = 'did';
    public static readonly DID_METHOD_SEPARATOR = ':';
    public static readonly DID_PARAMETER_SEPARATOR = ';';
    public static readonly DID_PARAMETER_VALUE_SEPARATOR = '=';
    public static readonly DID_TOPIC_ID = 'tid';
    public static readonly HEDERA_HCS = 'hedera';

    private privateKey: PrivateKey;
    private publicKey: PublicKey;
    private topicId: TopicId;
    private network: string;
    private idString: string;
    private did: string;
    private document: DidDocumentBase;

    private constructor() {

    }

    public getNetwork(): string {
        return this.network;
    }

    public getMethod(): string {
        return DIDDocument.HEDERA_HCS;
    }

    public toString(): string {
        return this.did;
    }

    public getDidTopicId(): TopicId {
        return this.topicId;
    }

    public getIdString(): string {
        return this.idString;
    }

    public getDid(): string {
        return this.did;
    }

    public getDocument(): any {
        return this.document.getDidDocument();
    }

    public getPrivateKey(): PrivateKey {
        return this.privateKey;
    }

    public getPublicKey(): PublicKey {
        return this.publicKey;
    }

    public getPrivateKeyString(): string {
        if (this.privateKey) {
            return this.privateKey.toString();
        }
    }

    public getPublicKeyString(): string {
        if (this.publicKey) {
            return this.publicKey.toString();
        }
    }

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
                DIDDocument.DID_PARAMETER_SEPARATOR +
                methodNetwork +
                DIDDocument.DID_METHOD_SEPARATOR +
                DIDDocument.DID_TOPIC_ID +
                DIDDocument.DID_PARAMETER_VALUE_SEPARATOR +
                this.topicId.toString();
        }

        return ret;
    }

    public static create(privateKey: string | PrivateKey | null, topicId: string | TopicId | null): DIDDocument {
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
        result.network = Environment.getNetwork();
        result.idString = DidRootKey.publicKeyToIdString(result.publicKey);
        result.did = result.buildDid();
        result.document = DidDocumentBase.createByPrivateKey(result.did, result.privateKey);
        return result;
    }

    public static from(did: string, didRootKey: PublicKey | string): DIDDocument {
        try {
            if (!did) {
                throw new Error("DID string cannot be null");
            }
            if (!didRootKey) {
                throw new Error("DID Root Key is empty");
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
                const method = paramParts[0];
                const network = paramParts[1];
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
        } catch (e) {
            throw new Error('DID string is invalid. ' + e.message);
        }
    }
}