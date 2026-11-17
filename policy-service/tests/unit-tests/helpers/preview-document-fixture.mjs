import { DocumentSignature, DocumentStatus } from '@guardian/interfaces';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { Issuer } from '@guardian/hedera/vcjs/issuer';
import { TimestampUtils } from '@guardian/hedera/timestamp-utils';
import { VpDocument } from '@guardian/hedera/vcjs/vp-document';

export function createPreviewCredential(subject, issuer, uuid) {
    const vc = PolicyUtils.createVcFromSubject(subject);
    vc.setId(uuid);
    vc.setIssuer(new Issuer(issuer));
    vc.setIssuanceDate(TimestampUtils.now());
    return vc;
}

export function createPreviewPresentation(vcs, uuid) {
    const vp = new VpDocument();
    vp.setId(uuid);
    vp.addVerifiableCredentials(vcs);
    return vp;
}

export function createPreviewDocument(ref, owner, subject, schema, issuer, recordActionId) {
    const vc = PolicyUtils.createVcFromSubject(subject);
    vc.setIssuanceDate(TimestampUtils.now());
    const item = PolicyUtils.createUnsignedVC(ref, vc, recordActionId);
    item.hederaStatus = DocumentStatus.NEW;
    item.signature = DocumentSignature.NEW;
    if (issuer) item.document.issuer = issuer;
    if (owner) {
        item.owner = owner.did;
        item.group = owner.group;
    }
    if (schema) {
        item.schema = schema;
        item.type = schema;
    }
    return item;
}
