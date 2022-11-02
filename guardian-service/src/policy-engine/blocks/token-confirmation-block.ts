import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { ActionCallback, BasicBlock, StateField } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { IPolicyBlock, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { Token as TokenCollection } from '@entity/token';
import { BlockActionError } from '@policy-engine/errors';
import { IPolicyUser } from '@policy-engine/policy-user';

/**
 * Information block
 */
@BasicBlock({
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
    }
})
export class TokenConfirmationBlock {
    /**
     * Block state
     * @private
     */
    @StateField()
    private readonly state: { [key: string]: any } = {};

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
            this.token = await ref.databaseServer.getTokenById(ref.options.tokenId);
        }
        return this.token;
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        const blockState = this.state[user?.id] || {};
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
    async setData(user: IPolicyUser, data: any) {
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
    }

    /**
     * Confirm action
     * @param {IPolicyBlock} ref
     * @param {any} data
     * @param {any} state
     */
    private async confirm(ref: IPolicyBlock, data: any, state: any, skip: boolean = false) {
        const account = {
            did: null,
            hederaAccountId: state.accountId,
            hederaAccountKey: data.hederaAccountKey
        }

        let token;
        if (ref.options.useTemplate) {
            if (state.tokenId) {
                token = await ref.databaseServer.getTokenById(state.tokenId, ref.dryRun);
            }
        } else {
            token = await this.getToken();
        }

        if (!token) {
            throw new BlockActionError('Bad token id', ref.blockType, ref.uuid);
        }

        await PolicyUtils.checkAccountId(account);
        const policyOwner = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);
        const hederaAccountInfo = await PolicyUtils.getHederaAccountInfo(ref, account.hederaAccountId, policyOwner);

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

    /**
     * Validate block data
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            const accountType = ['default', 'custom'];
            if (accountType.indexOf(ref.options.accountType) === -1) {
                resultsContainer.addBlockError(ref.uuid, 'Option "accountType" must be one of ' + accountType.join(','));
            }
            const types = ['associate', 'dissociate'];
            if (types.indexOf(ref.options.action) === -1) {
                resultsContainer.addBlockError(ref.uuid, 'Option "action" must be one of ' + types.join(','));
            }
            if (ref.options.useTemplate) {
                if (!ref.options.template) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "template" does not set');
                }
                const policyTokens = ref.policyInstance.policyTokens || [];
                const tokenConfig = policyTokens.find(e => e.templateTokenTag === ref.options.template);
                if (!tokenConfig) {
                    resultsContainer.addBlockError(ref.uuid, `Token "${ref.options.template}" does not exist`);
                }
            } else {
                if (!ref.options.tokenId) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "tokenId" does not set');
                } else if (typeof ref.options.tokenId !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "tokenId" must be a string');
                } else if (!(await ref.databaseServer.getTokenById(ref.options.tokenId))) {
                    resultsContainer.addBlockError(ref.uuid, `Token with id ${ref.options.tokenId} does not exist`);
                }
            }
            if (ref.options.accountType === 'custom' && !ref.options.accountId) {
                resultsContainer.addBlockError(ref.uuid, 'Option "accountId" does not set');
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
