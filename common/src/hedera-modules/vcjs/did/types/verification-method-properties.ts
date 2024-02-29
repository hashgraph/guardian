/**
 * DID verification method properties
 */
export enum VerificationMethodProperties {
    /**
     * A string that conforms to the rules in 3.2 DID URL Syntax.
     * @required
     */
    ID = 'id',
    /**
     * A string that conforms to the rules in 3.1 DID Syntax.
     * @required
     */
    CONTROLLER = 'controller',
    /**
     * A string.
     * @required
     */
    TYPE = 'type',
    /**
     * A map representing a JSON Web Key that conforms to [RFC7517]. See definition of publicKeyJwk for additional constraints.
     */
    PUBLIC_KEY_JWK = 'publicKeyJwk',
    /**
     * A string that conforms to a [MULTIBASE] encoded public key.
     */
    PUBLIC_KEY_MULTIBASE = 'publicKeyMultibase',
    /**
     * A string.
     */
    PUBLIC_KEY_BASE58 = 'publicKeyBase58',
    /**
     * Private Key.
     */
    PRIVATE_KEY_JWK = 'privateKeyJwk',
    /**
     * Private Key.
     */
    PRIVATE_KEY_MULTIBASE = 'privateKeyMultibase',
    /**
     * Private Key.
     */
    PRIVATE_KEY_BASE58 = 'privateKeyBase58'
}