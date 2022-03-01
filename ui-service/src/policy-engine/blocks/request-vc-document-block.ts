import { Inject } from '@helpers/decorators/inject';
import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { VcHelper } from '@helpers/vcHelper';
import { KeyType, Wallet } from '@helpers/wallet';
import { BlockActionError } from '@policy-engine/errors';
import { PolicyComponentsStuff } from '@policy-engine/policy-components-stuff';
import { Schema, SchemaStatus } from 'interfaces';
import { HederaHelper, HederaUtils } from 'vc-modules';
import { IAuthUser } from '@auth/auth.interface';
import { EventBlock } from '../helpers/decorators/event-block';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { StateField } from '@policy-engine/helpers/decorators';

@EventBlock({
    blockType: 'requestVcDocument',
    commonBlock: false,
})
export class RequestVcDocumentBlock {
    @StateField()
    state: { [key: string]: any } = { active: true };

    @Inject()
    private guardians: Guardians;

    @Inject()
    private vcHelper: VcHelper;

    @Inject()
    private wallet: Wallet;

    @Inject()
    private users: Users;

    private schema: Schema | null;

    constructor() {
    }

    async changeActive(user, active) {
        const ref = PolicyComponentsStuff.GetBlockRef(this);
        let blockState;
        if (!this.state.hasOwnProperty(user.did)) {
            blockState = {};
            this.state[user.did] = blockState;
        } else {
            blockState = this.state[user.did];
        }
        blockState.active = active;
        ref.updateBlock(blockState, user);
    }

    getActive(user) {
        let blockState;
        if (!this.state.hasOwnProperty(user.did)) {
            blockState = {};
            this.state[user.did] = blockState;
        } else {
            blockState = this.state[user.did];
        }
        if (blockState.active === undefined) {
            blockState.active = true;
        }
        return blockState.active;
    }

    async getData(user: IAuthUser): Promise<any> {
        const options = PolicyComponentsStuff.GetBlockUniqueOptionsObject(this);
        const ref = PolicyComponentsStuff.GetBlockRef(this);

        if (!this.schema) {
            const schema = await this.guardians.getSchemaByIRI(ref.options.schema);
            this.schema = schema ? new Schema(schema) : null;
        }
        if (!this.schema) {
            throw new BlockActionError('Waiting for schema', ref.blockType, ref.uuid);
        }
        return {
            id: ref.uuid,
            blockType: 'requestVcDocument',
            schema: this.schema,
            uiMetaData: options.uiMetaData || {},
            hideFields: options.hideFields || [],
            active: this.getActive(user)
        };
    }

    async setData(user: IAuthUser, _data: any): Promise<any> {
        const ref = PolicyComponentsStuff.GetBlockRef(this);
        const userFull = await this.users.getUser(user.username);
        if (!userFull.did) {
            throw new BlockActionError('User have no any did', ref.blockType, ref.uuid);
        }

        const active = this.getActive(user);
        if (!active) {
            throw new BlockActionError('Block not available', ref.blockType, ref.uuid);
        }

        try {
            await this.changeActive(user, false);

            const userHederaAccount = userFull.hederaAccountId;
            const userHederaKey = await this.wallet.getKey(userFull.walletToken, KeyType.KEY, userFull.did);

            const document = _data.document;
            const documentRef = _data.ref;
            const credentialSubject = document;
            const schema = ref.options.schema;
            const idType = ref.options.idType;

            const id = await this.generateId(idType, userFull, userHederaAccount, userHederaKey);

            if (id) {
                credentialSubject.id = id;
            }
            if (documentRef) {
                credentialSubject.ref = documentRef;
            }
            credentialSubject.policyId = ref.policyId;
            const res = await this.vcHelper.verifySubject(credentialSubject);
            if (!res.ok) {
                throw new BlockActionError(JSON.stringify(res.error), ref.blockType, ref.uuid);
            }

            const vc = await this.vcHelper.createVC(userFull.did, userHederaKey, credentialSubject);
            const item = {
                hash: vc.toCredentialHash(),
                owner: userFull.did,
                document: vc.toJsonTree(),
                schema: schema,
                type: schema
            };

            await this.changeActive(user, true);

            await ref.runNext(user, { data: item });
        } catch (error) {
            await this.changeActive(user, true);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }

        return {};
    }

    async generateId(idType: string, user: any, userHederaAccount: string, userHederaKey: string): Promise<string | undefined> {
        const ref = PolicyComponentsStuff.GetBlockRef(this);
        try {
            if (idType == 'UUID') {
                return HederaUtils.randomUUID();
            }
            if (idType == 'DID') {
                const ref = PolicyComponentsStuff.GetBlockRef(this);
                const addressBook = await this.guardians.getAddressBook(ref.policyOwner);
                const hederaHelper = HederaHelper
                    .setOperator(userHederaAccount, userHederaKey)
                    .setAddressBook(addressBook.addressBook, addressBook.didTopic, addressBook.vcTopic);

                // did generation
                const newDid = await hederaHelper.DID.createDid();
                const DID = newDid.did;
                const DIDDocument = newDid.document;
                const key = newDid.key;
                const hcsDid = newDid.hcsDid;

                const message = await hederaHelper.DID.createDidTransaction(hcsDid)
                const did = message.getDid();
                const operation = message.getOperation();

                await this.guardians.setDidDocument({ did: DID, document: DIDDocument });
                await this.guardians.setDidDocument({ did, operation });
                await this.wallet.setKey(user.walletToken, KeyType.KEY, DID, key);

                return DID;
            }
            if (idType == 'OWNER') {
                return user.did;
            }
            return undefined;
        } catch (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsStuff.GetBlockRef(this);

        // Test schema options
        if (!ref.options.schema) {
            resultsContainer.addBlockError(ref.uuid, 'Option "schema" does not set');
            return;
        }
        if (typeof ref.options.schema !== 'string') {
            resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
            return;
        }
        const schema = await this.guardians.getSchemaByIRI(ref.options.schema);
        if (!schema) {
            resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
            return;
        }
    }
}
