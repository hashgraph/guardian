import { ApprovalDocument } from '@entity/approval-document';
import { ApiResponse } from '@api/api-response';
import { DataBaseHelper, MessageBrokerChannel, MessageResponse } from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';

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
