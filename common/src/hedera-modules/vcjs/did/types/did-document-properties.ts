/**
 * DID document properties
 */
export enum DidDocumentProperties {
    /**
     * Context
     */
    CONTEXT = '@context',
    /**
     * A string that conforms to the rules in 3.1 DID Syntax.
     * @required
     */
    ID = 'id',
    /**
     * A set of strings that conform to the rules of [RFC3986] for URIs.
     */
    ALSO_KNOWN_AS = 'alsoKnownAs',
    /**
     * A string or a set of strings that conform to the rules in 3.1 DID Syntax.
     */
    CONTROLLER = 'controller',
    /**
     * A set of Verification Method maps that conform to the rules in Verification Method properties.
     */
    VERIFICATION_METHOD = 'verificationMethod',
    /**
     * Authentication
     * A set of either Verification Method maps that conform to the rules in Verification Method properties) or strings that conform to the rules in 3.2 DID URL Syntax.
     */
    AUTHENTICATION = 'authentication',
    /**
     * Assertion method
     */
    ASSERTION_METHOD = 'assertionMethod',
    /**
     * Key agreement
     */
    KEY_AGREEMENT = 'keyAgreement',
    /**
     * Capability invocation
     */
    CAPABILITY_INVOCATION = 'capabilityInvocation',
    /**
     * Capability delegation
     */
    CAPABILITY_DELEGATION = 'capabilityDelegation',
    /**
     * Service
     */
    SERVICE = 'service'
}
