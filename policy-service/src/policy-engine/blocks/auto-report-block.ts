import { Report } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyReportBlock } from '@policy-engine/policy-engine.interface';
import { BlockActionError } from '@policy-engine/errors';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

interface IReport {

}

/**
 * Report block
 */
@Report({
    blockType: 'autoReportBlock',
    commonBlock: false,
    about: {
        label: 'Report',
        title: `Add 'Report' Block`,
        post: true,
        get: true,
        children: ChildrenType.None,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.RefreshEvent,
        ],
        output: null,
        defaultEvent: false
    },
    variables: []
})
export class ReportBlock {
    private readonly USER_FILTER_VALUE = 'USER_FILTER_VALUE';
    private readonly USER_REPORT = 'USER_FILTER_REPORT';

    private async createReport(user: IPolicyUser, document: any): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);

        let report: IReport;
        await ref.setCache<IReport>(this.USER_REPORT, report, user);
    }

    /**
     * Get block data
     * @param user
     * @param uuid
     */
    async getData(user: IPolicyUser, uuid: string): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            const report = await ref.getCache<IReport>(this.USER_REPORT, user);
            return {
                data: report
            };
        } catch (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }

    /**
     * Set block data
     * @param user
     * @param data
     */
    async setData(user: IPolicyUser, data: any) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);
        try {
            const value: string = data.filterValue;
            await ref.setCache<string>(this.USER_FILTER_VALUE, value, user);

            const vp = await ref.databaseServer.getVpDocument({ hash: value, policyId: ref.policyId });

            this.createReport(user, vp).then(null, (error) => {
                console.log('!---', error);
            });

            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
                value
            }));
        } catch (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }
}
