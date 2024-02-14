
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
     * @required
     */
    PUBLIC_KEY_MULTIBASE = 'publicKeyMultibase',
    /**
     * A string.
     * @required
     */
    PUBLIC_KEY_BASE58 = 'publicKeyBase58'
}
