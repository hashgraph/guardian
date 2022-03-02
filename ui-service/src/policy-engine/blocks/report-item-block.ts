import { Inject } from "@helpers/decorators/inject";
import { Guardians } from "@helpers/guardians";
import { Users } from "@helpers/users";
import { ReportItem } from "@policy-engine/helpers/decorators";
import { PolicyComponentsStuff } from "@policy-engine/policy-components-stuff";
import { IPolicyReportItemBlock } from "@policy-engine/policy-engine.interface";

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

    public async run(resultFields: any[], mapVariables: any, userMap: any): Promise<any> {
        const ref = PolicyComponentsStuff.GetBlockRef<IPolicyReportItemBlock>(this);
        
        if (ref.options.variables) {
            for (let index = 0; index < ref.options.variables.length; index++) {
                const variable = ref.options.variables[index];
                mapVariables[variable.name] = variable.value;
            }
        }

        const items = ref.getItems();
        let resultField: any = {
            links: []
        };

        if (items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const element = items[i];
                element.run(resultField.links, mapVariables, userMap);
            }
        }

        if (!ref.options.itemVisible) {
            return resultFields;
        }

        const filtersToVc = {};
        const policyId = ref.policyId;
        const owner = ref.policyOwner;

        if (ref.options.filters) {
            for (let index = 0; index < ref.options.filters.length; index++) {
                const filter = ref.options.filters[index];

                if (filter.variableType === 'value') {
                    filtersToVc[filter.field] = filter.value;
                }
                else if (filter.variableType === 'variable'){
                    filtersToVc[filter.field] = mapVariables[filter.value];
                }
            }
        }   

        if (Object.keys(filtersToVc).length === 0) {
            return resultFields;
        }

        const vcDocument = (await this.guardians.getVcDocuments(filtersToVc))[0];

        if (!vcDocument) {
            return resultFields;
        }

        resultField = {
            ...resultField, 
            type: 'VC',
            id: vcDocument.hash,
            document: vcDocument.document,
            entity: vcDocument.type,
            owner: vcDocument.owner,
            label: 'HASH',
            itemTitle: ref.options.itemTitle,
            itemDescription: ref.options.itemDescription,
            itemIcon: ref.options.itemIcon,
        }

        resultFields.push(resultField);

        if (!vcDocument.document?.issuer) {
            return resultFields;
        }

        const user = await this.users.getUserById(vcDocument.document.issuer);
        if (user?.username && !userMap[vcDocument.document.issuer]) {
            userMap[vcDocument.document.issuer] = user.username;
        }

        const didDocuments = await this.guardians.getDidDocuments({
            did: vcDocument.document.issuer
        });

        if (didDocuments.length === 0) {
            return resultFields;
        }

        resultFields.push({
            type: 'DID',
            id: vcDocument.document?.issuer,
            document: didDocuments,
            owner: vcDocument.document?.issuer,
            label: 'DID',
            entity: 'DID',
        });

        return resultFields;
    }
}
