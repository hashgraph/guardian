import { findOptions, getVCIssuer } from '@guardian/common';
import { ReportItem } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyReportItemBlock } from '@policy-engine/policy-engine.interface';
import { IReportItem } from '@guardian/interfaces';
import { BlockActionError } from '@policy-engine/errors';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

/**
 * Report item block
 */
@ReportItem({
    blockType: 'reportItemBlock',
    commonBlock: true,
    about: {
        label: 'Report Item',
        title: `Add 'Report Item' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false
    },
    variables: []
})
export class ReportItemBlock {

    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        const ref =
            PolicyComponentsUtils.GetBlockRef<IPolicyReportItemBlock>(this);
        const documentCacheFields =
            PolicyComponentsUtils.getDocumentCacheFields(ref.policyId);
        ref.options?.filters
            ?.filter((filter) => filter.field?.startsWith('document.'))
            .forEach((filter) => {
                documentCacheFields.add(filter.field.replace('document.', ''));
            });
        ref.options?.variables
            ?.filter((variable) => variable.value?.startsWith('document.'))
            .forEach((variable) => {
                documentCacheFields.add(
                    variable.value.replace('document.', '')
                );
            });
    }

    /**
     * Run logic
     * @param resultFields
     * @param variables
     */
    public async run(
        resultFields: IReportItem[],
        variables: any
    ): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportItemBlock>(this);
        const icon = ref.options.icon;
        const title = ref.options.title;
        const description = ref.options.description;
        const visible = ref.options.visible;
        const iconType = ref.options.iconType;
        const multiple = ref.options.multiple;
        const dynamicFilters = ref.options.dynamicFilters;

        const filtersToVc: any = {};
        if (ref.options.filters) {
            for (const filter of ref.options.filters) {
                let expr: any;
                if (filter.typeValue === 'value') {
                    expr = filter.value;
                } else if (filter.typeValue === 'variable') {
                    expr = variables[filter.value];
                }
                switch (filter.type) {
                    case 'equal':
                        expr = { $eq: expr };
                        break;

                    case 'not_equal':
                        expr = { $ne: expr };
                        break;

                    case 'in':
                        if (Array.isArray(expr)) {
                            expr = { $in: expr };
                        } else if (expr) {
                            expr = { $in: [expr] };
                        }
                        break;

                    case 'not_in':
                        if (Array.isArray(expr)) {
                            expr = { $nin: expr };
                        } else if (expr) {
                            expr = { $nin: [expr] };
                        }
                        break;

                    default:
                        throw new BlockActionError(`Unknown filter type: ${filter.type}`, ref.blockType, ref.uuid);
                }
                filtersToVc[filter.field] = expr;
            }
        }
        filtersToVc.policyId = { $eq: ref.policyId };

        const item: any = {
            type: 'VC',
            icon,
            title,
            description,
            visible,
            iconType,
            multiple,
            dynamicFilters,
            document: multiple ? [] : null
        }
        resultFields.push(item);

        const vcDocuments: any[] = multiple
            ? await ref.databaseServer.getVcDocuments(filtersToVc)
            : [await ref.databaseServer.getVcDocument(filtersToVc)];
        const notFoundDocuments = vcDocuments.filter((vc) => vc).length < 1;
        item.notFoundDocuments = notFoundDocuments;

        for (const vcDocument of vcDocuments) {
            if (vcDocument) {
                if (multiple) {
                    item.document = item.document || [];
                    item.document.push({
                        tag: vcDocument.tag,
                        issuer: getVCIssuer(vcDocument),
                        username: getVCIssuer(vcDocument),
                        document: vcDocument
                    });
                } else {
                    item.tag = vcDocument.tag;
                    item.issuer = getVCIssuer(vcDocument);
                    item.username = getVCIssuer(vcDocument);
                    item.document = vcDocument;
                }

                if (ref.options.variables) {
                    for (const variable of ref.options.variables) {
                        const findOptionsResult = findOptions(vcDocument, variable.value);
                        if (multiple) {
                            variables[variable.name] = variables[variable.name] || []
                            if (Array.isArray(findOptionsResult)) {
                                variables[variable.name].push(...findOptionsResult);
                            } else {
                                variables[variable.name].push(findOptionsResult);
                            }
                        } else {
                            variables[variable.name] = findOptionsResult;
                        }
                    }
                }
            }
        }

        const items = ref.getItems();
        if (items.length > 0) {
            const documents: IReportItem[] = [];
            for (const element of items) {
                await element.run(documents, variables);
            }
            item.documents = documents;
        }

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, null, null));

        return [notFoundDocuments, resultFields];
    }
}
