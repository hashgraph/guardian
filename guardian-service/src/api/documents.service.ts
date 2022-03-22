import { DidDocument } from '@entity/did-document';
import { VcDocument } from '@entity/vc-document';
import { VpDocument } from '@entity/vp-document';
import { DidMethodOperation, HcsVcOperation } from '@hashgraph/did-sdk-js';
import {
    DidDocumentStatus,
    DocumentSignature,
    DocumentStatus,
    IDidDocument,
    IVCDocument,
    IVPDocument,
    MessageAPI,
    MessageError,
    MessageResponse
} from 'interfaces';
import { MongoRepository } from 'typeorm';
import { VCHelper } from 'vc-modules';
import {VcHelper} from '@helpers/vcHelper';

/**
 * Connect to the message broker methods of working with VC, VP and DID Documents
 *
 * @param channel - channel
 * @param didDocumentRepository - table with DID Documents
 * @param vcDocumentRepository - table with VC Documents
 * @param vpDocumentRepository - table with VP Documents
 * @param vc - verification methods VC and VP Documents
 */
export const documentsAPI = async function (
    channel: any,
    didDocumentRepository: MongoRepository<DidDocument>,
    vcDocumentRepository: MongoRepository<VcDocument>,
    vpDocumentRepository: MongoRepository<VpDocument>,
): Promise<void> {
    const vc = new VcHelper();
    const getDIDOperation = function (operation: DidMethodOperation | DidDocumentStatus) {
        switch (operation) {
            case DidMethodOperation.CREATE:
                return DidDocumentStatus.CREATE;
            case DidMethodOperation.DELETE:
                return DidDocumentStatus.DELETE;
            case DidMethodOperation.UPDATE:
                return DidDocumentStatus.UPDATE;
            case DidDocumentStatus.CREATE:
                return DidDocumentStatus.CREATE;
            case DidDocumentStatus.DELETE:
                return DidDocumentStatus.DELETE;
            case DidDocumentStatus.FAILED:
                return DidDocumentStatus.FAILED;
            case DidDocumentStatus.UPDATE:
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

    /**
     * Return DID Documents by DID
     *
     * @param {Object} payload - filters
     * @param {string} payload.did - DID
     *
     * @returns {IDidDocument[]} - DID Documents
     */
    channel.response(MessageAPI.GET_DID_DOCUMENTS, async (msg, res) => {
        const reqObj = { where: { did: { $eq: msg.payload.did } } };
        const didDocuments: IDidDocument[] = await didDocumentRepository.find(reqObj);
        res.send(new MessageResponse(didDocuments));
    });

    /**
     * Return VC Documents
     *
     * @param {Object} [payload] - filters
     * @param {string} [payload.id] - filter by id
     * @param {string} [payload.type] - filter by type
     * @param {string} [payload.owner] - filter by owner
     * @param {string} [payload.issuer] - filter by issuer
     * @param {string} [payload.hash] - filter by hash
     * @param {string} [payload.policyId] - filter by policy id
     *
     * @returns {IVCDocument[]} - VC Documents
     */
    channel.response(MessageAPI.GET_VC_DOCUMENTS, async (msg, res) => {
        try{
            if (msg.payload) {
                const reqObj: any = { where: {} };
                const { owner, assign, issuer, id, hash, policyId, schema, ...otherArgs } = msg.payload;
                if (owner) {
                    reqObj.where['owner'] = { $eq: owner }
                }
                if (assign) {
                    reqObj.where['assign'] = { $eq: assign }
                }
                if (issuer) {
                    reqObj.where['document.issuer'] = { $eq: issuer }
                }
                if (id) {
                    reqObj.where['document.id'] = { $eq: id }
                }
                if (hash) {
                    reqObj.where['hash'] = { $eq: hash }
                }
                if (policyId) {
                    reqObj.where['policyId'] = { $eq: policyId }
                }
                if (schema) {
                    reqObj.where['schema'] = { $eq: schema }
                }
                if (typeof reqObj.where !== 'object') {
                    reqObj.where = {};
                }
                Object.assign(reqObj.where, otherArgs);
                const vcDocuments: IVCDocument[] = await vcDocumentRepository.find(reqObj);
                res.send(new MessageResponse(vcDocuments));
            } else {
                const vcDocuments: IVCDocument[] = await vcDocumentRepository.find();
                res.send(new MessageResponse(vcDocuments));
            }
        }
        catch (e){
            res.send(new MessageError(e.message));
        }
    });

    /**
     * Create or update DID Documents
     *
     * @param {IDidDocument} payload - document
     * @param {string} [payload.did] - did
     * @param {string} [payload.operation] - document status
     *
     * @returns {IDidDocument} - new DID Document
     */
    channel.response(MessageAPI.SET_DID_DOCUMENT, async (msg, res) => {
        if (msg.payload.did && msg.payload.operation) {
            const did = msg.payload.did;
            const operation = msg.payload.operation;
            const item = await didDocumentRepository.findOne({ where: { did: { $eq: did } } });
            if (item) {
                item.status = getDIDOperation(operation);
                const result: IDidDocument = await didDocumentRepository.save(item);
                res.send(new MessageResponse(result));
            } else {
                res.send(new MessageError('Document not found'));
            }
        } else {
            const didDocumentObject = didDocumentRepository.create(msg.payload);
            const result: IDidDocument[] = await didDocumentRepository.save(didDocumentObject);
            res.send(new MessageResponse(result));
        }
    });

    /**
     * Create or update VC Documents
     *
     * @param {IVCDocument} payload - document
     * @param {string} [payload.hash] - hash
     * @param {string} [payload.operation] - document status
     *
     * @returns {IVCDocument} - new VC Document
     */
    channel.response(MessageAPI.SET_VC_DOCUMENT, async (msg, res) => {
        let result: IVCDocument;

        const hash = msg.payload.hash;
        if (hash) {
            result = await vcDocumentRepository.findOne({ where: { hash: { $eq: hash } } });
        }

        if (result) {
            const operation = msg.payload.operation;
            if (operation) {
                result.hederaStatus = getVCOperation(operation);
            }

            const assign = msg.payload.assign;
            if (assign) {
                result.assign = assign;
            }

            const type = msg.payload.type;
            if (type) {
                result.type = type;
            }

            const option = msg.payload.option;
            if (option) {
                result.option = option;
            }
        }

        if (!result) {
            if (msg.payload.document) {
                result = vcDocumentRepository.create(msg.payload as VcDocument);
            } else {
                res.send(new MessageError('Invalid document'));
                return;
            }
        }

        let verify: boolean;
        try {
            const res = await vc.verifySchema(result.document);
            verify = res.ok;
            if (verify) {
                verify = await vc.verifyVC(result.document);
            }
        } catch (error) {
            verify = false;
        }
        result.signature = verify ? DocumentSignature.VERIFIED : DocumentSignature.INVALID;

        result = await vcDocumentRepository.save(result);
        res.send(new MessageResponse(result));
    });

    /**
     * Create new VP Document
     *
     * @param {IVPDocument} payload - document
     *
     * @returns {IVPDocument} - new VP Document
     */
    channel.response(MessageAPI.SET_VP_DOCUMENT, async (msg, res) => {
        const vpDocumentObject = vpDocumentRepository.create(msg.payload);
        const result: any = await vpDocumentRepository.save(vpDocumentObject);
        res.send(new MessageResponse(result));
    });

    /**
     * Return VP Documents
     *
     * @param {Object} [payload] - filters
     *
     * @returns {IVPDocument[]} - VP Documents
     */
    channel.response(MessageAPI.GET_VP_DOCUMENTS, async (msg, res) => {
        if (msg.payload) {
            const document: IVPDocument[] = await vpDocumentRepository.find(msg.payload);
            res.send(new MessageResponse(document));
        } else {
            const documents: IVPDocument[] = await vpDocumentRepository.find();
            res.send(new MessageResponse(documents));
        }
    });
}
