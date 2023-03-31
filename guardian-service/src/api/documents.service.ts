
import { VcHelper } from '@helpers/vc-helper';
import {
    DidDocumentStatus,
    DocumentSignature,
    DocumentStatus,
    IDidObject,
    IVCDocument,
    MessageAPI,
    PolicyType,
} from '@guardian/interfaces';
import { ApiResponse } from '@api/api-response';
import {
    MessageResponse,
    MessageError,
    DataBaseHelper,
    DidDocument,
    VcDocument,
    VpDocument,
    Policy,
} from '@guardian/common';
/**
 * Connect to the message broker methods of working with VC, VP and DID Documents
 *
 * @param channel - channel
 * @param didDocumentRepository - table with DID Documents
 * @param vcDocumentRepository - table with VC Documents
 * @param vpDocumentRepository - table with VP Documents
 */
export async function documentsAPI(
    didDocumentRepository: DataBaseHelper<DidDocument>,
    vcDocumentRepository: DataBaseHelper<VcDocument>,
    vpDocumentRepository: DataBaseHelper<VpDocument>,
    policyRepository: DataBaseHelper<Policy>,
): Promise<void> {
    const getDIDOperation = (operation: DidDocumentStatus) => {
        switch (operation) {
            case DidDocumentStatus.CREATE:
                return DidDocumentStatus.CREATE;
            case DidDocumentStatus.DELETE:
                return DidDocumentStatus.DELETE;
            case DidDocumentStatus.UPDATE:
                return DidDocumentStatus.UPDATE;
            case DidDocumentStatus.FAILED:
                return DidDocumentStatus.FAILED;
            default:
                return DidDocumentStatus.NEW;
        }
    }

    const getVCOperation = (operation: DocumentStatus) => {
        switch (operation) {
            case DocumentStatus.ISSUE:
                return DocumentStatus.ISSUE;
            case DocumentStatus.RESUME:
                return DocumentStatus.RESUME;
            case DocumentStatus.REVOKE:
                return DocumentStatus.REVOKE;
            case DocumentStatus.SUSPEND:
                return DocumentStatus.SUSPEND;
            case DocumentStatus.FAILED:
                return DocumentStatus.FAILED;
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
    ApiResponse(MessageAPI.GET_DID_DOCUMENTS, async (msg) => {
        const reqObj = { where: { did: { $eq: msg.did } } };
        const didDocuments: IDidObject[] = await didDocumentRepository.find(reqObj);
        return new MessageResponse(didDocuments);
    });

    /**
     * Return VC Documents
     *
     * @param {Object} [payload] - filters
     * @param {string} [payload.type] - filter by type
     * @param {string} [payload.owner] - filter by owner
     *
     * @returns {IVCDocument[]} - VC Documents
     */
    ApiResponse(MessageAPI.GET_VC_DOCUMENTS, async (msg) => {
        try {
            if (msg) {
                const reqObj: any = {};
                const { owner, type, ...otherArgs } = msg;
                if (owner) {
                    reqObj.owner = { $eq: owner }
                }
                if (type) {
                    reqObj.type = { $eq: type }
                }
                Object.assign(reqObj, otherArgs);
                const vcDocuments: IVCDocument[] = await vcDocumentRepository.find(reqObj);
                return new MessageResponse(vcDocuments);
            } else {
                const vcDocuments: IVCDocument[] = await vcDocumentRepository.findAll();
                return new MessageResponse(vcDocuments);
            }
        }
        catch (error) {
            return new MessageError(error);
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
    ApiResponse(MessageAPI.SET_DID_DOCUMENT, async (msg) => {
        if (msg.did && msg.operation) {
            const did = msg.did;
            const operation = msg.operation;
            const item = await didDocumentRepository.findOne({ did });
            if (item) {
                item.status = getDIDOperation(operation);
                const result: IDidObject = await didDocumentRepository.save(item);
                return new MessageResponse(result);
            } else {
                return new MessageError('Document not found');
            }
        } else if (Array.isArray(msg)) {
            const result = []
            for (const documentObject of msg) {
                result.push(await didDocumentRepository.save(documentObject));
            }
            return new MessageResponse(result);
        }
        else {
            const result: IDidObject = await didDocumentRepository.save(msg);
            return new MessageResponse(result);
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
    ApiResponse(MessageAPI.SET_VC_DOCUMENT, async (msg) => {
        let result: IVCDocument;

        const hash = msg.hash;
        if (hash) {
            result = await vcDocumentRepository.findOne({ hash });
        }

        if (result) {
            const operation = msg.operation;
            if (operation) {
                result.hederaStatus = getVCOperation(operation);
            }

            const assignedTo = msg.assignedTo;
            if (assignedTo) {
                result.assignedTo = assignedTo;
            }

            const type = msg.type;
            if (type) {
                result.type = type;
            }

            const option = msg.option;
            if (option) {
                result.option = option;
            }
        }

        if (!result) {
            if (msg.document) {
                result = vcDocumentRepository.create(msg as VcDocument);
            } else {
                return new MessageError('Invalid document');
            }
        }

        let verify: boolean;
        try {
            const VCHelper = new VcHelper();
            const res = await VCHelper.verifySchema(result.document);
            verify = res.ok;
            if (verify) {
                verify = await VCHelper.verifyVC(result.document);
            }
        } catch (error) {
            verify = false;
        }
        result.signature = verify ? DocumentSignature.VERIFIED : DocumentSignature.INVALID;

        result = await vcDocumentRepository.save(result);
        return new MessageResponse(result);
    });

    /**
     * Create new VP Document
     *
     * @param {IVPDocument} payload - document
     *
     * @returns {IVPDocument} - new VP Document
     */
    ApiResponse(MessageAPI.SET_VP_DOCUMENT, async (msg) => {
        const result: any = await vpDocumentRepository.save(msg);
        return new MessageResponse(result);
    });

    /**
     * Return VP Documents
     *
     * @param {Object} [payload] - filters
     *
     * @returns {IVPDocument[]} - VP Documents
     */
    ApiResponse(MessageAPI.GET_VP_DOCUMENTS, async (msg) => {
        if (msg) {
            const { filters, pageIndex, pageSize } = msg;
            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = _pageSize;
                otherOptions.offset = _pageIndex * _pageSize;
            }
            if (filters?.policyOwner) {
                const policies = await policyRepository.find({
                    owner: filters.policyOwner,
                    status: PolicyType.PUBLISH
                }, {
                    fields: ['id', 'owner']
                });
                if (policies && policies.length) {
                    const policyIds = policies.map(p => p.id.toString());
                    const [items, count] = await vpDocumentRepository.findAndCount({
                        where: {
                            policyId: { $in: policyIds }
                        }
                    }, otherOptions);
                    return new MessageResponse({ items, count });
                } else {
                    return new MessageResponse({ items: [], count: 0 });
                }
            } else {
                const [items, count] = await vpDocumentRepository.findAndCount(filters, otherOptions);
                return new MessageResponse({ items, count });
            }
        } else {
            const [items, count] = await vpDocumentRepository.findAndCount(null, {
                limit: 100
            });
            return new MessageResponse({ items, count });
        }
    });
}
