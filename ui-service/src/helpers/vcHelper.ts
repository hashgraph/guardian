import {DefaultDocumentLoader, VCHelper} from 'vc-modules';
import {DIDDocumentLoader} from '../document-loader/did-document-loader';
import {VCDocumentLoader} from '../document-loader/vc-document-loader';
import {Singleton} from '@helpers/decorators/singleton';
import {SchemaLoader} from '../document-loader/schema-loader';

/**
 * Configured VCHelper
 */
@Singleton
export class VcHelper extends VCHelper {
    constructor() {
        const context = 'https://localhost/schema';
        super();
        this.addContext(context);
        this.addDocumentLoader(new DefaultDocumentLoader());
        this.addDocumentLoader(new VCDocumentLoader(context));
        this.addDocumentLoader(new DIDDocumentLoader());
        this.addSchemaLoader(new SchemaLoader());
        this.buildDocumentLoader();
    }
}
