import { Inject } from '@helpers/decorators/inject';
import { Guardians } from '@helpers/guardians';
import { Report } from '@policy-engine/helpers/decorators';
import {PolicyComponentsStuff} from '@policy-engine/policy-components-stuff';
import { IPolicyReportBlock } from '@policy-engine/policy-engine.interface';

@Report({
    blockType: 'reportBlock',
    commonBlock: false
})
export class ReportBlock {

    @Inject()
    public guardian: Guardians;

    async getData(user, uuid, params): Promise<any> {
        if (!params?.hash) {
            return null;
        }

        const ref = PolicyComponentsStuff.GetBlockRef<IPolicyReportBlock>(this);
        const reportItems = ref.getItems();

        const vpDocument = (await this.guardian.getVpDocuments({
            hash: params.hash
        }))[0];

        if (!vpDocument) {
            return null;
        }

        const scope = {
            result: [{
                type: 'VP',
                id: vpDocument.hash,
                document: vpDocument.document,
                owner: vpDocument.owner,
                schema: 'VerifiablePresentation',
                label: 'HASH',
                entity: 'VP',
                tag: vpDocument.tag
            }],
            map: {},
            userMap: {}
        }

        for (let i = 0; i < reportItems.length; i++) {
            const reportItem = reportItems[i];
            await reportItem.run(scope.result, scope.map, scope.userMap);
        }

        const schemas = await this.guardian.getSchemesByOwner(null);

        return {schemas, chain: scope.result, userMap: scope.userMap};
    }
}
