import { ld as vcjs } from '@transmute/vc.js';
import { Ed25519Signature2018, Ed25519VerificationKey2018 } from '@transmute/ed25519-signature-2018';
import { HcsVcDocument } from './vc-document';
import { CredentialSubject, Hashing } from '@hashgraph/did-sdk-js';
import { DocumentLoaderFunction } from '../document-loader/document-loader-function';
import { PrivateKey } from '@hashgraph/sdk';
import { HcsVpDocument } from './vp-document';

export interface ISuite {
    issuer: string;
    suite: Ed25519Signature2018;
}

/**
 * Connecting VCJS library
 */
export class VCJS {
    /**
     * Create Suite by DID
     * 
     * @param {string} id - Root DID
     * @param {string} did - DID
     * @param {PrivateKey} privateKey - Private Key
     * 
     * @returns {Ed25519Signature2018} - Ed25519Signature2018
     */
    public static async createSuite(id: string, did: string, didKey: PrivateKey): Promise<Ed25519Signature2018> {
        const privateKey = didKey.toBytes();
        const publicKey = didKey.publicKey.toBytes();
        const secretKey = new Uint8Array(publicKey.byteLength + privateKey.byteLength);
        secretKey.set(new Uint8Array(privateKey), 0);
        secretKey.set(new Uint8Array(publicKey), privateKey.byteLength);
        const publicKeyBase58 = Hashing.base58.encode(publicKey);
        const privateKeyBase58 = Hashing.base58.encode(secretKey);
        const key = await Ed25519VerificationKey2018.from({
            id: id,
            type: 'Ed25519VerificationKey2018',
            controller: did,
            publicKeyBase58: publicKeyBase58,
            privateKeyBase58: privateKeyBase58,
        });
        return new Ed25519Signature2018({ key: key });
    }

    /**
     * Issue VC Document
     * 
     * @param {HcsVcDocument<T>} vcDocument - VC Document
     * @param {Ed25519Signature2018} suite - suite
     * @param {DocumentLoaderFunction} documentLoader - Document Loader
     * 
     * @returns {HcsVcDocument<T>} - VC Document
     */
    public static async issue<T extends CredentialSubject>(vcDocument: HcsVcDocument<T>, suite: Ed25519Signature2018, documentLoader: DocumentLoaderFunction): Promise<HcsVcDocument<T>> {
        const vc = vcDocument.toJsonTree();
        const verifiableCredential = await vcjs.createVerifiableCredential({
            credential: vc,
            suite: suite,
            documentLoader: documentLoader,
        });
        vcDocument.proofFromJson(verifiableCredential);
        return vcDocument;
    }

    /**
     * Verify VC Document
     * 
     * @param {HcsVcDocument<T>} vcDocument - VC Document
     * @param {DocumentLoaderFunction} documentLoader - Document Loader
     * 
     * @returns {boolean} - status
     */
    public static async verify(vc: any, documentLoader: DocumentLoaderFunction): Promise<boolean> {
        const result = await vcjs.verifyVerifiableCredential({
            credential: vc,
            suite: new Ed25519Signature2018(),
            documentLoader: documentLoader,
        });
        return !!result.verified;
    }

    /**
     * Issue VP Document
     * 
     * @param {HcsVpDocument} vpDocument - VP Document
     * @param {Ed25519Signature2018} suite - suite
     * @param {DocumentLoaderFunction} documentLoader - Document Loader
     * 
     * @returns {HcsVpDocument} - VP Document
     */
    public static async issuePresentation(vpDocument: HcsVpDocument, suite: Ed25519Signature2018, documentLoader: DocumentLoaderFunction): Promise<HcsVpDocument> {
        const vp = vpDocument.toJsonTree();
        const verifiablePresentation = await vcjs.createVerifiablePresentation({
            presentation: vp,
            challenge: '123',
            suite: suite,
            documentLoader: documentLoader,
        });
        vpDocument.proofFromJson(verifiablePresentation);
        return vpDocument;
    }
}
