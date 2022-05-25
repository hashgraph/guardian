import { Inject } from '@helpers/decorators/inject';
import { KeyType, Wallet } from '@helpers/wallet';
import { BlockActionError } from '@policy-engine/errors';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { DidDocumentStatus, TopicType, Schema } from '@guardian/interfaces';
import { IAuthUser } from '@auth/auth.interface';
import { EventBlock } from '../helpers/decorators/event-block';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { StateField } from '@policy-engine/helpers/decorators';
import { DIDDocument, DIDMessage, HederaUtils, MessageAction, MessageServer } from '@hedera-modules';
import { VcHelper } from '@helpers/vcHelper';
import { getMongoRepository } from 'typeorm';
import { Schema as SchemaCollection } from '@entity/schema';
import { DidDocument as DidDocumentCollection } from '@entity/did-document';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { Topic } from '@entity/topic';
import { IPolicyRequestBlock } from '@policy-engine/policy-engine.interface';
import { PolicyUtils } from '@policy-engine/helpers/utils';

@EventBlock({
    blockType: 'requestVcDocumentBlock',
    commonBlock: false,
})
export class RequestVcDocumentBlock {
    @StateField()
    state: { [key: string]: any } = { active: true };

    @Inject()
    private wallet: Wallet;

    private schema: Schema | null;

    constructor() {
    }

    async changeActive(user: IAuthUser, active: boolean) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        let blockState: any;
        if (!this.state.hasOwnProperty(user.did)) {
            blockState = {};
            this.state[user.did] = blockState;
        } else {
            blockState = this.state[user.did];
        }
        blockState.active = active;
        ref.updateBlock(blockState, user);
        ref.callDependencyCallbacks(user);
        ref.callParentContainerCallback(user);
    }

    getActive(user: IAuthUser) {
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
        const options = PolicyComponentsUtils.GetBlockUniqueOptionsObject(this);
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);

        if (!this.schema) {
            const schema = await getMongoRepository(SchemaCollection).findOne({
                iri: ref.options.schema
            });
            this.schema = schema ? new Schema(schema) : null;
        }
        if (!this.schema) {
            throw new BlockActionError('Waiting for schema', ref.blockType, ref.uuid);
        }

        const sources = await ref.getSources(user);

        return {
            id: ref.uuid,
            blockType: ref.blockType,
            schema: this.schema,
            presetSchema: options.presetSchema,
            presetFields: options.presetFields,
            uiMetaData: options.uiMetaData || {},
            hideFields: options.hideFields || [],
            active: this.getActive(user),
            data: sources && sources.length && sources[0] || null
        };
    }

    async setData(user: IAuthUser, _data: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        ref.log(`setData`);

        if (!user.did) {
            throw new BlockActionError('User have no any did', ref.blockType, ref.uuid);
        }

        const active = this.getActive(user);
        if (!active) {
            throw new BlockActionError('Block not available', ref.blockType, ref.uuid);
        }

        try {
            await this.changeActive(user, false);

            const userHederaAccount = user.hederaAccountId;
            const userHederaKey = await this.wallet.getKey(user.walletToken, KeyType.KEY, user.did);

            const document = _data.document;
            const documentRef = _data.ref;

            const credentialSubject = document;
            const schema = ref.options.schema;
            const idType = ref.options.idType;

            const id = await this.generateId(idType, user, userHederaAccount, userHederaKey);
            const VCHelper = new VcHelper();
            if (id) {
                credentialSubject.id = id;
            }

            if (typeof (documentRef) === 'string') {
                credentialSubject.ref = documentRef;
            }
            else if (documentRef) {
                credentialSubject.ref = PolicyUtils.getSubjectId(documentRef);
            }

            credentialSubject.policyId = ref.policyId;

            const res = await VCHelper.verifySubject(credentialSubject);
            if (!res.ok) {
                throw new BlockActionError(JSON.stringify(res.error), ref.blockType, ref.uuid);
            }

            const vc = await VCHelper.createVC(user.did, userHederaKey, credentialSubject);
            const item = {
                hash: vc.toCredentialHash(),
                owner: user.did,
                document: vc.toJsonTree(),
                schema: schema,
                type: schema,
                relationships: null
            };

            if (typeof (documentRef) === 'object' && documentRef && documentRef.messageId) {
                item.relationships = [documentRef.messageId];
            }
            await this.changeActive(user, true);

            await ref.runNext(user, { data: item });
        } catch (error) {
            ref.error(`setData: ${error.message}`);
            await this.changeActive(user, true);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }

        return {};
    }

    async generateId(idType: string, user: any, userHederaAccount: string, userHederaKey: string): Promise<string | undefined> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (idType == 'UUID') {
                return HederaUtils.randomUUID();
            }
            if (idType == 'DID') {
                const ref = PolicyComponentsUtils.GetBlockRef(this);
                const topic = await PolicyUtils.getTopic('root', null, null, ref);

                const didObject = DIDDocument.create(null, topic.topicId);
                const did = didObject.getDid();
                const key = didObject.getPrivateKeyString();
                const document = didObject.getDocument();

                const message = new DIDMessage(MessageAction.CreateDID);
                message.setDocument(didObject);

                const client = new MessageServer(userHederaAccount, userHederaKey);
                const messageResult = await client
                    .setTopicObject(topic)
                    .sendMessage(message);

                const doc = getMongoRepository(DidDocumentCollection).create({
                    did: did,
                    document: document,
                    status: DidDocumentStatus.CREATE,
                    messageId: messageResult.getId(),
                    topicId: messageResult.getTopicId()
                });

                await getMongoRepository(DidDocumentCollection).save(doc);

                await this.wallet.setKey(user.walletToken, KeyType.KEY, did, key);
                return did;
            }
            if (idType == 'OWNER') {
                return user.did;
            }
            return undefined;
        } catch (error) {
            ref.error(`generateId: ${idType} : ${error.message}`);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            // Test schema options
            if (!ref.options.schema) {
                resultsContainer.addBlockError(ref.uuid, 'Option "schema" does not set');
                return;
            }
            if (typeof ref.options.schema !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                return;
            }
            const schema = await getMongoRepository(SchemaCollection).findOne({ iri: ref.options.schema });
            if (!schema) {
                resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                return;
            }
            if (ref.options.presetSchema) {
                const presetSchema = await getMongoRepository(SchemaCollection).findOne({ iri: ref.options.presetSchema });
                if (!presetSchema) {
                    resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.presetSchema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
