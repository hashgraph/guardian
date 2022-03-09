import {ApprovalDocument} from '@entity/approval-document';
import {IApprovalDocument, MessageAPI, MessageResponse} from 'interfaces';
import {MongoRepository} from 'typeorm';

/**
 * Connecting to the message broker methods of working with Approve documents.
 * 
 * @param channel - channel
 * @param approvalDocumentRepository - table with approve documents
 */
export const approveAPI = async function (
    channel: any,
    approvalDocumentRepository: MongoRepository<ApprovalDocument>
): Promise<void> {
    /**
     * Return approve documents
     * 
     * @param {Object} [payload] - filters
     * @param {string} [payload.id] - document id 
     * @param {string} [payload.owner] - document owner 
     * @param {string} [payload.approver] - document approver 
     * @param {string} [payload.policyId] - policy id 
     * 
     * @returns {IApprovalDocument[]} - approve documents
     */
    channel.response(MessageAPI.GET_APPROVE_DOCUMENTS, async (msg, res) => {
        if (msg.payload.id) {
            const document = await approvalDocumentRepository.findOne(msg.payload.id);
            res.send(new MessageResponse([document]));
        } else {
            const reqObj: any = { where: {} };
            const { owner, approver, id, hash, policyId, schema, issuer, ...otherArgs } = msg.payload;
            if (owner) {
                reqObj.where['owner'] = { $eq: owner }
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
            const documents: IApprovalDocument[] = await approvalDocumentRepository.find(reqObj);
            res.send(new MessageResponse(documents));
        }
    });

    /**
     * Create or update approve documents
     * 
     * @param {IApprovalDocument[]} payload - documents
     * 
     * @returns {IApprovalDocument[]} - new approve documents
     */
    channel.response(MessageAPI.SET_APPROVE_DOCUMENTS, async (msg, res) => {
        const id = msg.payload.id;
        let result;
        if (id) {
            const documentObject = msg.payload;
            const id = documentObject.id;
            delete documentObject.id;
            result = await approvalDocumentRepository.update(id, documentObject);
        } else {
            const documentObject = approvalDocumentRepository.create(msg.payload);
            result = await approvalDocumentRepository.save(documentObject)
        }
        res.send(new MessageResponse(result));
    })

    /**
     * Update approve document
     * 
     * @param {IApprovalDocument} payload - document
     * 
     * @returns {IApprovalDocument} - new approve document
     */
    channel.response(MessageAPI.UPDATE_APPROVE_DOCUMENTS, async (msg, res) => {
        const documentObject = msg.payload;
        const id = documentObject.id;
        delete documentObject.id;
        const result = await approvalDocumentRepository.update(id, documentObject);
        res.send(new MessageResponse(result));
    })
}
