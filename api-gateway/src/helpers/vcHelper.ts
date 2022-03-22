import { DefaultDocumentLoader, VCHelper } from 'vc-modules';
import { DIDDocumentLoader } from '../document-loader/did-document-loader';
import { ContextLoader } from '../document-loader/context-loader';
import { Singleton } from '@helpers/decorators/singleton';
import { SubjectSchemaLoader } from '../document-loader/subject-schema-loader';
import { VCSchemaLoader } from '../document-loader/vc-schema-loader';

/**
 * Configured VCHelper
 */
@Singleton
export class VcHelper extends VCHelper {
    constructor() {
        super();
        // this.addContext('https://localhost/schema');
        this.addDocumentLoader(new DefaultDocumentLoader());
        this.addDocumentLoader(new ContextLoader("https://ipfs.io/ipfs/"));
        this.addDocumentLoader(new DIDDocumentLoader());
        this.addSchemaLoader(new SubjectSchemaLoader("https://ipfs.io/ipfs/"));
        this.addSchemaLoader(new VCSchemaLoader("https://ipfs.io/ipfs/"));
        this.buildDocumentLoader();
        this.buildSchemaLoader();
    }
}
