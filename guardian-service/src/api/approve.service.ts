import {ApprovalDocument} from '@entity/approval-document';
import {IApprovalDocument, MessageAPI} from 'interfaces';
import {MongoRepository} from 'typeorm';

export const approveAPI = async function (
    channel: any,
    approvalDocumentRepository: MongoRepository<ApprovalDocument>
): Promise<void> {
    channel.response(MessageAPI.GET_APPROVE_DOCUMENTS, async (msg, res) => {
        if (msg.payload.id) {
            const document = await approvalDocumentRepository.findOne(msg.payload.id);
            res.send([document]);
        } else {
            const reqObj: any = {where: {}};
            if (msg.payload.owner) {
                reqObj.where['owner'] = {$eq: msg.payload.owner}
            }
            if (msg.payload.approver) {
                reqObj.where['approver'] = {$eq: msg.payload.approver}
            }
            if (msg.payload.policyId) {
                reqObj.where['policyId'] = {$eq: msg.payload.policyId}
            }
            const documents: IApprovalDocument[] = await approvalDocumentRepository.find(reqObj);
            res.send(documents);
        }
    });

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
        res.send(result);
    })

    channel.response(MessageAPI.UPDATE_APPROVE_DOCUMENTS, async (msg, res) => {
        const documentObject = msg.payload;
        const id = documentObject.id;
        delete documentObject.id;
        const result = await approvalDocumentRepository.update(id, documentObject);
        res.send(result);
    })
}
