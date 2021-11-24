import didContexts from "@transmute/did-context";
import credentialsContexts from "@transmute/credentials-context";
import securityContexts from "@transmute/security-context";
import { IDocumentFormat } from "./document-format";
import { DocumentLoader } from "./document-loader";

/**
 * Default Documents Loader
 * Used for VC validation.
 */
export class DefaultDocumentLoader extends DocumentLoader {
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
        return false;
    }

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
        throw new Error("IRI not found: " + iri);
    }
}
