/**
 * DID service properties
 */
export enum ServiceProperties {
    /**
     * A string that conforms to the rules of [RFC3986] for URIs.
     * @required
     */
    ID = 'id',
    /**
     * A string or a set of strings.
     * @required
     */
    TYPE = 'type',
    /**
     * A string that conforms to the rules of [RFC3986] for URIs, a map, or a set composed of a one or more strings that conform to the rules of [RFC3986] for URIs and/or maps.
     * @required
     */
    SERVICE_ENDPOINT = 'serviceEndpoint'
}
