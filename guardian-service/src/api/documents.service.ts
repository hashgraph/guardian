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
import { File, Web3Storage } from 'web3.storage';

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
    vc: VCHelper
): Promise<void> {

    //add to config
    const web3storageToken = process.env.WEB3_STORAGE_TOKEN;
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
                reqObj.where['hash'] = { $in: hash }
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

        const storage = new Web3Storage({token: web3storageToken});
        const cid = (await storage.put([new File([JSON.stringify(result)], `${result.document.id}.json`, {type:'application/json'})]));
        result = await vcDocumentRepository.save({...result, cid});
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
        let vpDocumentObject = vpDocumentRepository.create(msg.payload as IVPDocument);

        if (!vpDocumentObject.cid)
        {
            const storage = new Web3Storage({token: web3storageToken});
            vpDocumentObject.cid = (await storage.put([new File([JSON.stringify(vpDocumentObject)], `${vpDocumentObject.document.id}.json`, {type:'application/json'})]));
        }
        // do we need to store the VP also in the VC table?
        vpDocumentObject = await vcDocumentRepository.save(vpDocumentObject);

        const result: any = await vpDocumentRepository.save(vpDocumentObject);
        console.log('create VP', vpDocumentObject, result);
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

    /**
     * Return VP Documents using filters
     *
     * @param {Object} [payload] - filters
     *
     * @returns {IVPDocument[]} - VP Documents
     */
    channel.response(MessageAPI.FIND_VP_DOCUMENTS, async (msg, res) => {
        try {
            console.log('FIND_VP_DOCUMENTS', msg.payload);
            const pageSize = Number(msg.payload.pageSize);
            const currentPage = Number(msg.payload.page) === 0 ? 1 : Number(msg.payload.page);
            const skip = pageSize * (currentPage - 1);
            const reqObj: any = { where: {}, take: pageSize, skip };
            if (msg.payload.type) {
                reqObj.where['type'] = { $eq: msg.payload.type }
            }
            if (msg.payload.owner) {
                reqObj.where['owner'] = { $eq: msg.payload.owner }
            }
            if (msg.payload.issuer) {
                reqObj.where['document.verifiableCredential.issuer'] = msg.payload.issuer
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

            if (msg.payload.period === '24h') {
                const startDate = new Date();
                startDate.setHours(startDate.getHours() - 24);
                reqObj.where['createDate'] = { $gt: startDate }
            }
            console.log('getvpdocuments reqObj', reqObj);
            const documents: [IVPDocument[], number] = await vpDocumentRepository.findAndCount(reqObj);
            const lastPage = Math.ceil(documents[1] / pageSize);
            const response  = {
                perPage: pageSize,
                totalRecords: documents[1],
                lastPage,
                currentPage,
                hasNextPage: lastPage > currentPage,
                hasPrevPage: currentPage > 1,
                data: documents[0]
            };
            console.log('documents', documents);
            res.send(response);
        } catch (error) {
            console.error(error);
            res.send({});
        }
    });
}

