import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { ActionCallback, EventBlock, StateField } from '../helpers/decorators/index.js';
import { ActionType, IPolicyBlock, IPolicyEventState, IPolicyGetData } from '../policy-engine.interface.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { PolicyUtils } from '../helpers/utils.js';
import { Token as TokenCollection } from '@guardian/common';
import { BlockActionError } from '../errors/index.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { LocationType } from '@guardian/interfaces';
import { RecordActionStep } from '../record-action-step.js';
/**
 * Information block
 */
@EventBlock({
    blockType: 'tokenConfirmationBlock',
    commonBlock: false,
    actionType: LocationType.CUSTOM,
    about: {
        label: 'Token Confirmation',
        title: `Add 'Token Confirmation' Block`,
        post: true,
        get: true,
        children: ChildrenType.None,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.Confirm,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: false
    },
    variables: [
        { path: 'options.tokenId', alias: 'token', type: 'Token' }
    ]
})
export class TokenConfirmationBlock {
    /**
     * Block state
     * @private
     */
    @StateField()
    declare state: {
        [key: string]: {
            /**
             * Hedera account
             */
            accountId: string,
            /**
             * Event data
             */
            data: IPolicyEventState,
            /**
             * Event user
             */
            user: PolicyUser,
            /**
             * Token id
             */
            tokenId: string
        }
    };

    public async beforeInit(): Promise<void> {
        this.state = {};
    }

    /**
     * Token
     * @private
     */
    private token: TokenCollection | null;

    /**
     * Get Schema
     */
    async getToken(): Promise<TokenCollection> {
        if (!this.token) {
            const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
            this.token = await ref.databaseServer.getToken(ref.options.tokenId);
        }
        return this.token;
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        const blockState: any = this.state[user?.id] || {};
        const token = await this.getToken();
        const block: IPolicyGetData = {
            id: ref.uuid,
            blockType: 'tokenConfirmationBlock',
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            action: ref.options.action,
            accountId: blockState.accountId,
            tokenName: token.tokenName,
            tokenSymbol: token.tokenSymbol,
            tokenId: token.tokenId
        };
        return block;
    }

    async localSetData(user: PolicyUser, data: {
        action: 'confirm' | 'skip',
        hederaAccountKey: string
    }): Promise<{
        action: 'confirm' | 'skip'
    }> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        if (!data) {
            throw new BlockActionError(`Data is unknown`, ref.blockType, ref.uuid)
        }

        const blockState = this.state[user?.id];
        if (!blockState) {
            throw new BlockActionError(`Document not found`, ref.blockType, ref.uuid)
        }

        if (!['confirm', 'skip'].includes(data.action)) {
            throw new BlockActionError(`Invalid Action`, ref.blockType, ref.uuid)
        }

        if (data.action === 'confirm') {
            await this.confirm(ref, data, blockState, user.userId);
        }

        return {
            action: data.action
        };
    }

    async remoteSetData(user: PolicyUser, data: {
        action: 'confirm' | 'skip'
    }, actionStatus: RecordActionStep) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        ref.log(`setData`);

        if (!data) {
            throw new BlockActionError(`Data is unknown`, ref.blockType, ref.uuid)
        }

        const blockState = this.state[user?.id];
        if (!blockState) {
            throw new BlockActionError(`Document not found`, ref.blockType, ref.uuid)
        }

        ref.triggerEvents(PolicyOutputEventType.Confirm, blockState.user, blockState.data, actionStatus);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, blockState.user, blockState.data, actionStatus);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, blockState.user, {
            userAction: data.action,
            action: ref.options.action
        }));
    }

    /**
     * Set block data
     * @param user
     * @param data
     */
    async setData(
        user: PolicyUser,
        data: {
            action: 'confirm' | 'skip',
            hederaAccountKey: string
        },
        type?: ActionType,
        actionStatus?: RecordActionStep
    ) {
        if (type === ActionType.REMOTE) {
            await this.remoteSetData(user, data, actionStatus);
            return true;
        } else if (type === ActionType.LOCAL) {
            const _data = await this.localSetData(user, data);
            return _data;
        } else {
            const _data = await this.localSetData(user, data);
            await this.remoteSetData(user, _data, actionStatus);
            return true;
        }
    }

    /**
     * Confirm action
     * @param {IPolicyBlock} ref
     * @param {any} data
     * @param {any} state
     * @param userId
     */
    private async confirm(
        ref: IPolicyBlock,
        data: {
            action: 'confirm' | 'skip',
            hederaAccountKey: string
        },
        state: any,
        userId: string | null) {
        const account = {
            id: userId,
            hederaAccountId: state.accountId,
            hederaAccountKey: data.hederaAccountKey
        }

        if (!account.hederaAccountKey) {
            throw new BlockActionError(`Key value is unknown`, ref.blockType, ref.uuid)
        }

        let token: any;
        if (ref.options.useTemplate) {
            if (state.tokenId) {
                token = await ref.databaseServer.getToken(state.tokenId, ref.dryRun);
            }
        } else {
            token = await this.getToken();
        }

        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }

        switch (ref.options.action) {
            case 'associate': {
                await PolicyUtils.associate(ref, token, account, userId);
                break;
            }
            case 'dissociate': {
                await PolicyUtils.dissociate(ref, token, account, userId);
                break;
            }
            default:
                break;
        }
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
        if (event) {
            const documents = event.data?.data;
            const id = event.user?.id;
            const userId = event?.user?.userId;
            const doc = Array.isArray(documents) ? documents[0] : documents;
            let tokenId: string;
            if (ref.options.useTemplate && doc && doc.tokens) {
                tokenId = doc.tokens[ref.options.template];
            }

            let relayerAccount: string = null;
            if (doc && field && doc.accounts) {
                relayerAccount = doc.accounts[field];
            } else if (doc && !field) {
                relayerAccount = await PolicyUtils.getDocumentRelayerAccount(ref, doc, userId);
            }

            this.state[id] = {
                accountId: relayerAccount,
                data: event.data,
                user: event.user,
                tokenId
            };
            await ref.saveState();
        }

        ref.backup();
    }
}
