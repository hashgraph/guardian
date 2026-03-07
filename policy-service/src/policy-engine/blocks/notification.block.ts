import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import {
    IPolicyEventState,
    IPolicyRequestBlock,
} from '../policy-engine.interface.js';
import {
    IPolicyEvent,
    PolicyInputEventType,
    PolicyOutputEventType,
} from '../interfaces/index.js';
import {
    ChildrenType,
    ControlType,
    PropertyType,
    SelectItemType,
} from '../interfaces/block-about.js';
import {
    ExternalDocuments,
    ExternalEvent,
    ExternalEventType,
} from '../interfaces/external-event.js';
import { PolicyUtils } from '../helpers/utils.js';
import { NotificationHelper, Users } from '@guardian/common';
import {
    LocationType,
    NotificationAction,
    NotificationType,
    UserOption,
} from '@guardian/interfaces';
import { PolicyUser } from '@policy-engine/policy-user.js';

/**
 * Notification block
 */
@BasicBlock({
    blockType: 'notificationBlock',
    actionType: LocationType.LOCAL,
    about: {
        label: 'Notification',
        title: `Add 'Notification' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [PolicyInputEventType.RunEvent],
        output: [PolicyOutputEventType.RunEvent],
        defaultEvent: true,
        properties: [
            {
                name: 'title',
                label: 'Title',
                title: 'Title',
                type: PropertyType.Input,
                required: true,
                editable: true
            },
            {
                name: 'message',
                label: 'Message',
                title: 'Message',
                type: PropertyType.Input,
                required: true,
                editable: true
            },
            {
                name: 'type',
                label: 'Type',
                title: 'Type',
                type: PropertyType.Select,
                editable: true,
                items: [
                    {
                        label: 'Info',
                        value: NotificationType.INFO,
                    },
                    {
                        label: 'Success',
                        value: NotificationType.SUCCESS,
                    },
                    {
                        label: 'Warn',
                        value: NotificationType.WARN,
                    },
                    {
                        label: 'Error',
                        value: NotificationType.ERROR,
                    },
                ],
                default: 'info',
            },
            {
                name: 'link',
                label: 'Link notification to policy',
                title: 'Link notification to policy',
                type: PropertyType.Checkbox,
                editable: true
            },
            {
                name: 'user',
                label: 'User',
                title: 'User',
                type: PropertyType.Select,
                editable: true,
                items: [
                    {
                        label: 'All',
                        value: UserOption.ALL,
                    },
                    {
                        label: 'Current user',
                        value: UserOption.CURRENT,
                    },
                    {
                        label: 'Policy owner',
                        value: UserOption.POLICY_OWNER,
                    },
                    {
                        label: 'Document owner',
                        value: UserOption.DOCUMENT_OWNER,
                    },
                    {
                        label: 'Document issuer',
                        value: UserOption.DOCUMENT_ISSUER,
                    },
                    {
                        label: 'Group owner',
                        value: UserOption.GROUP_OWNER,
                    },
                    {
                        label: 'Role',
                        value: UserOption.ROLE,
                    },
                ],
                default: 'current',
            },
            {
                name: 'role',
                label: 'Role',
                title: 'Role',
                type: PropertyType.Select,
                items: SelectItemType.Roles,
                visible: 'user === "ROLE"',
                required: true,
                editable: true
            },
            {
                name: 'grouped',
                label: 'Only for current user group',
                title: 'Only for current user group',
                type: PropertyType.Checkbox,
                visible: 'user === "ROLE"',
                editable: true
            },
        ],
    },
})
export class NotificationBlock {
    /**
     * Get notification function
     * @param ref Block ref
     * @returns Function
     */
    private async getNotificationFunction(
        ref: any,
        user: PolicyUser
    ): Promise<(title: string, message: string, userId: string) => void> {
        let fn;
        const options = await ref.getOptions(user);

        switch (options.type) {
            case NotificationType.INFO:
                fn = NotificationHelper.info;
                break;
            case NotificationType.SUCCESS:
                fn = NotificationHelper.success;
                break;
            case NotificationType.WARN:
                fn = NotificationHelper.warn;
                break;
            case NotificationType.ERROR:
                fn = NotificationHelper.error;
                break;
            default:
                fn = NotificationHelper.info;
        }

        let notify = fn;
        if (options.link) {
            notify = async (title: string, message: string, userId: string) =>
                await fn(
                    title,
                    message,
                    userId,
                    NotificationAction.POLICY_VIEW,
                    ref.policyId
                );
        }
        return notify;
    }

    /**
     * Run block action
     * @param event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent],
    })
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref =
            PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);

        const options = await ref.getOptions(event.user);

        const notify = await this.getNotificationFunction(ref, event.user);

        switch (options.user) {
            case UserOption.ALL: {
                if (!ref.dryRun) {
                    const policyUsers =
                        await ref.databaseServer.getAllPolicyUsers(
                            ref.policyId
                        );
                    const users = await new Users().getUsersByIds(
                        policyUsers.map((pu) => pu.did), event?.user?.userId
                    );
                    for (const user of users) {
                        await notify(
                            options.title,
                            options.message,
                            user.id
                        );
                    }
                }
            }
            case UserOption.CURRENT: {
                if (event.user.did !== ref.policyOwner && !ref.dryRun) {
                    const user = await PolicyUtils.getUser(ref, event.user.did, event?.user?.userId);
                    await notify(
                        options.title,
                        options.message,
                        user.id
                    );
                    break;
                }
            }
            // tslint:disable-next-line:no-duplicate-switch-case
            case UserOption.CURRENT:
            // tslint:disable-next-line:no-duplicate-switch-case
            case UserOption.ALL:
            case UserOption.POLICY_OWNER: {
                const owner = await new Users().getUserById(ref.policyOwner, event?.user?.userId);
                await notify(options.title, options.message, owner.id);
                break;
            }
            case UserOption.DOCUMENT_OWNER: {
                const user = await PolicyUtils.getUser(
                    ref,
                    Array.isArray(event.data.data)
                        ? event.data.data[0].owner
                        : event.data.data.owner,
                    event?.user?.userId
                );
                if (user.did === ref.policyOwner || !ref.dryRun) {
                    await notify(
                        options.title,
                        options.message,
                        user.id
                    );
                }
                break;
            }
            case UserOption.DOCUMENT_ISSUER: {
                const user = await PolicyUtils.getUser(
                    ref,
                    Array.isArray(event.data.data)
                        ? event.data.data[0].document?.issuer
                        : event.data.data.document?.issuer,
                    event?.user?.userId
                );
                if (user.did === ref.policyOwner || !ref.dryRun) {
                    await notify(
                        options.title,
                        options.message,
                        user.id
                    );
                }
                break;
            }
            case UserOption.GROUP_OWNER: {
                const roles = await ref.databaseServer.getUserRoles(
                    ref.policyId,
                    event.user.did
                );
                for (const role of roles) {
                    const owner = await PolicyUtils.getUser(ref, role.owner, event?.user?.userId);
                    if (owner.did === ref.policyOwner || !ref.dryRun) {
                        await notify(
                            options.title,
                            options.message,
                            owner.id
                        );
                    }
                }
                break;
            }
            case UserOption.ROLE: {
                let policyUsers = options.grouped
                    ? await ref.databaseServer.getAllUsersByRole(
                          ref.policyId,
                          event.user.group,
                          options.role
                      )
                    : await ref.databaseServer.getUsersByRole(
                          ref.policyId,
                          options.role
                      );
                policyUsers = ref.dryRun
                    ? policyUsers.filter((pu) => pu.did === ref.policyOwner)
                    : policyUsers;
                const users = await new Users().getUsersByIds(
                    policyUsers.map((pu) => pu.did), event?.user?.userId
                );
                for (const user of users) {
                    await notify(
                        options.title,
                        options.message,
                        user.id
                    );
                }
                break;
            }
            default:
        }

        await ref.triggerEvents(
            PolicyOutputEventType.RunEvent,
            event.user,
            event.data,
            event.actionStatus
        );
        await ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null, event.actionStatus);
        PolicyComponentsUtils.ExternalEventFn(
            new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
                documents: ExternalDocuments(event.data?.data),
            })
        );
        ref.backup();

        return event.data;
    }
}
