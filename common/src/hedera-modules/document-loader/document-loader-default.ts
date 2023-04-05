import didContexts from '@transmute/did-context';
import credentialsContexts from '@transmute/credentials-context';
import securityContexts from '@transmute/security-context';
import { IDocumentFormat } from './document-format';
import { DocumentLoader } from './document-loader';

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
        if ((credentialsContexts.contexts as Map<string, object>).has(iri)) {
            return true;
        }
        if ((securityContexts.contexts as Map<string, object>).has(iri)) {
            return true;
        }
        if (iri === 'https://w3id.org/security/bbs/v1') {
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
        if ((credentialsContexts.contexts as Map<string, object>).has(iri)) {
            return {
                documentUrl: iri,
                document: credentialsContexts.contexts.get(iri),
            };
        }
        if ((securityContexts.contexts as Map<string, object>).has(iri)) {
            return {
                documentUrl: iri,
                document: securityContexts.contexts.get(iri),
            };
        }
        if (iri === 'https://w3id.org/security/bbs/v1') {
            return {
                documentUrl: iri,
                document: securityContexts.contexts.get(securityContexts.constants.BLS12381_2020_V1_URL)
            };
        }
        throw new Error('IRI not found: ' + iri);
    }
}
