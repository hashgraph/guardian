import didContexts from 'did-context';
import { contexts as credentialsContexts } from '@digitalbazaar/credentials-context';
import securityContexts from '@digitalbazaar/security-context';
// Two URLs alias the same BBS context and @digitalbazaar/security-context ships neither,
// so the vendored copy is served for both (see the has/get branches below).
import { BBS_V1_URL, BLS12381_2020_V1_CONTEXT, BLS12381_2020_V1_URL } from './contexts/bls12381-2020-v1.js';
import { IDocumentFormat } from './document-format.js';
import { DocumentLoader } from './document-loader.js';

/**
 * Default Documents Loader
 * Used for VC validation.
 */
export class DefaultDocumentLoader extends DocumentLoader {
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
        if (iri === BBS_V1_URL || iri === BLS12381_2020_V1_URL) {
            return true;
        }
        return false;
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
        if (iri === BBS_V1_URL || iri === BLS12381_2020_V1_URL) {
            return {
                documentUrl: iri,
                document: BLS12381_2020_V1_CONTEXT,
            };
        }
        throw new Error('IRI not found: ' + iri);
    }
}
