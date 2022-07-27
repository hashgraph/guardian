import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IAuthUser } from '@guardian/common';
import { ActionCallback, BasicBlock, StateField } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { IPolicyBlock } from '@policy-engine/policy-engine.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { Token as TokenCollection } from '@entity/token';
import { BlockActionError } from '@policy-engine/errors';

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
            PolicyOutputEventType.RefreshEvent
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
     * Users helper
     * @private
     */
    @Inject()
    private readonly users: Users;

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
    async getData(user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        const blockState = this.state[user?.did] || {};
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
    async setData(user: IAuthUser, data: any) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        ref.log(`setData`);

        if (!data) {
            throw new BlockActionError(`Data is unknown`, ref.blockType, ref.uuid)
        }

        const blockState = this.state[user?.did];
        if (!blockState) {
            throw new BlockActionError(`Document not found`, ref.blockType, ref.uuid)
        }

        if (data.action === 'confirm') {
            await this.confirm(ref, data, blockState);
        } else if (data.action === 'skip') {
            await this.skip(ref, data, blockState);
        } else {
            throw new BlockActionError(`Invalid Action`, ref.blockType, ref.uuid)
        }

        ref.triggerEvents(PolicyOutputEventType.Confirm, blockState.user, blockState.data);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, blockState.user, blockState.data);
    }

    /**
     * Confirm action
     * @param {IPolicyBlock} ref
     * @param {any} data
     * @param {any} state
     */
    private async confirm(ref: IPolicyBlock, data: any, state: any) {
        if (!data.hederaAccountKey) {
            throw new BlockActionError(`Key value is unknown`, ref.blockType, ref.uuid)
        }

        const account = {
            hederaAccountId: state.accountId,
            hederaAccountKey: data.hederaAccountKey
        }

        const token = await this.getToken();

        PolicyUtils.checkAccountId(account);

        switch (ref.options.action) {
            case 'associate': {
                await PolicyUtils.associate(ref, token, account);
                break;
            }
            case 'dissociate': {
                await PolicyUtils.dissociate(ref, token, account);
                break;
            }
            default:
                break;
        }
    }

    /**
     * Skip action
     * @param {IPolicyBlock} ref
     * @param {any} data
     * @param {any} state
     */
    private async skip(ref: IPolicyBlock, data: any, state: any) {
        return;
    }

    /**
     * Run block action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        ref.log(`runAction`);

        const field = ref.options.accountId;
        if (event) {
            const doc = event.data?.data;
            const did = event.user?.did;

            let hederaAccountId: string = null;
            if (doc) {
                if (field) {
                    if (doc.accounts) {
                        hederaAccountId = doc.accounts[field];
                    }
                } else {
                    const account = await this.users.getHederaAccount(doc.owner);
                    if (account) {
                        hederaAccountId = account.hederaAccountId;
                    }
                }
            }
            this.state[did] = {
                accountId: hederaAccountId,
                data: event.data,
                user: event.user
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
            if (!ref.options.tokenId) {
                resultsContainer.addBlockError(ref.uuid, 'Option "tokenId" does not set');
            } else if (typeof ref.options.tokenId !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "tokenId" must be a string');
            } else if (!(await ref.databaseServer.getTokenById(ref.options.tokenId))) {
                resultsContainer.addBlockError(ref.uuid, `Token with id ${ref.options.tokenId} does not exist`);
            }
            if (ref.options.accountType === 'custom' && !ref.options.accountId) {
                resultsContainer.addBlockError(ref.uuid, 'Option "accountId" does not set');
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}