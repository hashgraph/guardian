import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IAuthUser } from '@guardian/common';
import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { IPolicyBlock } from '@policy-engine/policy-engine.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { IHederaAccount, PolicyUtils } from '@policy-engine/helpers/utils';
import { getMongoRepository } from 'typeorm';
import { Token as TokenCollection } from '@entity/token';

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
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: true
    }
})
export class TokenActionBlock {
    /**
     * Users helper
     * @private
     */
    @Inject()
    private readonly users: Users;

    /**
     * Get block data
     * @param user
     */
    async getData(user: IAuthUser): Promise<any> {
        const { options } = PolicyComponentsUtils.GetBlockRef(this);
        return { uiMetaData: options.uiMetaData };
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

        const token = await getMongoRepository(TokenCollection).findOne({ tokenId: ref.options.tokenId });
        const field = ref.options.accountId;
        const doc = event?.data?.data;

        let account: IHederaAccount = null;
        if (doc) {
            if (field) {
                if (doc.accounts) {
                    account = {
                        hederaAccountId: doc.accounts[field],
                        hederaAccountKey: null
                    }
                }
            } else {
                account = await this.users.getHederaAccount(doc.owner);
            }
        }

        PolicyUtils.checkAccountId(account);

        switch (ref.options.action) {
            case 'associate': {
                await PolicyUtils.associate(token, account);
                break;
            }
            case 'dissociate': {
                await PolicyUtils.associate(token, account);
                break;
            }
            case 'freeze': {
                const root = await this.users.getHederaAccount(ref.policyOwner);
                await PolicyUtils.freeze(token, account, root);
                break;
            }
            case 'unfreeze': {
                const root = await this.users.getHederaAccount(ref.policyOwner);
                await PolicyUtils.unfreeze(token, account, root);
                break;
            }
            case 'grantKyc': {
                const root = await this.users.getHederaAccount(ref.policyOwner);
                await PolicyUtils.grantKyc(token, account, root);
                break;
            }
            case 'revokeKyc': {
                const root = await this.users.getHederaAccount(ref.policyOwner);
                await PolicyUtils.revokeKyc(token, account, root);
                break;
            }
            default:
                break;
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
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
            const types = ref.options.accountType === 'default' ? [
                'associate',
                'dissociate',
                'freeze',
                'unfreeze',
                'grantKyc',
                'revokeKyc',
            ] : [
                'freeze',
                'unfreeze',
                'grantKyc',
                'revokeKyc',
            ];
            if (types.indexOf(ref.options.action) === -1) {
                resultsContainer.addBlockError(ref.uuid, 'Option "action" must be one of ' + types.join(','));
            }
            if (!ref.options.tokenId) {
                resultsContainer.addBlockError(ref.uuid, 'Option "tokenId" does not set');
            } else if (typeof ref.options.tokenId !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "tokenId" must be a string');
            } else if (!(await getMongoRepository(TokenCollection).findOne({ tokenId: ref.options.tokenId }))) {
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