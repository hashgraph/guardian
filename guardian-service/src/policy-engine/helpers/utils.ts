import { Token } from '@entity/token';
import { Topic } from '@entity/topic';
import { VcDocument, VcDocument as HVcDocument, TopicHelper, VpDocument } from '@hedera-modules';
import * as mathjs from 'mathjs';
import { AnyBlockType, IPolicyDocument } from '@policy-engine/policy-engine.interface';
import {
    DidDocumentStatus,
    DocumentSignature,
    DocumentStatus,
    ExternalMessageEvents,
    IRootConfig,
    Schema,
    SchemaEntity,
    TopicType,
    WorkerTaskType
} from '@guardian/interfaces';
import { ExternalEventChannel, IAuthUser } from '@guardian/common';
import { Schema as SchemaCollection } from '@entity/schema';
import { TopicId } from '@hashgraph/sdk';
import { IPolicyUser, PolicyUser } from '@policy-engine/policy-user';
import { KeyType, Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { Workers } from '@helpers/workers';

/**
 * Data types
 */
export enum DataTypes {
    MRV = 'mrv',
    REPORT = 'report',
    MINT = 'mint',
    RETIREMENT = 'retirement',
    USER_ROLE = 'user-role',
    MULTI_SIGN = 'MULTI_SIGN'
}

/**
 * Hedera Account interface
 */
export interface IHederaAccount {
    /**
     * Account id
     */
    hederaAccountId: string;
    /**
     * Account key
     */
    hederaAccountKey: string;
    /**
     * Account did
     */
    did: string;
}

/**
 * Policy engine utils
 */
export class PolicyUtils {
    /**
     * User service
     */
    private static readonly users = new Users();
    /**
     * Wallet service
     */
    private static readonly wallet = new Wallet();

    /**
     * Variables
     * @param formula
     */
    public static variables(formula: string): string[] {
        const variables = [];
        try {
            mathjs.parse(formula).traverse((node: any) => {
                if (node.isSymbolNode && !mathjs[node.name]) {
                    variables.push(node.name);
                }
            });
            return variables;
        } catch (error) {
            return variables;
        }
    }

    /**
     * Evaluate
     * @param formula
     * @param scope
     */
    public static evaluateFormula(formula: string, scope: any) {
        // tslint:disable-next-line:only-arrow-functions
        return (function (math: any, _formula: string, _scope: any) {
            try {
                return math.evaluate(_formula, _scope);
            } catch (error) {
                return 'Incorrect formula';
            }
        }).call(null, mathjs, formula, scope);
    }

    /**
     * Get VC scope
     * @param item
     */
    public static getVCScope(item: VcDocument) {
        return item.getCredentialSubject(0).getFields();
    }

    /**
     * Aggregate
     * @param rule
     * @param vcs
     */
    public static aggregate(rule: string, vcs: VcDocument[]): number {
        let amount = 0;
        for (const element of vcs) {
            const scope = PolicyUtils.getVCScope(element);
            const value = parseFloat(PolicyUtils.evaluateFormula(rule, scope));
            amount += value;
        }
        return amount;
    }

    /**
     * Token amount
     * @param token
     * @param amount
     */
    public static tokenAmount(token: Token, amount: number): [number, string] {
        const decimals = parseFloat(token.decimals) || 0;
        const _decimals = Math.pow(10, decimals);
        const tokenValue = Math.round(amount * _decimals);
        const tokenAmount = (tokenValue / _decimals).toFixed(decimals);
        return [tokenValue, tokenAmount];
    }

    /**
     * Split chunk
     * @param array
     * @param chunk
     */
    public static splitChunk<T>(array: T[], chunk: number): T[][] {
        const res: T[][] = [];
        let i: number;
        let j: number;
        for (i = 0, j = array.length; i < j; i += chunk) {
            res.push(array.slice(i, i + chunk));
        }
        return res;
    }

    /**
     * Get Object Value
     * @param data
     * @param field
     */
    public static getObjectValue<T>(data: any, field: string): T {
        if (field) {
            const keys = field.split('.');
            let result = data;
            for (const key of keys) {
                if (!result) {
                    return null;
                }
                result = result[key];
            }
            return result;
        }
        return null;
    }

    /**
     * Get array
     * @param data
     */
    public static getArray<T>(data: T | T[]): T[] {
        if (Array.isArray(data)) {
            return data as T[];
        } else {
            return [data];
        }
    }

    /**
     * Get Hedera Accounts
     * @param vc
     * @param defaultAccount
     * @param schema
     */
    public static getHederaAccounts(vc: HVcDocument, defaultAccount: string, schema: Schema): any {
        const result: any = {};
        if (schema) {
            const fields = schema.searchFields((f) => f.customType === 'hederaAccount');
            for (const field of fields) {
                result[field.path] = vc.getField(field.path);
            }
        }
        result.default = defaultAccount;
        return result;
    }

    /**
     * Mint
     * @param ref
     * @param token
     * @param tokenValue
     * @param root
     * @param targetAccount
     * @param uuid
     */
    public static async mint(
        ref: AnyBlockType,
        token: Token,
        tokenValue: number,
        root: IRootConfig,
        targetAccount: string,
        uuid: string,
        transactionMemo: string
    ): Promise<void> {
        const mintId = Date.now();
        ref.log(`Mint(${mintId}): Start (Count: ${tokenValue})`);

        const workers = new Workers();
        await workers.addTask({
            type: WorkerTaskType.MINT_TOKEN,
            data: {
                hederaAccountId: root.hederaAccountId,
                hederaAccountKey: root.hederaAccountKey,
                token,
                dryRun: ref.dryRun,
                tokenValue,
                transactionMemo,
                uuid,
                targetAccount, mintId
            }
        }, 1);

        new ExternalEventChannel().publishMessage(ExternalMessageEvents.TOKEN_MINTED, { tokenId: token.tokenId, tokenValue, memo: transactionMemo });

        ref.log(`Mint(${mintId}): End`);
    }

    /**
     * Wipe
     * @param token
     * @param tokenValue
     * @param root
     * @param targetAccount
     * @param uuid
     */
    public static async wipe(
        ref: AnyBlockType,
        token: Token,
        tokenValue: number,
        root: IRootConfig,
        targetAccount: string,
        uuid: string
    ): Promise<void> {
        const workers = new Workers();
        await workers.addTask({
            type: WorkerTaskType.WIPE_TOKEN,
            data: {
                hederaAccountId: root.hederaAccountId,
                hederaAccountKey: root.hederaAccountKey,
                dryRun: ref.dryRun,
                token,
                targetAccount,
                tokenValue,
                uuid
            }
        }, 1);
    }

    /**
     * Get subject id
     * @param data
     */
    public static getSubjectId(data: any): string {
        try {
            if (data && data.document) {
                if (Array.isArray(data.document.credentialSubject)) {
                    return data.document.credentialSubject[0].id;
                } else {
                    return data.document.credentialSubject.id;
                }
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    /**
     * Get Document Type
     * @param document
     */
    public static getDocumentType(document: any): string {
        if (document && document.document && document.document.type) {
            const type = document.document.type;
            if (Array.isArray(type)) {
                if (type.indexOf('VerifiableCredential') > -1) {
                    return 'VerifiableCredential';
                }
                if (type.indexOf('VerifiablePresentation') > -1) {
                    return 'VerifiablePresentation';
                }
            } else {
                if (type === 'VerifiableCredential') {
                    return 'VerifiableCredential';
                }
                if (type === 'VerifiablePresentation') {
                    return 'VerifiablePresentation';
                }
            }
        }
        return null;
    }

    /**
     * Check Document Schema
     * @param document
     * @param schema
     */
    public static checkDocumentSchema(document: any, schema: SchemaCollection): boolean {
        const iri = schema.iri ? schema.iri.slice(1) : null;
        const context = schema.contextURL;
        if (document && document.document) {
            if (Array.isArray(document.document.credentialSubject)) {
                return (
                    document.document.credentialSubject[0]['@context'].indexOf(context) > -1 &&
                    document.document.credentialSubject[0].type === iri
                );
            } else {
                return (
                    document.document.credentialSubject['@context'].indexOf(context) > -1 &&
                    document.document.credentialSubject.type === iri
                );
            }
        }
        return true;
    }

    /**
     * Check Document Field
     * @param document
     * @param filter
     */
    public static checkDocumentField(document: any, filter: any): boolean {
        if (document) {
            const value = PolicyUtils.getObjectValue(document, filter.field);
            switch (filter.type) {
                case 'equal':
                    return filter.value === value;
                case 'not_equal':
                    return filter.value !== value;
                case 'in':
                    if (Array.isArray(value)) {
                        return value.indexOf(filter.value) > -1;
                    }
                    return false;
                case 'not_in':
                    if (Array.isArray(value)) {
                        return value.indexOf(filter.value) === -1;
                    }
                    return false;
                default:
                    return false;
            }
        }
        return false;
    }

    /**
     * Check Document Ref
     * @param document
     */
    public static getDocumentRef(document: IPolicyDocument) {
        let item: any = null;
        if (document && document.document) {
            if (document.document.credentialSubject) {
                const credentialSubject = document.document.credentialSubject;
                if (Array.isArray(credentialSubject)) {
                    item = credentialSubject[0];
                } else {
                    item = credentialSubject;
                }
            } else if (document.document.verifiableCredential) {
                let vc: any = null;
                const verifiableCredential = document.document.verifiableCredential;
                if (Array.isArray(verifiableCredential)) {
                    vc = verifiableCredential[0];
                } else {
                    vc = verifiableCredential;
                }
                const credentialSubject = vc.credentialSubject;
                if (Array.isArray(credentialSubject)) {
                    item = credentialSubject[0];
                } else {
                    item = credentialSubject;
                }
            }
        }
        if (item) {
            return item.ref;
        } else {
            return null;
        }
    }

    /**
     * associate
     * @param token
     * @param user
     */
    public static async associate(ref: AnyBlockType, token: Token, user: IHederaAccount): Promise<boolean> {
        const workers = new Workers();
        return await workers.addTask({
            type: WorkerTaskType.ASSOCIATE_TOKEN,
            data: {
                tokenId: token.tokenId,
                userID: user.hederaAccountId,
                userKey: user.hederaAccountKey,
                associate: true,
                dryRun: ref.dryRun
            }
        }, 1);
    }

    /**
     * dissociate
     * @param token
     * @param user
     */
    public static async dissociate(ref: AnyBlockType, token: Token, user: IHederaAccount): Promise<boolean> {
        const workers = new Workers();
        return await workers.addTask({
            type: WorkerTaskType.ASSOCIATE_TOKEN,
            data: {
                tokenId: token.tokenId,
                userID: user.hederaAccountId,
                userKey: user.hederaAccountKey,
                associate: false,
                dryRun: ref.dryRun
            }
        }, 1);
    }

    /**
     * freeze
     * @param token
     * @param user
     * @param root
     */
    public static async freeze(
        ref: AnyBlockType,
        token: Token,
        user: IHederaAccount,
        root: IHederaAccount
    ): Promise<boolean> {
        const workers = new Workers();
        return await workers.addTask({
            type: WorkerTaskType.FREEZE_TOKEN,
            data: {
                hederaAccountId: root.hederaAccountId,
                hederaAccountKey: root.hederaAccountKey,
                freezeKey: token.freezeKey,
                tokenId: token.tokenId,
                freeze: true,
                dryRun: ref.dryRun
            }
        }, 1);
    }

    /**
     * unfreeze
     * @param token
     * @param user
     * @param root
     */
    public static async unfreeze(
        ref: AnyBlockType,
        token: Token,
        user: IHederaAccount,
        root: IHederaAccount
    ): Promise<boolean> {
        const workers = new Workers();
        return await workers.addTask({
            type: WorkerTaskType.FREEZE_TOKEN,
            data: {
                hederaAccountId: root.hederaAccountId,
                hederaAccountKey: root.hederaAccountKey,
                freezeKey: token.freezeKey,
                tokenId: token.tokenId,
                freeze: false,
                dryRun: ref.dryRun
            }
        }, 1);
    }

    /**
     * grantKyc
     * @param token
     * @param user
     * @param root
     */
    public static async grantKyc(
        ref: AnyBlockType,
        token: Token,
        user: IHederaAccount,
        root: IHederaAccount
    ): Promise<boolean> {
        const workers = new Workers();
        return await workers.addTask({
            type: WorkerTaskType.GRANT_KYC_TOKEN,
            data: {
                hederaAccountId: root.hederaAccountId,
                hederaAccountKey: root.hederaAccountKey,
                userHederaAccountId: user.hederaAccountId,
                tokenId: token.tokenId,
                kycKey: token.kycKey,
                grant: true,
                dryRun: ref.dryRun
            }
        }, 1);
    }

    /**
     * revokeKyc
     * @param token
     * @param user
     * @param root
     */
    public static async revokeKyc(
        ref: AnyBlockType,
        token: Token,
        user: IHederaAccount,
        root: IHederaAccount
    ): Promise<boolean> {
        const workers = new Workers();
        return await workers.addTask({
            type: WorkerTaskType.GRANT_KYC_TOKEN,
            data: {
                hederaAccountId: root.hederaAccountId,
                hederaAccountKey: root.hederaAccountKey,
                userHederaAccountId: user.hederaAccountId,
                tokenId: token.tokenId,
                kycKey: token.kycKey,
                grant: false,
                dryRun: ref.dryRun
            }
        }, 1);
    }

    /**
     * revokeKyc
     * @param account
     */
    public static async checkAccountId(account: IHederaAccount): Promise<void> {
        const workers = new Workers();
        return await workers.addTask({
            type: WorkerTaskType.CHECK_ACCOUNT,
            data: {
                hederaAccountId: account.hederaAccountId,
            }
        }, 1);
    }

    /**
     * Get topic
     * @param ref
     * @param topicName
     * @param root
     * @param user
     */
    public static async getOrCreateTopic(
        ref: AnyBlockType,
        topicName: string,
        root: IRootConfig,
        user: any,
        memoObj?: any
    ): Promise<Topic> {
        const rootTopic = await ref.databaseServer.getTopic({
            policyId: ref.policyId,
            type: TopicType.InstancePolicyTopic
        });

        if (!topicName) {
            return rootTopic;
        }

        if (topicName === 'root') {
            return rootTopic;
        }

        let topic: Topic;

        const policyTopics = ref.policyInstance.policyTopics || [];
        const config = policyTopics.find(e => e.name === topicName);
        if (!config) {
            throw new Error(`Topic "${topicName}" does not exist`);
        }

        const topicOwner = config.static ? root.did : user.did;
        topic = await ref.databaseServer.getTopic({
            policyId: ref.policyId,
            type: TopicType.DynamicTopic,
            name: topicName,
            owner: topicOwner
        });

        if (!topic) {
            const topicAccountId = config.static ? root.hederaAccountId : user.hederaAccountId;
            const topicAccountKey = config.static ? root.hederaAccountKey : user.hederaAccountKey;
            const topicHelper = new TopicHelper(topicAccountId, topicAccountKey, ref.dryRun);
            topic = await topicHelper.create({
                type: TopicType.DynamicTopic,
                owner: topicOwner,
                name: config.name,
                description: config.description,
                policyId: ref.policyId,
                policyUUID: null,
                memo: config.memo,
                memoObj: config.memoObj === 'doc'
                    ? memoObj
                    : config
            });
            await topicHelper.twoWayLink(topic, rootTopic, null);
            topic = await ref.databaseServer.saveTopic(topic);
        }

        return topic;
    }

    /**
     * Get topic
     * @param ref
     * @param topicId
     */
    public static async getTopicById(
        ref: AnyBlockType,
        topicId: string | TopicId
    ): Promise<Topic> {
        let topic: Topic;
        if (topicId) {
            topic = await ref.databaseServer.getTopic({ policyId: ref.policyId, topicId: topicId.toString() });
        }
        if (!topic) {
            topic = await ref.databaseServer.getTopic({ policyId: ref.policyId, type: TopicType.InstancePolicyTopic });
        }
        if (!topic) {
            throw new Error(`Topic does not exist`);
        }
        return topic;
    }

    /**
     * Get Policy User
     * @param ref
     * @param did
     */
    public static getPolicyUser(ref: AnyBlockType, did: string, uuid: string): IPolicyUser {
        const user = new PolicyUser(did, !!ref.dryRun);
        return user.setGroup({ role: null, uuid });
    }

    /**
     * Get Policy User
     * @param ref
     * @param document
     */
    public static getDocumentOwner(ref: AnyBlockType, document: IPolicyDocument): IPolicyUser {
        const user = new PolicyUser(document.owner, !!ref.dryRun);
        return user.setGroup({ role: null, uuid: document.group });
    }

    /**
     * Get Scope Id
     * @param document
     */
    public static getScopeId(document: IPolicyDocument): string {
        if (document.group) {
            return `${document.group}:${document.owner}`;
        } else {
            return document.owner;
        }
    }

    /**
     * Get User
     * @param ref
     * @param did
     */
    public static async getUser(ref: AnyBlockType, did: string): Promise<IAuthUser> {
        if (ref.dryRun) {
            return await ref.databaseServer.getVirtualUser(did);
        } else {
            return await PolicyUtils.users.getUserById(did);
        }
    }

    /**
     * Get Hedera Account Id
     * @param ref
     * @param did
     */
    public static async getHederaAccountId(ref: AnyBlockType, did: string): Promise<string> {
        if (ref.dryRun) {
            const userFull = await ref.databaseServer.getVirtualUser(did);
            return userFull.hederaAccountId;
        } else {
            const userFull = await PolicyUtils.users.getUserById(did);
            if (!userFull) {
                throw new Error('User not found');
            }
            return userFull.hederaAccountId;
        }
    }

    /**
     * Get Hedera Account and Private Key
     * @param ref
     * @param did
     */
    public static async getHederaAccount(ref: AnyBlockType, did: string): Promise<IHederaAccount> {
        if (ref.dryRun) {
            const userFull = await ref.databaseServer.getVirtualUser(did);
            if (!userFull) {
                throw new Error('Virtual User not found');
            }
            const userID = userFull.hederaAccountId;
            const userDID = userFull.did;
            if (!userDID || !userID) {
                throw new Error('Hedera Account not found');
            }
            const userKey = await ref.databaseServer.getVirtualKey(did, did);
            return {
                did,
                hederaAccountId: userID,
                hederaAccountKey: userKey
            }
        } else {
            const userFull = await PolicyUtils.users.getUserById(did);
            if (!userFull) {
                throw new Error('User not found');
            }
            const userID = userFull.hederaAccountId;
            const userDID = userFull.did;
            if (!userDID || !userID) {
                throw new Error('Hedera Account not found');
            }
            const userKey = await PolicyUtils.wallet.getKey(userFull.walletToken, KeyType.KEY, userDID);
            return {
                did,
                hederaAccountId: userID,
                hederaAccountKey: userKey
            }
        }
    }

    /**
     * Get Private Key
     * @param ref
     * @param userDid
     * @param type
     * @param keyName
     */
    public static async getAccountKey(ref: AnyBlockType, userDid: string, type: KeyType, keyName: string): Promise<string> {
        if (ref.dryRun) {
            const userFull = await ref.databaseServer.getVirtualUser(userDid);
            if (!userFull) {
                throw new Error('User not found');
            }
            return await ref.databaseServer.getVirtualKey(userDid, keyName);
        } else {
            const userFull = await PolicyUtils.users.getUserById(userDid);
            if (!userFull) {
                throw new Error('User not found');
            }
            return await PolicyUtils.wallet.getKey(userFull.walletToken, type, keyName);
        }
    }

    /**
     * Save Private Key
     * @param ref
     * @param userDid
     * @param type
     * @param keyName
     */
    public static async setAccountKey(ref: AnyBlockType, userDid: string, type: KeyType, keyName: string, key: string): Promise<void> {
        if (ref.dryRun) {
            await ref.databaseServer.setVirtualKey(userDid, keyName, key);
        } else {
            const userFull = await PolicyUtils.users.getUserById(userDid);
            if (!userFull) {
                throw new Error('User not found');
            }
            await PolicyUtils.wallet.setKey(userFull.walletToken, type, keyName, key);
        }
    }

    /**
     * Get all standard registry accounts
     */
    public static async getAllStandardRegistryAccounts(ref: AnyBlockType, countResult: boolean): Promise<any[] | number> {
        if (ref.dryRun) {
            return (countResult) ? 0 : [];
        } else {
            if (countResult) {
                return (await PolicyUtils.users.getAllStandardRegistryAccounts()).length;
            }
            return await PolicyUtils.users.getAllStandardRegistryAccounts() as any;
        }
    }

    /**
     * Get Relationships
     * @param policyId
     * @param refId
     */
    public static async getRelationships(
        ref: AnyBlockType,
        policyId: string,
        refId: any
    ): Promise<VcDocumentCollection> {
        if (refId) {
            let documentRef: any = null;
            if (typeof (refId) === 'string') {
                documentRef = await ref.databaseServer.getVcDocument({
                    where: {
                        'policyId': { $eq: policyId },
                        'document.credentialSubject.id': { $eq: refId }
                    }
                });
            } else if (typeof (refId) === 'object') {
                const objectId = refId.id || refId._id;
                if (objectId) {
                    documentRef = await ref.databaseServer.getVcDocument(objectId);
                    if (documentRef && documentRef.policyId !== policyId) {
                        documentRef = null;
                    }
                } else {
                    const id = PolicyUtils.getSubjectId(refId);
                    documentRef = await ref.databaseServer.getVcDocument({
                        where: {
                            'policyId': { $eq: policyId },
                            'document.credentialSubject.id': { $eq: id }
                        }
                    });
                }
            }
            if (!documentRef) {
                throw new Error('Invalid relationships');
            }
            return documentRef;
        } else {
            return null;
        }
    }

    /**
     * Get error message
     * @param error
     */
    public static getErrorMessage(error: string | Error | any): string {
        if (typeof error === 'string') {
            return error;
        } else if (error.message) {
            return error.message;
        } else if (error.error) {
            return error.error;
        } else if (error.name) {
            return error.name;
        } else {
            console.log(error);
            return 'Unidentified error';
        }
    }

    /**
     * Create Document
     * @param ref
     * @param owner
     * @param document
     */
    public static createPolicyDocument(ref: AnyBlockType, owner: IPolicyUser, document: any): IPolicyDocument {
        document.policyId = ref.policyId;
        document.tag = ref.tag;
        document.owner = owner.did;
        document.group = owner.group;
        return document;
    }

    /**
     * Create DID Document
     * @param ref
     * @param owner
     * @param document
     */
    public static createDID(ref: AnyBlockType, owner: IPolicyUser, did: string, document: any): IPolicyDocument {
        return {
            policyId: ref.policyId,
            tag: ref.tag,
            did,
            document,
            owner: owner.did,
            group: owner.group,
            status: DidDocumentStatus.CREATE,
            messageId: null,
            topicId: null,
        };
    }

    /**
     * Create VP Document
     * @param ref
     * @param owner
     * @param document
     */
    public static createVP(ref: AnyBlockType, owner: IPolicyUser, document: VpDocument): IPolicyDocument {
        return {
            policyId: ref.policyId,
            tag: ref.tag,
            type: null,
            hash: document.toCredentialHash(),
            document: document.toJsonTree(),
            owner: owner.did,
            group: owner.group,
            status: DocumentStatus.NEW,
            signature: DocumentSignature.NEW,
            messageId: null,
            topicId: null,
        };
    }

    /**
     * Create VC Document
     * @param ref
     * @param owner
     * @param document
     */
    public static createVC(ref: AnyBlockType, owner: IPolicyUser, document: VcDocument): IPolicyDocument {
        return {
            policyId: ref.policyId,
            tag: ref.tag,
            type: null,
            hash: document.toCredentialHash(),
            document: document.toJsonTree(),
            owner: owner.did,
            group: owner.group,
            assignedTo: null,
            assignedToGroup: null,
            option: null,
            schema: null,
            hederaStatus: DocumentStatus.NEW,
            signature: DocumentSignature.NEW,
            messageId: null,
            topicId: null,
            relationships: null,
            comment: null,
            accounts: null,
        };
    }

    /**
     * Clone DID Document
     * @param ref
     * @param document
     */
    public static cloneVC(ref: AnyBlockType, document: IPolicyDocument): VcDocumentCollection {
        return {
            policyId: ref.policyId,
            tag: document.tag || null,
            type: document.type || null,
            hash: document.hash,
            document: document.document,
            owner: document.owner,
            group: document.group,
            assignedTo: document.assignedTo || null,
            assignedToGroup: document.assignedToGroup || null,
            option: document.option || null,
            schema: document.schema || null,
            hederaStatus: document.hederaStatus || DocumentStatus.NEW,
            signature: document.signature || DocumentSignature.NEW,
            messageId: document.messageId || null,
            topicId: document.topicId || null,
            relationships: document.relationships || null,
            comment: document.comment || null,
            accounts: document.accounts || null,
        } as VcDocumentCollection;
    }

    /**
     * Update Document Ref
     * @param ref
     * @param owner
     * @param document
     */
    public static setDocumentRef(document: IPolicyDocument, ref: IPolicyDocument): IPolicyDocument {
        if (!document.relationships || !document.relationships.length) {
            document.relationships = null;
        }

        if (ref && ref.messageId) {
            document.relationships = [ref.messageId];
        }

        if (ref && ref.accounts) {
            document.accounts = Object.assign({}, ref.accounts, document.accounts);
        }

        return document;
    }

    /**
     * Get Group VC by User
     * @param ref
     * @param user
     */
    public static async getGroupContext(ref: AnyBlockType, user: IPolicyUser): Promise<any> {
        if (!ref.isMultipleGroups) {
            return null;
        }
        const group = await ref.databaseServer.getUserInGroup(ref.policyId, user.did, user.group);
        if (group && group.messageId) {
            const groupSchema = await ref.databaseServer.getSchemaByType(ref.topicId, SchemaEntity.ISSUER);
            return {
                groupId: group.messageId,
                context: groupSchema.contextURL,
                type: groupSchema.name
            }
        }
        return null;
    }

    /**
     * Get document issuer (DID)
     * @param document
     */
    public static getDocumentIssuer(document: any): string {
        if (document) {
            if (typeof document.issuer === 'string') {
                return document.issuer;
            } else {
                return document.issuer.id || null;
            }
        } else {
            return null
        }
    }
}
