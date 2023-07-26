import { DataBaseHelper, MessageType, RegistrationMessage } from '@guardian/common';
import { AnalyticsStatus as Status } from '@entity/analytics-status';
import { AnalyticsUser as User } from '@entity/analytics-user';
import { ReportStatus } from '@interfaces/report-status.type';
import { ReportSteep } from '@interfaces/report-steep.type';
import { UserType } from '@interfaces/user.type';
import { AnalyticsUtils } from '@helpers/utils';

/**
 * Search users
 */
export class AnalyticsUserService {
    /**
     * Parse user messages
     * @param message
     */
    private static parsStandardRegistry(message: any): RegistrationMessage {
        try {
            if (typeof message.message !== 'string' || !message.message.startsWith('{')) {
                return;
            }
            const json = JSON.parse(message.message);
            if (json.type === MessageType.StandardRegistry) {
                const item = RegistrationMessage.fromMessageObject(json);
                if (item && item.validate()) {
                    item.setAccount(message.payer_account_id);
                    item.setIndex(message.sequence_number);
                    item.setId(message.id);
                    item.setTopicId(message.topicId);
                    return item;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Search users in root topic
     * @param report
     * @param skip
     */
    public static async search(report: Status, skip: boolean = false): Promise<Status> {
        await AnalyticsUtils.updateStatus(report, ReportSteep.STANDARD_REGISTRY, ReportStatus.PROGRESS);
        try {
            AnalyticsUtils.updateProgress(report, 1);
            report = await AnalyticsUtils.searchMessages(report, report.root, skip, async (message) => {
                const user = AnalyticsUserService.parsStandardRegistry(message);
                if (user) {
                    const row = new DataBaseHelper(User).create({
                        uuid: report.uuid,
                        root: report.root,
                        topicId: user.registrantTopicId,
                        did: user.did,
                        account: user.payer,
                        timeStamp: user.id,
                        type: UserType.STANDARD_REGISTRY,
                        action: user.action
                    });
                    await new DataBaseHelper(User).save(row);
                }
            });
            AnalyticsUtils.updateProgress(report);
            return report;
        } catch (error) {
            report.error = String(error);
            return report;
        }
    }
}