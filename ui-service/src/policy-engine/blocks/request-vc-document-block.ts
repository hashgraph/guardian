import { Inject } from '@helpers/decorators/inject';
import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { VcHelper } from '@helpers/vcHelper';
import { KeyType, Wallet } from '@helpers/wallet';
import { BlockActionError, BlockInitError } from '@policy-engine/errors';
import { BlockStateUpdate } from '@policy-engine/helpers/decorators';
import { PolicyBlockHelpers } from '@policy-engine/helpers/policy-block-helpers';
import { PolicyBlockStateData } from '@policy-engine/interfaces';
import { StateContainer } from '@policy-engine/state-container';
import { Schema } from 'interfaces';
import { HederaHelper, HederaUtils } from 'vc-modules';
import { IAuthUser } from '../../auth/auth.interface';
import { EventBlock } from '../helpers/decorators/event-block';

@EventBlock({
    blockType: 'requestVcDocument',
    commonBlock: false,
})
export class RequestVcDocumentBlock {

    @Inject()
    private guardians: Guardians;

    @Inject()
    private vcHelper: VcHelper;

    @Inject()
    private wallet: Wallet;

    @Inject()
    private users: Users;

    private schema: any;

    private init(): void {
        const { options, blockType, uuid } = PolicyBlockHelpers.GetBlockRef(this);

        if (!options.schema) {
            throw new BlockInitError(`Fileld "schema" is required`, blockType, uuid);
        }
    }

    constructor() {
    }

    async getData(user: IAuthUser): Promise<any> {
        const options = PolicyBlockHelpers.GetBlockUniqueOptionsObject(this);
        if(!this.schema) {
            const schemas = await this.guardians.getSchemes({}) || [];
            this.schema = Schema.mapRef(schemas).find(s => s.uuid === options.schema);
        }
        if (!this.schema) {
            const ref = PolicyBlockHelpers.GetBlockRef(this);
            throw new BlockActionError('Waiting for schema', ref.blockType, ref.uuid);
        }
        return {
            data: this.schema,
            uiMetaData: options.uiMetaData || {},
            hideFields: options.hideFields || []
        };
    }

    @BlockStateUpdate()
    async update(state: PolicyBlockStateData<any>, user: IAuthUser): Promise<any> {
        return state;
    }

    async setData(user: IAuthUser, document: any): Promise<any> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const userFull = await this.users.getUser(user.username);
        if (!userFull.did) {
            throw new BlockActionError('user have no any did', ref.blockType, ref.uuid);
        }

        const userHederaAccount = userFull.hederaAccountId;
        const userHederaKey = await this.wallet.getKey(userFull.walletToken, KeyType.KEY, userFull.did);

        const credentialSubject = document;
        const schema = ref.options.schema;
        const idType = ref.options.idType;
        const id = await this.generateId(idType, userFull, userHederaAccount, userHederaKey);
        if (id) {
            credentialSubject.id = id;
        }
        const vc = await this.vcHelper.createVC(userFull.did, userHederaKey, schema, credentialSubject);
        const data = {
            hash: vc.toCredentialHash(),
            owner: userFull.did,
            document: vc.toJsonTree(),
            type: schema
        };

        await this.update(Object.assign(StateContainer.GetBlockState((this as any).uuid, user), { data }), user);

        if(ref.options.stopPropagation) {
            return {};
        }

        const currentIndex = ref.parent.children.findIndex(el => this === el);
        const nextBlock = ref.parent.children[currentIndex + 1];
        if (nextBlock && nextBlock.runAction) {
            await nextBlock.runAction({ data }, user);
        }

        return {};
    }

    async generateId(idType: string, user: any, userHederaAccount: string, userHederaKey: string): Promise<string | undefined> {
        if (idType == 'UUID') {
            return HederaUtils.randomUUID();
        }
        if (idType == 'DID') {
            const ref = PolicyBlockHelpers.GetBlockRef(this);
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

            await this.guardians.setDidDocument({ did: DID, document: DIDDocument });
            await this.wallet.setKey(user.walletToken, KeyType.KEY, DID, key);

            hederaHelper.DID.createDidTransaction(hcsDid).then((message: any) => {
                const did = message.getDid();
                const operation = message.getOperation();
                this.guardians.setDidDocument({ did, operation });
            });

            return DID;
        }
        if (idType == 'OWNER') {
            return user.did;
        }
        return undefined;
    }
}
