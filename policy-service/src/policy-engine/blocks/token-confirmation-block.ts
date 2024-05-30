import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { ActionCallback, EventBlock, StateField } from '../helpers/decorators/index.js';
import { IPolicyBlock, IPolicyEventState } from '../policy-engine.interface.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { PolicyUtils } from '../helpers/utils.js';
import { Token as TokenCollection } from '@guardian/common';
import { BlockActionError } from '../errors/index.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';

/**
 * Information block
 */
@EventBlock({
    blockType: 'tokenConfirmationBlock',
    commonBlock: false,
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
    private readonly state: {
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
    } = {};

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
    async getData(user: PolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        const blockState: any = this.state[user?.id] || {};
        const token = await this.getToken();
        const block: any = {
            id: ref.uuid,
            blockType: 'tokenConfirmationBlock',
            action: ref.options.action,
            accountId: blockState.accountId,
            tokenName: token.tokenName,
            tokenSymbol: token.tokenSymbol,
            tokenId: token.tokenId
        };
        return block;
    }

    /**
     * Set block data
     * @param user
     * @param data
     */
    async setData(user: PolicyUser, data: any) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        ref.log(`setData`);

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
        await this.confirm(ref, data, blockState, data.action === 'skip');

        ref.triggerEvents(PolicyOutputEventType.Confirm, blockState.user, blockState.data);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, blockState.user, blockState.data);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, blockState.user, {
            userAction: data.action,
            action: ref.options.action
        }));
    }

    /**
     * Confirm action
     * @param {IPolicyBlock} ref
     * @param {any} data
     * @param {any} state
     */
    private async confirm(ref: IPolicyBlock, data: any, state: any, skip: boolean = false) {
        const account = {
            hederaAccountId: state.accountId,
            hederaAccountKey: data.hederaAccountKey
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

        await PolicyUtils.checkAccountId(account);
        const policyOwner = await PolicyUtils.getUserCredentials(ref, ref.policyOwner);
        const hederaCredentials = await policyOwner.loadHederaCredentials(ref);
        const hederaAccountInfo = await PolicyUtils.getHederaAccountInfo(ref, account.hederaAccountId, hederaCredentials);

        if (skip) {
            switch (ref.options.action) {
                case 'associate': {
                    if (!hederaAccountInfo[token.tokenId]) {
                        throw new BlockActionError(`Token is not associated`, ref.blockType, ref.uuid);
                    }
                    break;
                }
                case 'dissociate': {
                    if (hederaAccountInfo[token.tokenId]) {
                        throw new BlockActionError(`Token is not dissociated`, ref.blockType, ref.uuid);
                    }
                    break;
                }
                default:
                    break;
            }
        } else {
            if (!account.hederaAccountKey) {
                throw new BlockActionError(`Key value is unknown`, ref.blockType, ref.uuid)
            }
            switch (ref.options.action) {
                case 'associate': {
                    if (!hederaAccountInfo[token.tokenId]) {
                        await PolicyUtils.associate(ref, token, account);
                    } else {
                        console.warn('Token already associated', ref.policyId);
                    }
                    break;
                }
                case 'dissociate': {
                    if (hederaAccountInfo[token.tokenId]) {
                        await PolicyUtils.dissociate(ref, token, account);
                    } else {
                        console.warn('Token already dissociated', ref.policyId);
                    }
                    break;
                }
                default:
                    break;
            }
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
            const doc = Array.isArray(documents) ? documents[0] : documents;

            let hederaAccountId: string = null;
            let tokenId;
            if (doc) {
                if (field) {
                    if (doc.accounts) {
                        hederaAccountId = doc.accounts[field];
                    }
                } else {
                    hederaAccountId = await PolicyUtils.getHederaAccountId(ref, doc.owner);
                }

                if (ref.options.useTemplate) {
                    if (doc.tokens) {
                        tokenId = doc.tokens[ref.options.template];
                    }
                }
            }
            this.state[id] = {
                accountId: hederaAccountId,
                data: event.data,
                user: event.user,
                tokenId
            };
            await ref.saveState();
        }
    }
}
