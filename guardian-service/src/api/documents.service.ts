import { DidDocument } from '@entity/did-document';
import { VcDocument } from '@entity/vc-document';
import { VpDocument } from '@entity/vp-document';
import { VerifySubscriber } from '@subscribers/verify-subscribe';
import { DidMethodOperation, HcsVcOperation } from 'did-sdk-js';
import { DidDocumentStatus, DocumentSignature, DocumentStatus, IDidDocument, IVCDocument, IVPDocument, MessageAPI } from 'interfaces';
import { MongoRepository } from 'typeorm';
import { VCHelper } from 'vc-modules';

const getDIDOperation = function (operation: DidMethodOperation) {
    switch (operation) {
        case DidMethodOperation.CREATE:
            return DidDocumentStatus.CREATE;
        case DidMethodOperation.DELETE:
            return DidDocumentStatus.DELETE;
        case DidMethodOperation.UPDATE:
            return DidDocumentStatus.UPDATE;
        default:
            return DidDocumentStatus.NEW;
    }
}

const getVCOperation = function (operation: HcsVcOperation) {
    switch (operation) {
        case HcsVcOperation.ISSUE:
            return DocumentStatus.ISSUE;
        case HcsVcOperation.RESUME:
            return DocumentStatus.RESUME;
        case HcsVcOperation.REVOKE:
            return DocumentStatus.REVOKE;
        case HcsVcOperation.SUSPEND:
            return DocumentStatus.SUSPEND;
        default:
            return DocumentStatus.NEW;
    }
}

export const documentsAPI = async function (
    channel: any,
    didDocumentRepository: MongoRepository<DidDocument>,
    vcDocumentRepository: MongoRepository<VcDocument>,
    vpDocumentRepository: MongoRepository<VpDocument>,
    vc: VCHelper
): Promise<void> {
    channel.response(MessageAPI.GET_DID_DOCUMENTS, async (msg, res) => {
        const reqObj = { where: { did: { $eq: msg.payload.did } } };
        const didDocuments: IDidDocument[] = await didDocumentRepository.find(reqObj);
        res.send(didDocuments);
    });

    channel.response(MessageAPI.GET_VC_DOCUMENTS, async (msg, res) => {
        if (msg.payload) {
            const reqObj: any = { where: {} };
            if (msg.payload.type) {
                reqObj.where['type'] = { $eq: msg.payload.type }
            }
            if (msg.payload.owner) {
                reqObj.where['owner'] = { $eq: msg.payload.owner }
            }
            if (msg.payload.issuer) {
                reqObj.where['document.issuer'] = { $eq: msg.payload.issuer }
            }
            if (msg.payload.id) {
                reqObj.where['document.id'] = { $eq: msg.payload.id }
            }
            if (msg.payload.hash) {
                reqObj.where['hash'] = { $in: msg.payload.hash }
            }
            if (msg.payload.policyId) {
                reqObj.where['policyId'] = { $eq: msg.payload.policyId }
            }
            const vcDocuments: IVCDocument[] = await vcDocumentRepository.find(reqObj);
            res.send(vcDocuments);
        } else {
            const vcDocuments: IVCDocument[] = await vcDocumentRepository.find();
            res.send(vcDocuments);
        }
    });

    channel.response(MessageAPI.SET_DID_DOCUMENT, async (msg, res) => {
        if (msg.payload.did && msg.payload.operation) {
            const did = msg.payload.did;
            const operation = msg.payload.operation;
            const item = await didDocumentRepository.findOne({ where: { did: { $eq: did } } });
            if (item) {
                item.status = getDIDOperation(operation);
                const result: IDidDocument = await didDocumentRepository.save(item);
                res.send(result);
            } else {
                res.send(null);
            }
        } else {
            const didDocumentObject = didDocumentRepository.create(msg.payload);
            const result: IDidDocument[] = await didDocumentRepository.save(didDocumentObject);
            res.send(result);
        }
    });

    channel.response(MessageAPI.SET_VC_DOCUMENT, async (msg, res) => {
        let result: IVCDocument
        if (msg.payload.hash && msg.payload.operation) {
            const hash = msg.payload.hash;
            const operation = msg.payload.operation;
            result = await vcDocumentRepository.findOne({ where: { hash: { $eq: hash } } });
            if (result) {
                result.status = getVCOperation(operation);
            } else {
                res.send(null);
                return;
            }
        } else {
            result = vcDocumentRepository.create(msg.payload as VcDocument);
        }
        let verify: boolean;
        try {
            verify = await vc.verifyVC(result.document);
        } catch (error) {
            verify = false;
        }
        result.signature = verify ? DocumentSignature.VERIFIED : DocumentSignature.INVALID;
        result = await vcDocumentRepository.save(result);
        res.send(result);
    });

    channel.response(MessageAPI.SET_VP_DOCUMENT, async (msg, res) => {
        const vpDocumentObject = vpDocumentRepository.create(msg.payload);
        const result: any = await vpDocumentRepository.save(vpDocumentObject);
        res.send(result);
    });

    channel.response(MessageAPI.GET_VP_DOCUMENTS, async (msg, res) => {
        if (msg.payload) {
            const document: IVPDocument = await vpDocumentRepository.findOne(msg.payload);
            if (document) {
                res.send([document]);
            } else {
                res.send([]);
            }
        } else {
            const documents: IVPDocument[] = await vpDocumentRepository.find();
            res.send(documents);
        }
    });
}
