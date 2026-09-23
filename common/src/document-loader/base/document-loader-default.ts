import didContexts from 'did-context';
import { contexts as credentialsContexts } from '@digitalbazaar/credentials-context';
import securityContexts from '@digitalbazaar/security-context';
import { BBS_V1_URL, BLS12381_2020_V1_CONTEXT, BLS12381_2020_V1_URL } from './contexts/bls12381-2020-v1.js';
import { JWS_2020_V1_CONTEXT, JWS_2020_V1_URL } from './contexts/jws-2020-v1.js';
import { IDocumentFormat } from './document-format.js';
import { DocumentLoader } from './document-loader.js';

/**
 * Default Documents Loader
 * Used for VC validation.
 */
export class DefaultDocumentLoader extends DocumentLoader {
    /**
     * Vendored JSON-LD contexts the @digitalbazaar packages do not ship.
     * The two BBS URLs alias the same context, so both map to it.
     */
    private static readonly vendoredContexts = new Map<string, object>([
        [BBS_V1_URL, BLS12381_2020_V1_CONTEXT],
        [BLS12381_2020_V1_URL, BLS12381_2020_V1_CONTEXT],
        [JWS_2020_V1_URL, JWS_2020_V1_CONTEXT],
    ]);

    /**
     * Has context
     * @param iri
     */
    public async has(iri: string): Promise<boolean> {
        if ((didContexts.contexts as Map<string, object>).has(iri)) {
            return true;
        }
        if ((credentialsContexts as Map<string, object>).has(iri)) {
            return true;
        }
        if ((securityContexts.contexts as Map<string, object>).has(iri)) {
            return true;
        }
        return DefaultDocumentLoader.vendoredContexts.has(iri);
    }

    /**
     * Get document
     * @param iri
     */
    public async get(iri: string): Promise<IDocumentFormat> {
        if ((didContexts.contexts as Map<string, object>).has(iri)) {
            return {
                documentUrl: iri,
                document: didContexts.contexts.get(iri),
            };
        }
        if ((credentialsContexts as Map<string, object>).has(iri)) {
            return {
                documentUrl: iri,
                document: credentialsContexts.get(iri),
            };
        }
        if ((securityContexts.contexts as Map<string, object>).has(iri)) {
            return {
                documentUrl: iri,
                document: securityContexts.contexts.get(iri),
            };
        }
        if (DefaultDocumentLoader.vendoredContexts.has(iri)) {
            return {
                documentUrl: iri,
                document: DefaultDocumentLoader.vendoredContexts.get(iri),
            };
        }
        throw new Error('IRI not found: ' + iri);
    }
}
