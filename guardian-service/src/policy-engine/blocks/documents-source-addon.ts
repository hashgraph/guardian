import { SourceAddon } from '@policy-engine/helpers/decorators';
import { BlockActionError } from '@policy-engine/errors';
import { Inject } from '@helpers/decorators/inject';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { Users } from '@helpers/users';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyAddonBlock } from '@policy-engine/policy-engine.interface';
import { getMongoRepository } from 'typeorm';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { VpDocument as VpDocumentCollection } from '@entity/vp-document';
import { Schema as SchemaCollection } from '@entity/schema';
import { DidDocument as DidDocumentCollection } from '@entity/did-document';
import { ApprovalDocument as ApprovalDocumentCollection } from '@entity/approval-document';
import { DocumentState } from '@entity/document-state';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IAuthUser } from '@guardian/common';

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
     * Users helper
     * @private
     */
    @Inject()
    private readonly users: Users;

    /**
     * Get data from source
     * @param user
     * @param globalFilters
     */
    async getFromSource(user: IAuthUser, globalFilters: any) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);

        const filters: any = {};
        if (!Array.isArray(ref.options.filters)) {
            throw new BlockActionError('filters option must be an array', ref.blockType, ref.uuid);
        }

        if (ref.options.onlyOwnDocuments) {
            filters.owner = user.did;
        }

        if (ref.options.onlyAssignDocuments) {
            filters.assign = user.did;
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

        const filtersWithOrder: any = { where: filters };
        if (ref.options.orderDirection) {
            filtersWithOrder.order = {};
            if (ref.options.orderField) {
                filtersWithOrder.order[ref.options.orderField] = ref.options.createdOrderDirection;
            } else {
                filtersWithOrder.order.createDate = ref.options.createdOrderDirection;
            }

        }

        let data: any[];
        switch (ref.options.dataType) {
            case 'vc-documents':
                filters.policyId = ref.policyId;
                data = await getMongoRepository(VcDocumentCollection).find(filtersWithOrder);
                break;
            case 'did-documents':
                data = await getMongoRepository(DidDocumentCollection).find(filtersWithOrder);
                break;
            case 'vp-documents':
                filters.policyId = ref.policyId;
                data = await getMongoRepository(VpDocumentCollection).find(filtersWithOrder);
                break;
            case 'standard-registries':
                data = await this.users.getAllStandardRegistryAccounts() as IAuthUser[];
                break;
            case 'approve':
                filters.policyId = ref.policyId;
                data = await getMongoRepository(ApprovalDocumentCollection).find(filtersWithOrder);
                break;
            case 'source':
                data = [];
                break;
            // @deprecated 2022-10-01
            case 'root-authorities':
                data = await this.users.getAllStandardRegistryAccounts() as IAuthUser[];
                break;
            default:
                throw new BlockActionError(`dataType "${ref.options.dataType}" is unknown`, ref.blockType, ref.uuid)
        }

        const documentState = getMongoRepository(DocumentState);
        for (const dataItem of data) {
            if (ref.options.viewHistory) {
                dataItem.history = (await documentState.find({
                    where: {
                        documentId: dataItem.id
                    },
                    order: {
                        'created': 'DESC'
                    }
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
                const schema = await getMongoRepository(SchemaCollection).findOne({
                    iri: ref.options.schema,
                    topicId: ref.topicId
                });
                if (!schema) {
                    resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
