import { ApprovalDocument } from '@entity/approval-document';
import { ApiResponse } from '@api/api-response';
import { DataBaseHelper, MessageBrokerChannel, MessageResponse } from '@guardian/common';
import { MessageAPI, IApprovalDocument } from '@guardian/interfaces';

/**
 * Connecting to the message broker methods of working with Approve documents.
 *
 * @param channel - channel
 * @param approvalDocumentRepository - table with approve documents
 */
export async function approveAPI(
    channel: MessageBrokerChannel,
    approvalDocumentRepository: DataBaseHelper<ApprovalDocument>
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
    ApiResponse(channel, MessageAPI.GET_APPROVE_DOCUMENTS, async (msg) => {
        if (msg.id) {
            const document = await approvalDocumentRepository.findOne(msg.id);
            return new MessageResponse([document]);
        } else {
            const reqObj: any = { where: {} as unknown };
            const { owner, approver, id, hash, policyId, schema, issuer, ...otherArgs } = msg;
            if (owner) {
                reqObj.where.owner = { $eq: owner }
            }
            if (approver) {
                reqObj.where.approver = { $eq: approver }
            }
            if (issuer) {
                reqObj.where['document.issuer'] = { $eq: issuer }
            }
            if (id) {
                reqObj.where['document.id'] = { $eq: id }
            }
            if (hash) {
                reqObj.where.hash = { $eq: hash }
            }
            if (policyId) {
                reqObj.where.policyId = { $eq: policyId }
            }
            if (schema) {
                reqObj.where.schema = { $eq: schema }
            }
            if (typeof reqObj.where !== 'object') {
                reqObj.where = {};
            }
            Object.assign(reqObj.where, otherArgs);
            const documents: IApprovalDocument[] = await approvalDocumentRepository.find(reqObj);
            return new MessageResponse(documents);
        }
    });

    /**
     * Create or update approve documents
     *
     * @param {IApprovalDocument[]} payload - documents
     *
     * @returns {IApprovalDocument[]} - new approve documents
     */
    ApiResponse(channel, MessageAPI.SET_APPROVE_DOCUMENTS, async (msg) => {
        const id = msg.id;
        let result;
        if (id) {
            result = await approvalDocumentRepository.update(msg);
        } else {
            const documentObject = approvalDocumentRepository.create(msg);
            result = await approvalDocumentRepository.save(documentObject)
        }
        return new MessageResponse(result);
    })

    /**
     * Update approve document
     *
     * @param {IApprovalDocument} payload - document
     *
     * @returns {IApprovalDocument} - new approve document
     */
    ApiResponse(channel, MessageAPI.UPDATE_APPROVE_DOCUMENTS, async (msg) => {
        const result = await approvalDocumentRepository.update(msg);
        return new MessageResponse(result);
    });
}
