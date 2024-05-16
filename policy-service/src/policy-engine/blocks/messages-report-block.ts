import { Report } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType, IPolicyReportBlock } from '../policy-engine.interface.js';
import { BlockActionError } from '../errors/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyInputEventType } from '../interfaces/index.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { IReport, MessagesReport } from '../helpers/messages-report.js';
import { PolicyUtils } from '../helpers/utils.js';

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
    private updateStatus(ref: AnyBlockType, status: string, user: PolicyUser) {
        ref.updateBlock({ status }, user);
    }

    /**
     * Create Report
     * @param user
     * @param messageId
     * @private
     */
    private async createReport(user: PolicyUser, messageId: string): Promise<void> {
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
    async getData(user: PolicyUser, uuid: string): Promise<any> {
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
    async setData(user: PolicyUser, data: any) {
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
            const vp: any = await ref.databaseServer.getVpDocument({ hash: value, policyId: ref.policyId });
            [vp.serials, vp.amount, vp.error, vp.wasTransferNeeded, vp.transferSerials, vp.transferAmount, vp.tokenIds] = await ref.databaseServer.getVPMintInformation(vp);
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
