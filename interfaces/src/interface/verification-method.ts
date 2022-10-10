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
     * Public key
     */
    publicKeyMultibase: string;
    /**
     * Private key
     */
    privateKeyMultibase?: string;
}
