import { DidDocument } from '@entity/did-document';
import { VcDocument } from '@entity/vc-document';
import { VpDocument } from '@entity/vp-document';
import { DidMethodOperation, HcsVcOperation } from 'did-sdk-js';
import { 
    DidDocumentStatus, 
    DocumentSignature, 
    DocumentStatus, 
    IDidDocument, 
    IVCDocument, 
    IVPDocument, 
    MessageAPI 
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
        res.send(didDocuments);
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
            verify = await vc.verifySchema(result.document);
            if(verify) {
                verify = await vc.verifyVC(result.document);
            }
        } catch (error) {
            verify = false;
        }
        result.signature = verify ? DocumentSignature.VERIFIED : DocumentSignature.INVALID;
        const storage = new Web3Storage({token: web3storageToken});
        const cid = (await storage.put([new File([JSON.stringify(result)], `${result.document.id}.json`, {type:'application/json'})]));
        result = await vcDocumentRepository.save({...result, cid});
        res.send(result);
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
        res.send(result);

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
