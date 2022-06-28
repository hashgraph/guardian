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
    type: "Ed25519VerificationKey2018";
    /**
     * Controller
     */
    controller: string;
    /**
     * Public key
     */
    publicKeyBase58: string;
    /**
     * Private key
     */
    privateKeyBase58?: string;
}
