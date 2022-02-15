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

    private schema: Schema | null;

    constructor() {
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
            hideFields: options.hideFields || []
        };
    }

    // @BlockStateUpdate()
    // async update(state: PolicyBlockStateData<any>, user: IAuthUser): Promise<any> {
    //     return state;
    // }

    async setData(user: IAuthUser, _data: any): Promise<any> {
        const ref = PolicyComponentsStuff.GetBlockRef(this);
        const userFull = await this.users.getUser(user.username);
        if (!userFull.did) {
            throw new BlockActionError('User have no any did', ref.blockType, ref.uuid);
        }

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

        await ref.runNext(user, { data: item });

        return {};
    }

    async generateId(idType: string, user: any, userHederaAccount: string, userHederaKey: string): Promise<string | undefined> {
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
