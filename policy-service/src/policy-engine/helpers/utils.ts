import {
    HederaDidDocument,
    IAuthUser,
    KeyType,
    NotificationHelper,
    Schema as SchemaCollection,
    Token,
    Topic,
    TopicConfig,
    TopicHelper,
    Users,
    VcDocument as VcDocumentCollection,
    VcDocumentDefinition as VcDocument,
    VcDocumentDefinition as HVcDocument,
    VcSubject,
    VpDocumentDefinition as VpDocument,
    Wallet,
    Workers,
    EncryptVcHelper,
    SchemaConverterUtils
} from '@guardian/common';
import { DidDocumentStatus, DocumentSignature, DocumentStatus, ISchema, Schema, SchemaEntity, SchemaField, SignatureType, TopicType, WorkerTaskType } from '@guardian/interfaces';
import { TokenId, TopicId } from '@hashgraph/sdk';
import { FilterQuery } from '@mikro-orm/core';
import * as mathjs from 'mathjs';
import { DocumentType } from '../interfaces/document.type.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType, IPolicyDocument } from '../policy-engine.interface.js';
import { IHederaCredentials, IRelayerAccount, PolicyUser, UserCredentials } from '../policy-user.js';
import { guardianVersion } from '../../version.js';
import { buildTableHelper } from '../helpers/table-field-core.js';

export enum QueryType {
    eq = 'equal',
    ne = 'not_equal',
    in = 'in',
    nin = 'not_in',
    gt = 'gt',
    gte = 'gte',
    lt = 'lt',
    lte = 'lte',
    regex = 'regex'
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
     * Wallet helper
     */
    private static readonly walletHelper = new Wallet();

    /**
     * Custom Functions
     */
    private static readonly customFunctions = mathjs.create({
        ...mathjs.all,
        createEqual: mathjs.factory('equal', [], () => function equal(a: any, b: any) {
            return a === b
        }),
        createUnequal: mathjs.factory('unequal', [], () => function unequal(a: any, b: any) {
            return a !== b
        }),
        createSmaller: mathjs.factory('smaller', [], () => function smaller(a: any, b: any) {
            return a < b
        }),
        createSmallerEq: mathjs.factory('smallerEq', [], () => function smallerEq(a: any, b: any) {
            return a <= b
        }),
        createLarger: mathjs.factory('larger', [], () => function larger(a: any, b: any) {
            return a > b
        }),
        createLargerEq: mathjs.factory('largerEq', [], () => function largerEq(a: any, b: any) {
            return a >= b
        }),
        createCompare: mathjs.factory('compare', [], () => function compare(a: any, b: any) {
            return a > b ? 1 : a < b ? -1 : 0
        })
    });

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
     * Evaluate
     * @param formula
     * @param scope
     */
    public static evaluateCustomFormula(formula: string, scope: any) {
        // tslint:disable-next-line:only-arrow-functions
        return (function (math: any, _formula: string, _scope: any) {
            try {
                return math.evaluate(_formula, _scope);
            } catch (error) {
                return 'Incorrect formula';
            }
        }).call(null, PolicyUtils.customFunctions, formula, scope);
    }

    /**
     * Get VC scope
     * @param item
     */
    public static getVCScope(item: VcDocument) {
        return item.getCredentialSubject(0).getFields();
    }

