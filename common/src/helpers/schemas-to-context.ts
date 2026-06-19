import { schemasToContext as schemasToContextTransmute } from './jsonld-schema/schemas-to-context-impl.js';

// tslint:disable-next-line:completed-docs
export function schemasToContext(
    schemas: any[],
    additionalContexts?: Map<string, any>,
    contextSettings?: {
        // tslint:disable-next-line:completed-docs
        version?: number | undefined;
        // tslint:disable-next-line:completed-docs
        vocab?: string | undefined;
        // tslint:disable-next-line:completed-docs
        id?: string | undefined;
        // tslint:disable-next-line:completed-docs
        type?: string | undefined;
        // tslint:disable-next-line:completed-docs
        rootTerms?: any;
        // Map GeoJSON `coordinates`/`bbox` to a single `@type: @json` literal instead of
        // expanding them per-coordinate into RDF (huge JSON-LD canonicalization cost on sign).
        // MUST be false for EVC schemas: BBS+ selective-disclosure derive flattens @json values.
        // tslint:disable-next-line:completed-docs
        geoJsonCoordinatesAsJson?: boolean;
    }
): {
    // tslint:disable-next-line:completed-docs
    '@context': any;
} {
    const context = schemasToContextTransmute(schemas, contextSettings);
    // Emit plain-text properties (https://www.schema.org/text) as @type, not @id.
    // Relies on the exact serialized "@id":"..." string; guarded by the fidelity tests.
    let contextString = JSON.stringify(context) as string;
    contextString = contextString.replaceAll(
        `"@id":"https://www.schema.org/text"`,
        `"@type":"https://www.schema.org/text"`
    );
    const replacedContext = JSON.parse(contextString);
    if (additionalContexts && additionalContexts.size) {
        for (const contextEntry of additionalContexts) {
            replacedContext['@context'][contextEntry[0]] = contextEntry[1];
        }
    }
    if (contextSettings?.geoJsonCoordinatesAsJson && additionalContexts && additionalContexts.has('#GeoJSON')) {
        // GeoJSON `coordinates`/`bbox` are deeply-nested numeric arrays. Expanding them into
        // RDF (per-coordinate) makes JSON-LD canonicalization super-linear — a large MultiPolygon
        // takes tens of seconds and tens-to-hundreds of MB to sign. Map them to a single @json
        // literal (root-level, so it applies at every nesting depth) so the geometry is signed as
        // an opaque JCS value instead of exploded into RDF lists. Requires JSON-LD 1.1 (set above).
        // Gated by the caller: EVC schemas must NOT use this — BBS+ selective-disclosure derive
        // flattens nested arrays inside an @json literal, corrupting the revealed geometry.
        replacedContext['@context'].coordinates = { '@id': 'https://purl.org/geojson/vocab#coordinates', '@type': '@json' };
        replacedContext['@context'].bbox = { '@id': 'https://purl.org/geojson/vocab#bbox', '@type': '@json' };
    }
    return replacedContext;
}
