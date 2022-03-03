import { Inject } from "@helpers/decorators/inject";
import { Guardians } from "@helpers/guardians";
import { Users } from "@helpers/users";
import { findOptions, getVCIssuer } from "@helpers/utils";
import { ReportItem } from "@policy-engine/helpers/decorators";
import { PolicyComponentsStuff } from "@policy-engine/policy-components-stuff";
import { IPolicyReportItemBlock } from "@policy-engine/policy-engine.interface";
import { IReportItem } from "interfaces";

/**
 * Report item block
 */
@ReportItem({
    blockType: 'reportItemBlock',
    commonBlock: true
})
export class ReportItemBlock {
    @Inject()
    public guardians: Guardians;

    @Inject()
    public users: Users;

    public async run(resultFields: IReportItem[], variables: any): Promise<any> {
        const ref = PolicyComponentsStuff.GetBlockRef<IPolicyReportItemBlock>(this);
        const icon = ref.options.icon;
        const title = ref.options.title;
        const description = ref.options.description;
        const visible = ref.options.visible;
        const item: IReportItem = {
            type: 'VC',
            icon: icon,
            title: title,
            description: description,
            visible: visible,
            tag: null,
            issuer: null,
            username: null,
            document: null
        }
        resultFields.push(item);

        const filtersToVc = {};
        if (ref.options.filters) {
            for (let index = 0; index < ref.options.filters.length; index++) {
                const filter = ref.options.filters[index];
                if (filter.typeValue === 'value') {
                    filtersToVc[filter.field] = filter.value;
                }
                else if (filter.typeValue === 'variable') {
                    filtersToVc[filter.field] = variables[filter.value];
                }
            }
        }

        const vcDocument = (await this.guardians.getVcDocuments(filtersToVc))[0];

        if (vcDocument) {
            item.tag = vcDocument.tag;
            item.issuer = getVCIssuer(vcDocument);
            item.username = getVCIssuer(vcDocument);
            item.document = vcDocument;

            if (ref.options.variables) {
                for (let index = 0; index < ref.options.variables.length; index++) {
                    const variable = ref.options.variables[index];
                    variables[variable.name] = findOptions(vcDocument, variable.value);
                }
            }
        }

        const items = ref.getItems();
        if (items.length > 0) {
            const documents: IReportItem[] = [];
            for (let i = 0; i < items.length; i++) {
                const element = items[i];
                await element.run(documents, variables);
            }
            item.documents = documents;
        }

        return resultFields;
    }
}
