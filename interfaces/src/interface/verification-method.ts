/**
 * Verification Method interface
 */
export interface IVerificationMethod {
    /**
     * ID
     */
    id: string;
    /**
     * Type
     */
    type: 'Ed25519VerificationKey2018';
    /**
     * Controller
     */
    controller: string;
    /**
     * Public key base58
     */
    publicKeyBase58?: string;
    /**
     * Private key base58
     */
    privateKeyBase58?: string;
}