    /**
     * Get VC scope
     * @param item
     */
    public static createVcFromSubject(subject: any): VcDocument {
        const vc = new VcDocument();
        const credentialSubject = VcSubject.create(subject);
        vc.addCredentialSubject(credentialSubject);
        return vc;
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
     * Create Serial Numbers Array
     * @param startRule
     * @param endRule
     */
    public static aggregateSerialRange(startRule: number, endRule: number): number[] {
        const from = Math.min(startRule, endRule);
        const to = Math.max(startRule, endRule);
        const len = to - from + 1;
        const serialNumbers: number[] = Array.from({ length: len }, (_, i) => from + i);

        return serialNumbers
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
                if (key === 'L' && Array.isArray(result)) {
                    result = result[result.length - 1];
                } else {
                    result = result[key];
                }
            }
            return result;
        }
        return null;
    }

    /**
     * Set Object Value
     * @param data
     * @param field
     * @param value
     */
    public static setObjectValue(data: any, field: string, value: any): void {
        if (field) {
            const keys = field.split('.');
            let result = data;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!result) {
                    return;
                }
                const key = keys[i];
                if (key === 'L' && Array.isArray(result)) {
                    result = result[result.length - 1];
                } else {
                    result = result[key];
                }
            }
            result[keys[keys.length - 1]] = value;
        }
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
    public static getHederaAccounts(
        vc: HVcDocument,
        defaultAccount: string,
        schema: Schema
    ): { [x: string]: string } {
        const result: { [x: string]: string } = {};
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
     * Get Schema Context
     * @param ref
     * @param schema
     */
    public static getSchemaContext(ref: AnyBlockType, schema: SchemaCollection): string {
        if (ref.dryRun) {
            return `schema${schema.iri}`;
        } else {
            return schema.contextURL;
        }
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
     * Get subject id
     * @param data
     */
    public static getCredentialSubject(data: any): any {
        try {
            if (data && data.document) {
                if (Array.isArray(data.document.credentialSubject)) {
                    return data.document.credentialSubject[0];
                } else {
                    return data.document.credentialSubject;
                }
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    /**
     * Get subject type
     * @param document
     */
    public static getCredentialSubjectType(document: any): any {
        try {
            if (document) {
                if (Array.isArray(document.credentialSubject)) {
                    return document.credentialSubject[0];
                } else {
                    return document.credentialSubject;
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
    public static getDocumentType(document: IPolicyDocument): DocumentType {
        if (document && document.document) {
            if (document.document.verifiableCredential) {
                return DocumentType.VerifiablePresentation;
            }
            if (document.document.credentialSubject) {
                return DocumentType.VerifiableCredential;
            }
            if (document.document.verificationMethod) {
                return DocumentType.DID;
            }
        }
        return null;
    }

    /**
     * Check Document Schema
     * @param ref
     * @param document
     * @param schema
     */
    public static checkDocumentSchema(ref: AnyBlockType, document: any, schema: SchemaCollection): boolean {
        const iri = schema.iri ? schema.iri.slice(1) : null;
        const context = PolicyUtils.getSchemaContext(ref, schema);
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
     * @param ref
     * @param token
     * @param user
     * @param userId
     */
    public static async associate(
        ref: AnyBlockType,
        token: Token,
        user: IHederaCredentials | IRelayerAccount,
        userId: string | null
    ): Promise<boolean> {
        if (ref.dryRun) {
            return await ref.databaseServer.virtualAssociate(user.hederaAccountId, token);
        } else {
            const workers = new Workers();
            const result = await workers.addNonRetryableTask({
                type: WorkerTaskType.ASSOCIATE_TOKEN,
                data: {
                    tokenId: token.tokenId,
                    userID: user.hederaAccountId,
                    userKey: user.hederaAccountKey,
                    associate: true,
                    dryRun: ref.dryRun,
                    payload: { userId }
                }
            }, {
                priority: 20
            });
            await NotificationHelper.info(
                `Associate token`,
                `${token.tokenName} associated`,
                user?.id
            );
            return result;
        }
    }

    /**
     * dissociate
     * @param ref
     * @param token
     * @param user
     * @param userId
     */
    public static async dissociate(
        ref: AnyBlockType,
        token: Token,
        user: IHederaCredentials | IRelayerAccount,
        userId: string | null
    ): Promise<boolean> {
        if (ref.dryRun) {
            return await ref.databaseServer.virtualDissociate(user.hederaAccountId, token.tokenId);
        } else {
            const workers = new Workers();
            const result = await workers.addNonRetryableTask({
                type: WorkerTaskType.ASSOCIATE_TOKEN,
                data: {
                    tokenId: token.tokenId,
                    userID: user.hederaAccountId,
                    userKey: user.hederaAccountKey,
                    associate: false,
                    dryRun: ref.dryRun,
                    payload: { userId }
                }
            }, {
                priority: 20
            });
            await NotificationHelper.info(
                `Dissociate token`,
                `${token.tokenName} dissociated`,
                user?.id
            );
            return result
        }
    }

    /**
     * freeze
     * @param ref
     * @param token
     * @param user
     * @param root
     * @param userId
     */
    public static async freeze(
        ref: AnyBlockType,
        token: Token,
        user: IHederaCredentials,
        root: IHederaCredentials,
        userId: string | null
    ): Promise<boolean> {
        if (ref.dryRun) {
            return await ref.databaseServer.virtualFreeze(user.hederaAccountId, token.tokenId);
        } else {
            const workers = new Workers();
            const freezeKey = await PolicyUtils.walletHelper.getUserKey(token.owner, KeyType.TOKEN_FREEZE_KEY, token.tokenId, userId);
            return await workers.addNonRetryableTask({
                type: WorkerTaskType.FREEZE_TOKEN,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    freezeKey,
                    token,
                    freeze: true,
                    dryRun: ref.dryRun,
                    payload: { userId }
                }
            }, {
                priority: 20
            });
        }
    }

    /**
     * unfreeze
     * @param ref
     * @param token
     * @param user
     * @param root
     * @param userId
     */
    public static async unfreeze(
        ref: AnyBlockType,
        token: Token,
        user: IHederaCredentials,
        root: IHederaCredentials,
        userId: string | null
    ): Promise<boolean> {
        if (ref.dryRun) {
            return await ref.databaseServer.virtualUnfreeze(user.hederaAccountId, token.tokenId);
        } else {
            const workers = new Workers();
            const freezeKey = await PolicyUtils.walletHelper.getUserKey(token.owner, KeyType.TOKEN_FREEZE_KEY, token.tokenId, userId);
            return await workers.addRetryableTask({
                type: WorkerTaskType.FREEZE_TOKEN,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    freezeKey,
                    token,
                    freeze: false,
                    dryRun: ref.dryRun,
                    payload: { userId }
                }
            }, {
                priority: 20
            });
        }
    }

    /**
     * grantKyc
     * @param ref
     * @param token
     * @param user
     * @param root
     * @param userId
     */
    public static async grantKyc(
        ref: AnyBlockType,
        token: Token,
        user: IHederaCredentials,
        root: IHederaCredentials,
        userId: string | null
    ): Promise<boolean> {
        if (ref.dryRun) {
            return await ref.databaseServer.virtualGrantKyc(user.hederaAccountId, token.tokenId);
        } else {
            const workers = new Workers();
            const kycKey = await PolicyUtils.walletHelper.getUserKey(token.owner, KeyType.TOKEN_KYC_KEY, token.tokenId, userId);
            return await workers.addRetryableTask({
                type: WorkerTaskType.GRANT_KYC_TOKEN,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    userHederaAccountId: user.hederaAccountId,
                    token,
                    kycKey,
                    grant: true,
                    dryRun: ref.dryRun,
                    payload: { userId }
                }
            }, {
                priority: 20
            });
        }
    }

    /**
     * revokeKyc
     * @param ref
     * @param token
     * @param user
     * @param root
     * @param userId
     */
    public static async revokeKyc(
        ref: AnyBlockType,
        token: Token,
        user: IHederaCredentials,
        root: IHederaCredentials,
        userId: string | null
    ): Promise<boolean> {
        if (ref.dryRun) {
            return await ref.databaseServer.virtualRevokeKyc(user.hederaAccountId, token.tokenId);
        } else {
            const workers = new Workers();
            const kycKey = await PolicyUtils.walletHelper.getUserKey(token.owner, KeyType.TOKEN_KYC_KEY, token.tokenId, userId);
            return await workers.addRetryableTask({
                type: WorkerTaskType.GRANT_KYC_TOKEN,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    userHederaAccountId: user.hederaAccountId,
                    token,
                    kycKey,
                    grant: false,
                    dryRun: ref.dryRun,
                    payload: { userId }
                }
            }, {
                priority: 20
            });
        }
    }

    /**
     * Create token by template
     * @param ref
     * @param tokenTemplate
     * @param user
     * @param userId
     * @returns
     */
    public static async createTokenByTemplate(
        ref: AnyBlockType,
        tokenTemplate: any,
        user: UserCredentials,
        userId: string | null
    ): Promise<Token> {
        let tokenId;
        const owner = user.did;
        const policyId = ref.policyId;
        const adminId = user.hederaAccountId;
        if (!ref.dryRun) {
            const workers = new Workers();
            const hederaAccountKey = await user.loadHederaKey(ref, userId);

            const createdToken = await workers.addRetryableTask({
                type: WorkerTaskType.CREATE_TOKEN,
                data: {
                    operatorId: user.hederaAccountId,
                    operatorKey: hederaAccountKey,
                    payload: { userId },
                    ...tokenTemplate
                }
            }, {
                priority: 20
            });
            tokenId = createdToken.tokenId;

            const walletHelper = new Wallet();
            await Promise.all([
                walletHelper.setUserKey(
                    user.did,
                    KeyType.TOKEN_TREASURY_KEY,
                    createdToken.tokenId,
                    createdToken.treasuryKey,
                    userId
                ),
                walletHelper.setUserKey(
                    user.did,
                    KeyType.TOKEN_ADMIN_KEY,
                    createdToken.tokenId,
                    createdToken.adminKey,
                    userId
                ),
                walletHelper.setUserKey(
                    user.did,
                    KeyType.TOKEN_FREEZE_KEY,
                    createdToken.tokenId,
                    createdToken.freezeKey,
                    userId
                ),
                walletHelper.setUserKey(
                    user.did,
                    KeyType.TOKEN_KYC_KEY,
                    createdToken.tokenId,
                    createdToken.kycKey,
                    userId
                ),
                walletHelper.setUserKey(
                    user.did,
                    KeyType.TOKEN_SUPPLY_KEY,
                    createdToken.tokenId,
                    createdToken.supplyKey,
                    userId
                ),
                walletHelper.setUserKey(
                    user.did,
                    KeyType.TOKEN_WIPE_KEY,
                    createdToken.tokenId,
                    createdToken.wipeKey,
                    userId
                ),
            ]);
        } else {
            tokenId = new TokenId(Date.now()).toString();
        }

        return await ref.databaseServer.createToken({
            ...tokenTemplate,
            tokenId,
            owner,
            policyId,
            adminId
        });
    }

    /**
     * Get topic
     * @param ref
     * @param topicName
     * @param root
     * @param user
     * @param userId
     */
    public static async getOrCreateTopic(
        ref: AnyBlockType,
        topicName: string,
        root: UserCredentials,
        user: UserCredentials,
        userId: string | null,
        memoObj?: any
    ): Promise<TopicConfig> {
        const rootTopic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopic({
                policyId: ref.policyId,
                type: TopicType.InstancePolicyTopic
            }), !ref.dryRun, userId);

        if (!topicName) {
            return rootTopic;
        }

        if (topicName === 'root') {
            return rootTopic;
        }

        let topic: TopicConfig;

        const policyTopics = ref.policyInstance.policyTopics || [];
        const config = policyTopics.find(e => e.name === topicName);
        if (!config) {
            throw new Error(`Topic "${topicName}" does not exist`);
        }

        const topicOwner = config.static ? root.did : user.did;
        topic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopic({
                policyId: ref.policyId,
                type: TopicType.DynamicTopic,
                name: topicName,
                owner: topicOwner
            }), !ref.dryRun, userId);

        if (!topic) {
            const hederaCred = config.static
                ? (await root.loadHederaCredentials(ref, userId))
                : (await user.loadHederaCredentials(ref, userId));

            const signOptions = config.static
                ? (await root.loadSignOptions(ref, userId))
                : (await user.loadSignOptions(ref, userId));
            const topicHelper = new TopicHelper(
                hederaCred.hederaAccountId,
                hederaCred.hederaAccountKey,
                signOptions,
                ref.dryRun,
            );
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
            }, userId, null);
            if (!ref.dryRun) {
                await topic.saveKeys(userId);
            }
            await topicHelper.twoWayLink(topic, rootTopic, null, userId);
            await ref.databaseServer.saveTopic(topic.toObject());
        }

        return topic;
    }

    /**
     * Get topic
     * @param ref
     * @param topicId
     * @param userId
     */
    public static async getPolicyTopic(ref: AnyBlockType, topicId: string | TopicId, userId: string | null): Promise<TopicConfig> {
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
        return await TopicConfig.fromObject(topic, !ref.dryRun, userId);
    }

    /**
     * Get topic
     * @param ref
     * @param userId
     */
    public static async getInstancePolicyTopic(ref: AnyBlockType, userId: string | null): Promise<TopicConfig> {
        const topic = await ref.databaseServer.getTopic({ policyId: ref.policyId, type: TopicType.InstancePolicyTopic });
        if (!topic) {
            throw new Error(`Topic does not exist`);
        }
        return await TopicConfig.fromObject(topic, !ref.dryRun, userId);
    }

    /**
     * Get Policy User
     * @param ref
     * @param did
     * @param uuid
     * @param userId
     */
    public static async getPolicyUser(ref: AnyBlockType, did: string, uuid: string, userId: string | null): Promise<PolicyUser> {
        if (uuid) {
            return await PolicyComponentsUtils.GetPolicyUserByDID(did, uuid, ref, userId);
        } else {
            return await PolicyComponentsUtils.GetPolicyUserByDID(did, null, ref, userId);
        }
    }

    /**
     * Get Policy User By Id
     * @param ref
     * @param userId
     */
    public static async getPolicyUserById(ref: AnyBlockType, userId: string): Promise<PolicyUser> {
        if (userId.startsWith('did:')) {
            return await PolicyComponentsUtils.GetPolicyUserByDID(userId, null, ref, userId);
        } else {
            const [uuid, did] = userId.split(/:(.*)/s, 2);
            return await PolicyComponentsUtils.GetPolicyUserByDID(did, uuid, ref, userId);
        }
    }

    /**
     * Get Policy User
     * @param ref
     * @param document
     * @param userId
     */
    public static async getDocumentOwner(
        ref: AnyBlockType,
        document: IPolicyDocument,
        userId: string | null
    ): Promise<PolicyUser> {
        return await PolicyComponentsUtils.GetPolicyUserByDID(document.owner, document.group, ref, userId);
    }

    /**
     * Get Document Relayer Account
     * @param ref
     * @param document
     * @param userId
     */
    public static async getDocumentRelayerAccount(
        ref: AnyBlockType,
        document: IPolicyDocument,
        userId: string | null
    ): Promise<string> {
        return PolicyUtils.getUserRelayerAccount(ref, document?.owner, document?.relayerAccount, userId);
    }

    /**
     * Get User Relayer Account
     * @param ref
     * @param did
     * @param relayerAccount
     * @param userId
     */
    public static async getUserRelayerAccount(
        ref: AnyBlockType,
        did: string,
        relayerAccount: string,
        userId: string | null
    ): Promise<string> {
        if (ref.dryRun) {
            const userFull = await ref.components.getVirtualUser(did);
            return userFull?.hederaAccountId;
        } else {
            const config = await PolicyUtils.users.getUserRelayerAccount(did, relayerAccount, userId);
            return config?.account;
        }
    }

    /**
     * Get User Relayer Account
     * @param ref
     * @param did
     * @param relayerAccount
     * @param userId
     */
    public static async getRefRelayerAccount(
        ref: AnyBlockType,
        did: string,
        relayerAccount: string,
        documentRef: IPolicyDocument | null,
        userId: string | null
    ): Promise<string> {
        if (documentRef && !relayerAccount) {
            return PolicyUtils.getDocumentRelayerAccount(ref, documentRef, userId);
        } else {
            return PolicyUtils.getUserRelayerAccount(ref, did, relayerAccount, userId);
        }
    }

    /**
     * Get Policy User
     * @param ref
     * @param document
     * @param userId
     */
    public static async getUserByIssuer(ref: AnyBlockType, document: IPolicyDocument, userId: string | null): Promise<PolicyUser> {
        const did = PolicyUtils.getDocumentIssuer(document.document) || document.owner;
        return await PolicyComponentsUtils.GetPolicyUserByDID(did, document.group, ref, userId);
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
     * @param userId
     */
    public static async getUser(ref: AnyBlockType, did: string, userId: string | null): Promise<IAuthUser> {
        if (ref.dryRun) {
            return await ref.databaseServer.getVirtualUser(did);
        } else {
            return await PolicyUtils.users.getUserById(did, userId);
        }
    }

    /**
     * Get Hedera Account Id
     * @param ref
     * @param did
     * @param userId
     */
    public static async getHederaAccountId(ref: AnyBlockType, did: string, userId: string | null): Promise<string> {
        if (ref.dryRun) {
            const userFull = await ref.databaseServer.getVirtualUser(did);
            return userFull.hederaAccountId;
        } else {
            const userFull = await PolicyUtils.users.getUserById(did, userId);
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
    public static async getUserCredentials(ref: AnyBlockType, did: string, userId: string | null): Promise<UserCredentials> {
        return await UserCredentials.create(ref, did, userId);
    }

    /**
     * Get Hedera Account and Private Key
     * @param ref
     * @param did
     */
    public static async getUserCredentialsByAccount(ref: AnyBlockType, accountId: string, userId: string | null): Promise<UserCredentials> {
        return await UserCredentials.createByAccount(ref, accountId, userId);
    }

    /**
     * Get Hedera Account and Private Key
     * @param hederaAccountId
     * @param hederaAccountKey
     */
    public static createHederaCredentials(
        hederaAccountId: string,
        hederaAccountKey: string = null,
        id: string = null,
    ): IHederaCredentials {
        return { hederaAccountId, hederaAccountKey, id }
    }

    /**
     * Get Private Key
     * @param ref
     * @param userDid
     * @param type
     * @param keyName
     * @param userId
     */
    public static async getAccountKey(ref: AnyBlockType, userDid: string, type: KeyType, keyName: string, userId: string | null): Promise<string> {
        if (ref.dryRun) {
            const userFull = await ref.databaseServer.getVirtualUser(userDid);
            if (!userFull) {
                throw new Error('User not found');
            }
            return await ref.databaseServer.getVirtualKey(userDid, keyName);
        } else {
            const userFull = await PolicyUtils.users.getUserById(userDid, userId);
            if (!userFull) {
                throw new Error('User not found');
            }
            return await PolicyUtils.walletHelper.getKey(userFull.walletToken, type, keyName);
        }
    }

    /**
     * Save Private Key
     * @param ref
     * @param userDid
     * @param type
     * @param keyName
     * @param key
     * @param userId
     */
    public static async setAccountKey(ref: AnyBlockType, userDid: string, type: KeyType, keyName: string, key: string, userId: string | null): Promise<void> {
        if (ref.dryRun) {
            await ref.databaseServer.setVirtualKey(userDid, keyName, key);
        } else {
            const userFull = await PolicyUtils.users.getUserById(userDid, userId);
            if (!userFull) {
                throw new Error('User not found');
            }
            await PolicyUtils.walletHelper.setKey(userFull.walletToken, type, keyName, key);
        }
    }

    /**
     * Get all standard registry accounts
     */
    public static async getAllStandardRegistryAccounts(ref: AnyBlockType, countResult: boolean, userId: string | null): Promise<any[] | number> {
        if (ref.dryRun) {
            return (countResult) ? 0 : [];
        } else {
            if (countResult) {
                return (await PolicyUtils.users.getAllStandardRegistryAccounts(userId)).length;
            }
            return await PolicyUtils.users.getAllStandardRegistryAccounts(userId) as any;
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
                    'policyId': { $eq: policyId },
                    $or: [
                        { 'document.credentialSubject.id': { $eq: refId } },
                        { 'document.credentialSubject.0.id': { $eq: refId } }
                    ]
                } as unknown as FilterQuery<VcDocumentCollection>);
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
                        'policyId': { $eq: policyId },
                        'document.credentialSubject.id': { $eq: id }
                    } as FilterQuery<VcDocumentCollection>);
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
            console.error(error);
            return 'Unidentified error';
        }
    }

    /**
     * Create Document
     * @param ref
     * @param owner
     * @param document
     */
    public static createPolicyDocument(
        ref: AnyBlockType,
        owner: PolicyUser,
        document: any
    ): IPolicyDocument {
        return {
            policyId: ref.policyId,
            tag: ref.tag,
            document,
            owner: owner.did,
            group: owner.group
        };
    }

    /**
     * Create DID Document
     * @param ref
     * @param owner
     * @param document
     */
    public static createDID(
        ref: AnyBlockType,
        owner: PolicyUser,
        document: HederaDidDocument
    ): IPolicyDocument {
        return {
            policyId: ref.policyId,
            tag: ref.tag,
            did: document.getDid(),
            document: document.getDocument(),
            owner: owner.did,
            group: owner.group,
            status: DidDocumentStatus.CREATE
        };
    }

    /**
     * Create VP Document
     * @param ref
     * @param owner
     * @param document
     */
    public static createVP(
        ref: AnyBlockType,
        owner: PolicyUser,
        document: VpDocument,
    ): IPolicyDocument {
        return {
            policyId: ref.policyId,
            tag: ref.tag,
            hash: document.toCredentialHash(),
            document: document.toJsonTree(),
            owner: owner.did,
            group: owner.group,
            status: DocumentStatus.NEW,
            signature: DocumentSignature.NEW,
        };
    }

    /**
     * Create VC Document
     * @param ref
     * @param owner
     * @param document
     */
    public static createUnsignedVC(ref: AnyBlockType, document: VcDocument): IPolicyDocument {
        return {
            policyId: ref.policyId,
            tag: ref.tag,
            document: document.toJsonTree()
        };
    }

    /**
     * Create VC Document
     * @param ref
     * @param owner
     * @param document
     */
    public static createVC(
        ref: AnyBlockType,
        owner: PolicyUser,
        document: VcDocument
    ): IPolicyDocument {
        return {
            policyId: ref.policyId,
            tag: ref.tag,
            hash: document.toCredentialHash(),
            document: document.toJsonTree(),
            owner: owner.did,
            group: owner.group,
            hederaStatus: DocumentStatus.NEW,
            signature: DocumentSignature.NEW
        };
    }

    /**
     * Create VC Document
     * @param ref
     * @param document
     */
    public static async saveVC(
        ref: AnyBlockType,
        document: IPolicyDocument,
        userId: string | null
    ): Promise<IPolicyDocument> {
        await PolicyUtils.encryptVC(ref, document, userId);
        return await ref.databaseServer.saveVC(document);
    }

    /**
     * Create VC Document
     * @param ref
     * @param document
     */
    public static async updateVC(
        ref: AnyBlockType,
        document: VcDocumentCollection,
        userId: string | null
    ): Promise<IPolicyDocument> {
        await PolicyUtils.encryptVC(ref, document, userId);
        return await ref.databaseServer.updateVC(document);
    }

    /**
     * Create VC Document
     * @param ref
     * @param document
     */
    public static async saveDocumentState(
        ref: AnyBlockType,
        document: IPolicyDocument
    ): Promise<IPolicyDocument> {
        const state = { ...document };
        if (state.encryptedDocument) {
            delete state.document;
        }
        return await ref.databaseServer.saveDocumentState({
            documentId: document.id,
            document: state,
            policyId: ref.policyId
        });
    }

    public static needEncryptVC(document: IPolicyDocument): boolean {
        return document?.document?.proof?.type === SignatureType.BbsBlsSignature2020;
    }

    public static async encryptVC(
        ref: AnyBlockType,
        document: IPolicyDocument,
        userId: string | null
    ): Promise<IPolicyDocument> {
        if (PolicyUtils.needEncryptVC(document)) {
            const messageKey = await UserCredentials.loadMessageKeyOrPrivateKey(ref, document.owner, userId);
            const data = JSON.stringify(document.document);
            document.encryptedDocument = await EncryptVcHelper.encrypt(data, messageKey);
        }
        return document;
    }

    /**
     * Clone VC Document
     * @param ref
     * @param document
     */
    public static cloneVC(ref: AnyBlockType, document: IPolicyDocument): VcDocumentCollection {
        const clone = Object.assign({}, document);
        clone.policyId = ref.policyId;
        if (document.document) {
            clone.document = JSON.parse(JSON.stringify(document.document));
        }
        return clone as VcDocumentCollection;
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

        if (ref && ref.tokens) {
            document.tokens = Object.assign({}, ref.tokens, document.tokens);
        }

        return document;
    }

    /**
     * Get Group VC by User
     * @param ref
     * @param user
     */
    public static async getGroupContext(ref: AnyBlockType, user: PolicyUser): Promise<any> {
        const policyGroups = PolicyUtils.getGroupTemplates<any>(ref);
        if (policyGroups.length === 0) {
            return null;
        }
        const group = await ref.databaseServer.getUserInGroup(ref.policyId, user.did, user.group);
        if (group && group.messageId) {
            const groupSchema = await PolicyUtils.loadSchemaByType(ref, SchemaEntity.ISSUER);
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
        if (document && document.issuer) {
            if (typeof document.issuer === 'string') {
                return document.issuer;
            } else {
                return document.issuer.id || null;
            }
        } else {
            return null
        }
    }

    /**
     * Load schema by type
     * @param ref
     * @param type
     */
    public static async loadSchemaByType(ref: AnyBlockType, type: SchemaEntity): Promise<SchemaCollection> {
        return await ref.components.loadSchemaByType(type);
    }

    /**
     * Load schema by id
     * @param ref
     * @param type
     */
    public static async loadSchemaByID(ref: AnyBlockType, id: string): Promise<SchemaCollection> {
        return await ref.components.loadSchemaByID(id);
    }

    /**
     * Load schema by id
     * @param ref
     * @param uuid
     */
    public static async getArtifactFile(ref: AnyBlockType, uuid: string): Promise<string> {
        if (!uuid) {
            throw new Error(`File does not exist`);
        }
        const file = await ref.components.loadArtifactByID(uuid);
        if (typeof file === 'string') {
            return file;
        } else {
            throw new Error(`File does not exist`);
        }
    }

    /**
     * Load token template by name
     * @param ref
     * @param name
     */
    public static getTokenTemplate<T>(ref: AnyBlockType, name: any): T {
        return ref.components.getTokenTemplate<T>(name);
    }

    /**
     * Find Group Template
     * @param ref
     * @param name
     */
    public static getGroupTemplate<T>(ref: AnyBlockType, name: string): T {
        return ref.components.getGroupTemplate<T>(name);
    }

    /**
     * Get Group Templates
     * @param ref
     * @param name
     */
    public static getGroupTemplates<T>(ref: AnyBlockType): T[] {
        return ref.components.getGroupTemplates<T>();
    }

    /**
     * Find Role Template
     * @param ref
     * @param name
     */
    public static getRoleTemplate<T>(ref: AnyBlockType, name: string): T {
        return ref.components.getRoleTemplate<T>(name);
    }

    public static getQueryFilter(key: string, value: any) {
        const queryKey = String(key)
            .replace('document.credentialSubject.0', 'firstCredentialSubject')
            .replace('document.verifiableCredential.0.credentialSubject.0', 'firstCredentialSubject')
            .replace('document.verifiableCredential.0', 'firstVerifiableCredential');

        let queryOperation: string = '$eq';
        let queryValue: any = value;
        if (typeof value === 'object') {
            [queryOperation, queryValue] = Object.entries(value)[0];
        }

        //Check number value
        const numberValue = PolicyUtils.parseQueryNumberValue(queryValue);
        if (numberValue) {
            if (queryOperation === '$nin') {
                return {
                    $and: [
                        { $not: { $in: [`\$${queryKey}`, numberValue[0]] } },
                        { $not: { $in: [`\$${queryKey}`, numberValue[1]] } }
                    ]
                }
            } else if (queryOperation === '$ne') {
                return {
                    $and: [
                        { [`${queryOperation}`]: [`\$${queryKey}`, numberValue[0]] },
                        { [`${queryOperation}`]: [`\$${queryKey}`, numberValue[1]] }
                    ]
                }
            } else {
                return {
                    $or: [
                        { [`${queryOperation}`]: [`\$${queryKey}`, numberValue[0]] },
                        { [`${queryOperation}`]: [`\$${queryKey}`, numberValue[1]] }
                    ]
                }
            }
        } else {
            if (queryOperation === '$nin') {
                return { $not: { $in: [`\$${queryKey}`, queryValue] } }
            } else {
                return { [`${queryOperation}`]: [`\$${queryKey}`, queryValue] };
            }
        }
    }

    public static parseQueryNumberValue(value: any) {
        if (Array.isArray(value)) {
            if (value.length) {
                const stringValue: string[] = [];
                const numberValue: number[] = [];
                for (const v of value) {
                    if (isNaN(v)) {
                        return null;
                    } else {
                        stringValue.push(String(v));
                        numberValue.push(Number(v));
                    }
                }
                return [stringValue, numberValue];
            } else {
                return null;
            }
        } else {
            if (isNaN(value)) {
                return null;
            } else {
                return [String(value), Number(value)];
            }
        }
    }

    public static parseQuery(type: string, value: string) {
        let queryType: QueryType;
        let queryValue: any;
        if (type === 'user_defined') {
            const [userType, userValue] = PolicyUtils.parseFilterValue(value);
            queryType = userType;
            queryValue = PolicyUtils.getQueryValue(queryType, userValue);
        } else {
            queryType = type as QueryType;
            queryValue = PolicyUtils.getQueryValue(queryType, value);
        }
        const queryExpression = PolicyUtils.getQueryExpression(queryType, queryValue);
        return {
            type: queryType,
            value: queryValue,
            expression: queryExpression
        }
    }

    public static parseFilterValue(value: string): [QueryType, string] {
        if (typeof value === 'string') {
            if (value.startsWith('eq:')) {
                return [QueryType.eq, value.substring('eq'.length + 1)];
            }
            if (value.startsWith('ne:')) {
                return [QueryType.ne, value.substring('ne'.length + 1)];
            }
            if (value.startsWith('in:')) {
                return [QueryType.in, value.substring('in'.length + 1)];
            }
            if (value.startsWith('nin:')) {
                return [QueryType.nin, value.substring('nin'.length + 1)];
            }
            if (value.startsWith('gt:')) {
                return [QueryType.gt, value.substring('gt'.length + 1)];
            }
            if (value.startsWith('gte:')) {
                return [QueryType.gte, value.substring('gte'.length + 1)];
            }
            if (value.startsWith('lt:')) {
                return [QueryType.lt, value.substring('lt'.length + 1)];
            }
            if (value.startsWith('lte:')) {
                return [QueryType.lte, value.substring('lte'.length + 1)];
            }
            if (value.startsWith('regex:')) {
                return [QueryType.regex, value.substring('regex'.length + 1)];
            }
        }
        return [null, value];
    }

    public static getQueryValue(queryType: QueryType, value: any): any {
        if (typeof value === 'number') {
            value = String(value);
        }
        if (typeof value !== 'string') {
            return null;
        }
        switch (queryType) {
            case QueryType.eq:
                return value;
            case QueryType.ne:
                return value;
            case QueryType.in:
                return value.split(',');
            case QueryType.nin:
                return value.split(',');
            case QueryType.gt:
                return value;
            case QueryType.gte:
                return value;
            case QueryType.lt:
                return value;
            case QueryType.lte:
                return value;
            case QueryType.regex:
                return '.*' + value + '.*'
            default:
                return null;
        }
    }

    public static getQueryExpression(queryType: QueryType, value: any): any {
        if (value === null || value === undefined) {
            return null;
        }
        switch (queryType) {
            case QueryType.eq:
                return { $eq: value }
            case QueryType.ne:
                return { $ne: value }
            case QueryType.in:
                return { $in: value }
            case QueryType.nin:
                return { $nin: value }
            case QueryType.gt:
                return { $gt: value }
            case QueryType.gte:
                return { $gte: value }
            case QueryType.lt:
                return { $lt: value }
            case QueryType.lte:
                return { $lte: value }
            case QueryType.regex:
                return { $regex: value }
            default:
                return null;
        }
    }

    /**
     * Add Guardian version to Credential Subject
     * @param credentialSubject
     * @param schema
     */
    public static setGuardianVersion(credentialSubject: any, schema: ISchema): void {
        if (SchemaConverterUtils.versionCompare(schema.codeVersion, '1.1.0') > 0) {
            credentialSubject.guardianVersion = guardianVersion;
        }
    }

    public static setAutoCalculateFields(schema: Schema, document: any): void {
        PolicyUtils.autoCalculateFields(schema.fields, document);
    }

    private static autoCalculateFields(fields: SchemaField[], document: any): any {
        if (!document || typeof document !== 'object' || Array.isArray(document)) {
            return;
        }
        for (const field of fields) {
            if (field.isRef) {
                if (Array.isArray(document[field.name])) {
                    for (const element of document[field.name]) {
                        PolicyUtils.autoCalculateFields(field.fields, element);
                    }
                } else if (typeof document[field.name] === 'object') {
                    PolicyUtils.autoCalculateFields(field.fields, document[field.name]);
                }
            } else if (field.autocalculate) {
                document[field.name] = PolicyUtils.autoCalculateField(field, document);
                if (document[field.name] === undefined) {
                    delete document[field.name];
                }
            }
        }
    }

    private static autoCalculateField(field: SchemaField, document: any): any {
        try {
            const func = Function('table', `with (this) { return ${field.expression} }`);

            const table = buildTableHelper();

            return func.apply(document, [table]);
        } catch (error) {
            throw Error(`Invalid expression: ${field.path}`);
        }
    }

    private static async loadUser(
        did: string,
        ref: AnyBlockType | null,
        userId: string | null
    ): Promise<IAuthUser> {
        if (ref && ref.dryRun) {
            return ref.components.getVirtualUser(did);
        } else {
            return PolicyUtils.users.getUserById(did, userId);
        }
    }

    private static async loadRelayerAccountKey(
        did: string,
        relayerAccount: string,
        ref: AnyBlockType | null,
        userId: string | null
    ): Promise<string | null> {
        if (ref && ref.dryRun) {
            return ref.databaseServer.getVirtualKey(did, `${did}/${relayerAccount}`);
        } else {
            return PolicyUtils.walletHelper.getUserKey(did, KeyType.RELAYER_ACCOUNT, `${did}/${relayerAccount}`, userId);
        }
    }

    private static async loadHederaKey(
        did: string,
        ref: AnyBlockType | null,
        userId: string | null
    ): Promise<string | null> {
        if (ref && ref.dryRun) {
            return ref.databaseServer.getVirtualKey(did, did);
        } else {
            return PolicyUtils.walletHelper.getUserKey(did, KeyType.KEY, did, userId);
        }
    }

    public static async loadRelayerAccount(
        did: string,
        relayerAccount: string,
        ref: AnyBlockType | null,
        userId: string | null
    ) {
        const userFull = await PolicyUtils.loadUser(did, ref, userId);
        const hederaAccountId: string = userFull?.hederaAccountId;
        if (relayerAccount && relayerAccount !== hederaAccountId) {
            const relayerAccountKey = await PolicyUtils.loadRelayerAccountKey(did, relayerAccount, ref, userId);
            return {
                location: userFull.location,
                hederaAccountId: relayerAccount,
                hederaAccountKey: relayerAccountKey
            }
        } else {
            const hederaKey = await PolicyUtils.loadHederaKey(did, ref, userId);
            return {
                location: userFull.location,
                hederaAccountId,
                hederaAccountKey: hederaKey,
            }
        }
    }

    public static async getRelayerAccount(
        ref: AnyBlockType,
        did: string,
        relayerAccount: string | null | undefined,
        documentRef: IPolicyDocument,
        userId: string | null
    ) {
        try {
            let account: string;
            if (ref.dryRun) {
                account = await PolicyUtils.getUserRelayerAccount(ref, did, null, userId);
            } else if (relayerAccount) {
                account = relayerAccount;
            } else if (documentRef) {
                account = await PolicyUtils.getDocumentRelayerAccount(ref, documentRef, userId);
            } else {
                account = await PolicyUtils.getUserRelayerAccount(ref, did, null, userId);
            }
            return account;
        } catch (error) {
            throw Error(`Invalid relayer account.`);
        }
    }

    public static async checkAccountBalance(
        relayerAccount?: string | any,
        userId?: string
    ) {
        try {
            if (relayerAccount) {
                const workers = new Workers();
                const info = await workers.addNonRetryableTask({
                    type: WorkerTaskType.GET_ACCOUNT_INFO_REST,
                    data: {
                        hederaAccountId: typeof relayerAccount === 'string' ? relayerAccount : relayerAccount?.account,
                        payload: { userId }
                    }
                }, {
                    priority: 20
                });
                return (info.balance / 100000000) > 1;
            }
            return true;
        } catch (error) {
            return null;
        }
    }
}
