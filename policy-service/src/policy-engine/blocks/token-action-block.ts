import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { IPolicyBlock, IPolicyEventState, IPolicyGetData } from '../policy-engine.interface.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyUser } from '../policy-user.js';
import { BlockActionError } from '../errors/index.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { LocationType } from '@guardian/interfaces';
import { Token } from '@guardian/common';
import { PolicyActionsUtils } from '../policy-actions/utils.js';

const IDEMPOTENT_ERROR_MAP: Partial<Record<string, string[]>> = {
    grantKyc: ['Token already granted kyc'],
}

function getErrorMessage(err: unknown): string {
    const e: any = err;
    return String(
        e?.message ??
        e?.response?.data?.message ??
        e?.data?.message ??
        e?.error?.message ??
        err
    );
}

function shouldIgnore(action: string, err: unknown, isDryRun: boolean): boolean {
    if (!isDryRun) {
        return false;
    }
    const list = IDEMPOTENT_ERROR_MAP[action];
    if (!list?.length) {
        return false
    }
    const msg = getErrorMessage(err).toLowerCase();
    return list.some((s) => msg.includes(s.toLowerCase()));
}

async function runIdempotent<T>(
    ref: IPolicyBlock,
    action: string,
    exec: () => Promise<T>
): Promise<T | null> {
    try {
        return await exec();
    } catch (e) {
        if (shouldIgnore(action, e, !!ref.dryRun)) {
            return null;
        }
        throw e;
    }
}

/**
 * Information block
 */
@BasicBlock({
    blockType: 'tokenActionBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Token Action',
        title: `Add 'Token Action' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true
    },
    variables: [
        { path: 'options.tokenId', alias: 'token', type: 'Token' },
        { path: 'options.template', alias: 'template', type: 'TokenTemplate' }
    ]
})
export class TokenActionBlock {
    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        return {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            uiMetaData: ref.options?.uiMetaData
        };
    }

    /**
     * Run block action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const userId = event?.user?.userId;
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        ref.log(`runAction`);
        const field = ref.options.accountId;
        const documents = event?.data?.data;
        const doc = Array.isArray(documents) ? documents[0] : documents;

        let token: Token | null;
        if (!ref.options.useTemplate) {
            token = await ref.databaseServer.getToken(ref.options.tokenId);
        }
        if (ref.options.useTemplate && doc && doc.tokens) {
            token = await ref.databaseServer.getToken(doc.tokens[ref.options.template], ref.dryRun);
        }
        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }

        let relayerAccount: string = null;
        let userDID: string = null;
        if (doc && field && doc.accounts) {
            relayerAccount = doc.accounts[field];
        } else if (doc && !field) {
            userDID = doc.owner;
            relayerAccount = await PolicyUtils.getDocumentRelayerAccount(ref, doc, userId);
        }
        if (!relayerAccount) {
            throw new BlockActionError('Hedera Account not found.', ref.blockType, ref.uuid);
        }

        switch (ref.options.action) {
            case 'associate': {
                await PolicyActionsUtils.associateToken({
                    ref,
                    token,
                    user: userDID,
                    relayerAccount,
                    userId
                });
                break;
            }
            case 'dissociate': {
                await PolicyActionsUtils.dissociateToken({
                    ref,
                    token,
                    user: userDID,
                    relayerAccount,
                    userId
                });
                break;
            }
            case 'freeze': {
                const account = PolicyUtils.createHederaCredentials(relayerAccount);
                const policyOwner = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
                const ownerCredentials = await policyOwner.loadHederaCredentials(ref, userId);
                await PolicyUtils.freeze(ref, token, account, ownerCredentials, userId);
                break;
            }
            case 'unfreeze': {
                const account = PolicyUtils.createHederaCredentials(relayerAccount);
                const policyOwner = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
                const ownerCredentials = await policyOwner.loadHederaCredentials(ref, userId);
                await PolicyUtils.unfreeze(ref, token, account, ownerCredentials, userId);
                break;
            }
            case 'grantKyc': {
                const account = PolicyUtils.createHederaCredentials(relayerAccount);
                const policyOwner = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
                const ownerCredentials = await policyOwner.loadHederaCredentials(ref, userId);
                await runIdempotent(ref, 'grantKyc', () =>
                    PolicyUtils.grantKyc(ref, token, account, ownerCredentials, userId)
                );

                break;
            }
            case 'revokeKyc': {
                const account = PolicyUtils.createHederaCredentials(relayerAccount);
                const policyOwner = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
                const ownerCredentials = await policyOwner.loadHederaCredentials(ref, userId);
                await PolicyUtils.revokeKyc(ref, token, account, ownerCredentials, userId);
                break;
            }
            default:
                break;
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event.user, {
            action: ref.options.action
        }));

        ref.backup();
    }
}
