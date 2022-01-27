import { EventBlock } from '@policy-engine/helpers/decorators';
import { IAuthUser } from '../../auth/auth.interface';
import { PolicyBlockHelpers } from '@policy-engine/helpers/policy-block-helpers';
import { Inject } from '@helpers/decorators/inject';
import { Guardians } from '@helpers/guardians';
import { StateContainer } from '@policy-engine/state-container';
import { getMongoRepository, getRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { Users } from '@helpers/users';
import { KeyType, Wallet } from '@helpers/wallet';
import { User } from '@entity/user';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { BlockActionError, BlockInitError } from '@policy-engine/errors';
import {Schema, SchemaStatus} from 'interfaces';
import { findOptions } from '@policy-engine/helpers/find-options';

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

    private async getSources(...args): Promise<any[]> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        let data = [];
        for (let child of ref.children) {
            if (child.blockClassName === 'SourceAddon') {
                data = data.concat(await child.getFromSource(...args))
            }
        }
        return data;
    }

    async getData(user: IAuthUser): Promise<any> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const userFull = await this.users.getUser(user.username);

        const data: any = {
            id: ref.uuid,
            blockType: 'interfaceAction',
            type: ref.options.type,
            uiMetaData: ref.options.uiMetaData
        }

        if (ref.options.type == 'selector') {
            data.field = ref.options.field;
        }

        if (ref.options.type == 'dropdown') {
            let documents: any[] = await this.getSources(userFull);
            data.name = ref.options.name;
            data.value = ref.options.value;
            data.field = ref.options.field;
            data.options = documents.map((e) => {
                return {
                    name: findOptions(e, ref.options.name),
                    value: findOptions(e, ref.options.value),
                }
            });
        }
        return data;
    }

    async setData(user: IAuthUser, document: any): Promise<any> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);

        let state: any = { data: document };

        if (ref.options.type == 'selector') {
            const option = this.findOptions(document, ref.options.field, ref.options.uiMetaData.options);
            if (option) {
                const block = StateContainer.GetBlockByTag(ref.policyId, option.bindBlock) as any;
                const target = block.parent;
                const index = target.children.findIndex(e => e.uuid == block.uuid);
                // state = StateContainer.GetBlockState(target.uuid, user);
                // state.index = index;
                // state.data = document;
                const owner = await getRepository(User).findOne({ did: document.owner });
                if (block.runAction) {
                    await block.runAction(state, owner);
                } else {
                    if(user) {
                        await ref.parent.changeStep(user, ref);
                    }
                    // await StateContainer.SetBlockState(target.uuid, state, owner, null);
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
            const { type } = Schema.parsRef(ref.options.schema);
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
                    'type': type,
                    'schema': await this.guardians.loadSchemaDocument(ref.options.schema),
                    'policyId': ref.policyId,
                    'policyTag': policy.policyTag
                }
            }
        }

        if (ref.options.type == 'dropdown') {
            if (ref.options.bindBlock) {
                const block = StateContainer.GetBlockByTag(ref.policyId, ref.options.bindBlock) as any;
                const parent = block.parent;
                const index = parent.children.findIndex(e => e.uuid == block.uuid);
                // state = StateContainer.GetBlockState(parent.uuid, user);
                // state.index = index;
                // state.data = document;
                const owner = await getRepository(User).findOne({ did: document.owner });
                console.log(parent.uuid, block.uuid);
                if (block.runAction) {
                    await block.runAction(state, owner);
                } else {
                    if(user) {
                        await ref.parent.changeStep(user, ref);
                    }
                    // await StateContainer.SetBlockState(parent.uuid, state, owner, null);
                }
                return;
            }
        }

        if(user) {
            await ref.parent.changeStep(user, ref);
        }
        const currentIndex = ref.parent.children.findIndex(el => this === el);
        const nextBlock = ref.parent.children[currentIndex + 1];
        if (nextBlock && nextBlock.runAction) {
            await nextBlock.runAction(state, user);
        }
        // await StateContainer.SetBlockState(ref.uuid, document, owner, null);
        // block.updateBlock(state, owner, null);
    }

    private findOptions(document: any, field: any, options: any[]) {
        let value: any = null;
        if (document && field) {
            const keys = field.split('.');
            value = document;
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                value = value[key];
            }
        }
        return options.find(e => e.value == value);
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
                        if (!ref.options.field) {
                            resultsContainer.addBlockError(ref.uuid, 'Option "field" does not set');
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

                    const schemas = await this.guardians.getSchemes() || [];
                    if (!ref.options.schema) {
                        resultsContainer.addBlockError(ref.uuid, 'Option "schema" does not set');
                        break;
                    }
                    if (typeof ref.options.schema !== 'string') {
                        resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                        break;
                    }
                    const schema = schemas.find(s => s.iri === ref.options.schema)
                    if (!schema) {
                        resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                        break;
                    }
                    if (schema.status != SchemaStatus.PUBLISHED) {
                        resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not published`);
                        break;
                    }
                    break;

                case 'dropdown':
                    if (!ref.options.name) {
                        resultsContainer.addBlockError(ref.uuid, 'Option "name" does not set');
                        break;
                    }
                    if (!ref.options.value) {
                        resultsContainer.addBlockError(ref.uuid, 'Option "value" does not set');
                        break;
                    }
                    break;

                default:
                    resultsContainer.addBlockError(ref.uuid, 'Option "type" must be a "selector|download|dropdown"');
            }
        }
    }
}
