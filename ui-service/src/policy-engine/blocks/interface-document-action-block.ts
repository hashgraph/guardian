import {EventBlock} from '@policy-engine/helpers/decorators';
import {IAuthUser} from '../../auth/auth.interface';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {Inject} from '@helpers/decorators/inject';
import {Guardians} from '@helpers/guardians';
import {StateContainer} from '@policy-engine/state-container';
import {getMongoRepository, getRepository} from 'typeorm';
import {Policy} from '@entity/policy';
import {Users} from '@helpers/users';
import {KeyType, Wallet} from '@helpers/wallet';
import {User} from '@entity/user';
import {PolicyValidationResultsContainer} from '@policy-engine/policy-validation-results-container';

/**
 * Document action clock with UI
 */
@EventBlock({
    blockType: 'interfaceAction',
    commonBlock: false,
})
export class InterfaceDocumentActionBlock {

    @Inject()
    private guardians: Guardians;

    @Inject()
    private users: Users;

    @Inject()
    private wallet: Wallet;

    async getData(user: IAuthUser): Promise<any> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        return {
            type: ref.options.type,
            blockType: 'interfaceAction',
            uiMetaData: ref.options.uiMetaData,
            id: ref.uuid
        }
    }

    async setData(user: IAuthUser, document: any): Promise<any> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const uiMetaData = ref.options.uiMetaData;

        let state: any = {data: document};
        if (ref.options.type == 'selector') {
            //?
            const value = document[uiMetaData.field];
            const option = uiMetaData.options.find(e => e.value == value);
            if (option) {
                const block = StateContainer.GetBlockByTag(ref.policyId, option.bindBlock) as any;
                const target = block.parent;
                const index = target.children.findIndex(e => e.uuid == block.uuid);
                state = StateContainer.GetBlockState(target.uuid, user);
                state.index = index;
                state.data = document;
                const owner = await getRepository(User).findOne({did: document.owner});
                if (block.runAction) {
                    await block.runAction(state, owner);
                } else {
                    await StateContainer.SetBlockState(target.uuid, state, owner, null);
                }
            } else {
                return;
            }
        }

        if (ref.options.type == 'download') {
            const sensorDid = document.document.credentialSubject[0].id;
            const policy = await getMongoRepository(Policy).findOne(ref.policyId);
            const userFull = await this.users.getUserById(document.owner);
            const hederaAccountId = userFull.hederaAccountId;
            const userDID = userFull.did;
            const hederaAccountKey = await this.wallet.getKey(userFull.walletToken, KeyType.KEY, userDID);
            const sensorKey = await this.wallet.getKey(userFull.walletToken, KeyType.KEY, sensorDid);
            return {
                fileName: ref.options.filename || `${sensorDid}.config.json`,
                body: {
                    'url': ref.options.targetUrl || process.env.MRV_ADDRESS,
                    'topic': policy.topicId,
                    'hederaAccountId': hederaAccountId,
                    'hederaAccountKey': hederaAccountKey,
                    'installer': userDID,
                    'did': sensorDid,
                    'key': sensorKey,
                    'type': ref.options.schema,
                    'schema': await this.guardians.loadSchemaDocument(ref.options.schema),
                    'policyId': ref.policyId,
                    'policyTag': policy.policyTag
                }
            }
        }

        const currentIndex = ref.parent.children.findIndex(el => this === el);
        const nextBlock = ref.parent.children[currentIndex + 1];
        if (nextBlock && nextBlock.runAction) {
            await nextBlock.runAction(state, user);
        }
        // await StateContainer.SetBlockState(ref.uuid, document, owner, null);
        // block.updateBlock(state, owner, null);
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);

        if (!ref.options.type) {
            resultsContainer.addBlockError(ref.uuid, 'Option "type" does not set');
        } else {
            switch (ref.options.type) {
                case 'selector':
                    if (!ref.options.uiMetaData || (typeof ref.options.uiMetaData !== 'object')) {
                        resultsContainer.addBlockError(ref.uuid, 'Option "uiMetaData" does not set');
                    } else {
                        if (!ref.options.uiMetaData.field) {
                            resultsContainer.addBlockError(ref.uuid, 'Option "uiMetaData.field" does not set');
                        }
                        if (!ref.options.uiMetaData.options) {
                            resultsContainer.addBlockError(ref.uuid, 'Option "uiMetaData.options" does not set');
                        }
                        if (Array.isArray(ref.options.uiMetaData.options)) {
                            for (let tag of ref.options.uiMetaData.options.map(i => i.bindBlock)) {
                                if (!resultsContainer.isTagExist(tag)) {
                                    resultsContainer.addBlockError(ref.uuid, `Tag "${tag}" does not exist`);
                                }
                            }
                        } else {
                            resultsContainer.addBlockError(ref.uuid, 'Option "uiMetaData.options" must be an array');
                        }
                    }
                    break;

                case 'download':
                    // if (!ref.options.filename) {
                    //     resultsContainer.addBlockError(ref.uuid, 'Option "filename" does not set');
                    // }

                    if (!ref.options.targetUrl) {
                        resultsContainer.addBlockError(ref.uuid, 'Option "targetUrl" does not set');
                    }

                    const schemas = await this.guardians.getSchemes({}) || [];
                    if (!ref.options.schema) {
                        resultsContainer.addBlockError(ref.uuid, 'Option "schema" does not set');
                    } else if (typeof ref.options.schema !== 'string') {
                        resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                    } else if (!schemas.find(s => s.uuid === ref.options.schema)) {
                        resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`)
                    }
                    break;

                default:
                    resultsContainer.addBlockError(ref.uuid, 'Option "type" must be a "selector" or "download"');
            }
        }
    }
}
