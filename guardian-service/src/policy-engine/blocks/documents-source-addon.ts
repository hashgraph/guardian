import { SourceAddon } from '@policy-engine/helpers/decorators';
import { BlockActionError } from '@policy-engine/errors';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyAddonBlock, IPolicyDocument } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';
import { PolicyUtils } from '@policy-engine/helpers/utils';

/**
 * Documents source addon
 */
@SourceAddon({
    blockType: 'documentsSourceAddon',
    about: {
        label: 'Source',
        title: `Add 'DocumentsSourceAddon' Addon`,
        post: false,
        get: false,
        children: ChildrenType.Special,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false
    }
})
export class DocumentsSourceAddon {
    /**
     * Get data from source
     * @param user
     * @param globalFilters
     */
    async getFromSource(user: IPolicyUser, globalFilters: any) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);

        const filters: any = {};
        if (!Array.isArray(ref.options.filters)) {
            throw new BlockActionError('filters option must be an array', ref.blockType, ref.uuid);
        }

        if (ref.options.onlyOwnDocuments) {
            filters.owner = user.did;
        } else if (ref.options.onlyGroupDocuments) {
            const users = await ref.databaseServer.getGroupMembers(ref.policyId, user.did);
            filters.owner = { $in: users };
        }

        if (ref.options.onlyAssignDocuments) {
            filters.assignedTo = user.did;
        }

        if (ref.options.schema) {
            filters.schema = ref.options.schema;
        }

        for (const filter of ref.options.filters) {
            const expr = filters[filter.field] || {};

            switch (filter.type) {
                case 'equal':
                    Object.assign(expr, { $eq: filter.value })
                    break;

                case 'not_equal':
                    Object.assign(expr, { $ne: filter.value });
                    break;

                case 'in':
                    Object.assign(expr, { $in: filter.value.split(',') });
                    break;

                case 'not_in':
                    Object.assign(expr, { $nin: filter.value.split(',') });
                    break;

                default:
                    throw new BlockActionError(`Unknown filter type: ${filter.type}`, ref.blockType, ref.uuid);
            }
            filters[filter.field] = expr;
        }

        const dynFilters = {};
        for (const [key, value] of Object.entries(ref.getFilters(user))) {
            dynFilters[key] = { $eq: value };
        }

        Object.assign(filters, dynFilters);
        if (globalFilters) {
            Object.assign(filters, globalFilters);
        }

        const otherOptions: any = {};
        if (ref.options.orderDirection) {
            otherOptions.orderBy = {};
            if (ref.options.orderField) {
                otherOptions.orderBy[ref.options.orderField] = ref.options.createdOrderDirection;
            } else {
                otherOptions.orderBy.createDate = ref.options.createdOrderDirection;
            }

        }

        let data: IPolicyDocument[];
        switch (ref.options.dataType) {
            case 'vc-documents':
                filters.policyId = ref.policyId;
                data = await ref.databaseServer.getVcDocuments(filters, otherOptions);
                break;
            case 'did-documents':
                data = await ref.databaseServer.getDidDocuments(filters, otherOptions);
                break;
            case 'vp-documents':
                filters.policyId = ref.policyId;
                data = await ref.databaseServer.getVpDocuments(filters, otherOptions);
                break;
            case 'standard-registries':
                data = await PolicyUtils.getAllStandardRegistryAccounts(ref);
                break;
            case 'approve':
                filters.policyId = ref.policyId;
                data = await ref.databaseServer.getApprovalDocuments(filters, otherOptions);
                break;
            case 'source':
                data = [];
                break;
            // @deprecated 2022-10-01
            case 'root-authorities':
                data = await PolicyUtils.getAllStandardRegistryAccounts(ref);
                break;
            default:
                throw new BlockActionError(`dataType "${ref.options.dataType}" is unknown`, ref.blockType, ref.uuid)
        }

        for (const dataItem of data) {
            if (ref.options.viewHistory) {

                dataItem.history = (await ref.databaseServer.getDocumentStates({
                    documentId: dataItem.id
                }, {
                    orderBy: { 'created': 'DESC' }
                })).map(item => {
                    return {
                        status: item.status,
                        created: new Date(item.created).toLocaleString(),
                        reason: item.reason
                    }
                });
            }
            dataItem.__sourceTag__ = ref.tag;
        }

        return data;
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            const types = [
                'vc-documents',
                'did-documents',
                'vp-documents',
                'root-authorities',
                'standard-registries',
                'approve',
                'source'
            ];
            if (types.indexOf(ref.options.dataType) === -1) {
                resultsContainer.addBlockError(ref.uuid, 'Option "dataType" must be one of ' + types.join(','));
            }

            if (ref.options.schema) {
                if (typeof ref.options.schema !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                    return;
                }
                const schema = await ref.databaseServer.getSchemaByIRI(ref.options.schema, ref.topicId);
                if (!schema) {
                    resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
