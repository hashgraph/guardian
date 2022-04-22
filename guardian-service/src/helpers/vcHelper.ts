import { Singleton } from '@helpers/decorators/singleton';
import { ContextDocumentLoader } from '@document-loader/context-loader';
import { DIDDocumentLoader } from '@document-loader/did-document-loader';
import { SubjectSchemaLoader } from '@document-loader/subject-schema-loader';
import { VCSchemaLoader } from '@document-loader/vc-schema-loader';
import { VCJS, DefaultDocumentLoader } from '@hedera-modules';

/**
 * Configured VCHelper
 */
@Singleton
export class VcHelper extends VCJS {
    constructor() {
        super();
        const defaultDocumentLoader = new DefaultDocumentLoader();
        const schemaDocumentLoader = new ContextDocumentLoader('https://ipfs.io/ipfs/');
        const didDocumentLoader = new DIDDocumentLoader();
        const vcSchemaObjectLoader = new VCSchemaLoader("https://ipfs.io/ipfs/");
        const subjectSchemaObjectLoader = new SubjectSchemaLoader("https://ipfs.io/ipfs/");

        this.addDocumentLoader(defaultDocumentLoader);
        this.addDocumentLoader(schemaDocumentLoader);
        this.addDocumentLoader(didDocumentLoader);
        this.addSchemaLoader(vcSchemaObjectLoader);
        this.addSchemaLoader(subjectSchemaObjectLoader);
        this.buildDocumentLoader();
        this.buildSchemaLoader();
    }
}
