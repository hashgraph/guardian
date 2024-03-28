import { Report } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { AnyBlockType, IPolicyReportBlock } from '@policy-engine/policy-engine.interface';
import { BlockActionError } from '@policy-engine/errors';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import { IReport, MessagesReport } from '../helpers/messages-report';
import { PolicyUtils } from '@policy-engine/helpers/utils';

/**
 * Report block
 */
@Report({
    blockType: 'messagesReportBlock',
    commonBlock: false,
    about: {
        label: 'Messages Report',
        title: `Add 'Messages Report' Block`,
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
export class MessagesReportBlock {
    /**
     * Key (Message Id)
     * @private
     */
    private readonly USER_FILTER_VALUE = 'USER_FILTER_VALUE';
    /**
     * Key (Report)
     * @private
     */
    private readonly USER_REPORT = 'USER_REPORT';
    /**
     * Key (Status)
     * @private
     */
    private readonly USER_REPORT_STATUS = 'USER_REPORT_STATUS';

    /**
     * Update user state
     * @private
     */
    private updateStatus(ref: AnyBlockType, status: string, user: IPolicyUser) {
        ref.updateBlock({ status }, user);
    }

    /**
     * Create Report
     * @param user
     * @param messageId
     * @private
     */
    private async createReport(user: IPolicyUser, messageId: string): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyReportBlock>(this);
        try {
            const report = new MessagesReport();
            await report.start(messageId);
            await ref.setLongCache<IReport>(this.USER_REPORT, report.toJson(), user);
            await ref.setShortCache<string>(this.USER_REPORT_STATUS, 'FINISHED', user);
            this.updateStatus(ref, 'FINISHED', user);
        } catch (error) {
            await ref.setShortCache<string>(this.USER_REPORT_STATUS, 'FAILED', user);
            ref.error(`Create Report: ${PolicyUtils.getErrorMessage(error)}`);
            this.updateStatus(ref, 'FAILED', user);
        }
    }

    /**
     * Get block data
     * @param user
     * @param uuid
     */
    async getData(user: IPolicyUser, uuid: string): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            const target = await ref.getCache<string>(this.USER_FILTER_VALUE, user);
            const report = await ref.getCache<IReport>(this.USER_REPORT, user);
            const status = await ref.getCache<string>(this.USER_REPORT_STATUS, user);
            return {
                target,
                report,
                status
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
            if (!value) {
                await ref.setShortCache<string>(this.USER_FILTER_VALUE, null, user);
                await ref.setLongCache<IReport>(this.USER_REPORT, null, user);
                await ref.setShortCache<string>(this.USER_REPORT_STATUS, null, user);
                return false;
            }

            let messageId: string;
            const vp = await ref.databaseServer.getVpDocument({ hash: value, policyId: ref.policyId });
            [vp.serials, vp.amount] = await ref.databaseServer.getVPMintInformation(vp);
            if (vp) {
                messageId = vp.messageId;
            } else {
                const vc = await ref.databaseServer.getVcDocument({ hash: value, policyId: ref.policyId })
                if (vc) {
                    messageId = vc.messageId;
                } else {
                    messageId = value;
                }
            }
            if (messageId) {
                const status = await ref.getCache<string>(this.USER_REPORT_STATUS, user);
                if (status === 'STARTED') {
                    throw Error('The report is already being calculated');
                }
                const old = await ref.getCache<string>(this.USER_FILTER_VALUE, user);
                if (messageId === old && status !== 'FAILED') {
                    return true;
                }
                await ref.setShortCache<string>(this.USER_FILTER_VALUE, messageId, user);
                await ref.setLongCache<IReport>(this.USER_REPORT, null, user);
                await ref.setShortCache<string>(this.USER_REPORT_STATUS, 'STARTED', user);
                this.createReport(user, messageId).then();
                PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
                    value: messageId
                }));
                return true;
            } else {
                await ref.setShortCache<string>(this.USER_FILTER_VALUE, null, user);
                await ref.setLongCache<IReport>(this.USER_REPORT, null, user);
                await ref.setShortCache<string>(this.USER_REPORT_STATUS, null, user);
                throw Error('Invalid MessageId/HASH');
            }
        } catch (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }
}
