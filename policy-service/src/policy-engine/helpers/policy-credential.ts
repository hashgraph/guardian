import { VcHelper } from '@guardian/hedera/vc-helper';
import { IDocumentOptions } from '@guardian/hedera/vcjs/vcjs';
import { CommonDidDocument } from '@guardian/hedera/vcjs/did/common-did-document';
import { VcDocument } from '@guardian/hedera/vcjs/vc-document';
import { VpDocument } from '@guardian/hedera/vcjs/vp-document';
import { ICredentialSubject, SignatureType } from '@guardian/interfaces';
import { PreviewScope } from './preview.js';

export class PolicyCredential {
    public static async createVC(
        helper: VcHelper,
        subject: ICredentialSubject,
        didDocument: CommonDidDocument,
        signatureType: SignatureType,
        options?: IDocumentOptions
    ): Promise<VcDocument> {
        if (PreviewScope.current()?.preview) {
            return await helper.createUnsignedCredential(subject, didDocument.getDid(), signatureType, options);
        }
        return await helper.createVerifiableCredential(subject, didDocument, signatureType, options);
    }

    public static async createVP(
        helper: VcHelper,
        vcs: VcDocument[],
        didDocument: CommonDidDocument,
        signatureType: SignatureType,
        options?: IDocumentOptions
    ): Promise<VpDocument> {
        if (PreviewScope.current()?.preview) {
            return await helper.createUnsignedPresentation(vcs, options);
        }
        return await helper.createVerifiablePresentation(vcs, didDocument, signatureType, options);
    }
}
