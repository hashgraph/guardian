import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { IPolicyBlock, IPolicyEventState } from '../policy-engine.interface.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { PolicyUtils } from '../helpers/utils.js';
import { IHederaCredentials, PolicyUser } from '../policy-user.js';
import { BlockActionError } from '../errors/index.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';

/**
 * Information block
 */
@BasicBlock({
    blockType: 'tokenActionBlock',
    commonBlock: false,
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
    async getData(user: PolicyUser): Promise<any> {
        const { options } = PolicyComponentsUtils.GetBlockRef(this);
        return { uiMetaData: options.uiMetaData };
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
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        ref.log(`runAction`);
        const field = ref.options.accountId;
        const documents = event?.data?.data;
        const doc = Array.isArray(documents) ? documents[0] : documents;

        let token;
        if (!ref.options.useTemplate) {
            token = await ref.databaseServer.getToken(ref.options.tokenId);
        }

        let account: IHederaCredentials = null;
        if (doc) {
            if (field) {
                if (doc.accounts) {
                    account = {
                        hederaAccountId: doc.accounts[field],
                        hederaAccountKey: null
                    }
                }
            } else {
                const user = await PolicyUtils.getUserCredentials(ref, doc.owner);
                account = await user.loadHederaCredentials(ref);
            }
            if (ref.options.useTemplate) {
                if (doc.tokens) {
                    token = await ref.databaseServer.getToken(doc.tokens[ref.options.template], ref.dryRun);
                }
            }
        }

        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }

        await PolicyUtils.checkAccountId(account);

        const policyOwner = await PolicyUtils.getUserCredentials(ref, ref.policyOwner);
        const ownerCredentials = await policyOwner.loadHederaCredentials(ref);

        switch (ref.options.action) {
            case 'associate': {
                await PolicyUtils.associate(ref, token, account);
                break;
            }
            case 'dissociate': {
                await PolicyUtils.dissociate(ref, token, account);
                break;
            }
            case 'freeze': {
                await PolicyUtils.freeze(ref, token, account, ownerCredentials);
                break;
            }
            case 'unfreeze': {
                await PolicyUtils.unfreeze(ref, token, account, ownerCredentials);
                break;
            }
            case 'grantKyc': {
                await PolicyUtils.grantKyc(ref, token, account, ownerCredentials);
                break;
            }
            case 'revokeKyc': {
                await PolicyUtils.revokeKyc(ref, token, account, ownerCredentials);
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
