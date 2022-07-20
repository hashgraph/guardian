import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { findOptions, getVCIssuer } from '@helpers/utils';
import { ReportItem } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyReportItemBlock } from '@policy-engine/policy-engine.interface';
import { IReportItem } from '@guardian/interfaces';
import { BlockActionError } from '@policy-engine/errors';
import { getMongoRepository } from 'typeorm';
import { VcDocument } from '@entity/vc-document';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';

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
    }
})
export class ReportItemBlock {
    /**
     * Users helper
     */
    @Inject()
    public users: Users;

    /**
     * Run logic
     * @param resultFields
     * @param variables
     */
    public async run(resultFields: IReportItem[], variables: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportItemBlock>(this);
        const icon = ref.options.icon;
        const title = ref.options.title;
        const description = ref.options.description;
        const visible = ref.options.visible;
        const iconType = ref.options.iconType;
        const item: IReportItem = {
            type: 'VC',
            icon,
            title,
            description,
            visible,
            tag: null,
            issuer: null,
            username: null,
            document: null,
            iconType
        }
        resultFields.push(item);

        const filtersToVc:any = {};
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
                            expr = { $in: expr };
                        } else if (expr) {
                            expr = { $in: [expr] };
                        }
                        expr = { $nin: expr };
                        break;

                    default:
                        throw new BlockActionError(`Unknown filter type: ${filter.type}`, ref.blockType, ref.uuid);
                }
                filtersToVc[filter.field] = expr;
            }
        }
        filtersToVc.policyId = { $eq: ref.policyId };

        const vcDocument = await getMongoRepository(VcDocument).findOne(filtersToVc);

        if (vcDocument) {
            item.tag = vcDocument.tag;
            item.issuer = getVCIssuer(vcDocument);
            item.username = getVCIssuer(vcDocument);
            item.document = vcDocument;

            if (ref.options.variables) {
                for (const variable of ref.options.variables) {
                    variables[variable.name] = findOptions(vcDocument, variable.value);
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

        return resultFields;
    }
}
