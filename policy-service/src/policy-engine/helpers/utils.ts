import * as mathjs from 'mathjs';
import { AnyBlockType, IPolicyDocument } from '../policy-engine.interface.js';
import { DidDocumentStatus, DocumentSignature, DocumentStatus, Schema, SchemaEntity, TopicType, WorkerTaskType } from '@guardian/interfaces';
import { HederaDidDocument, IAuthUser, KeyType, NotificationHelper, Schema as SchemaCollection, Token, Topic, TopicConfig, TopicHelper, Users, VcDocument as VcDocumentCollection, VcDocumentDefinition as VcDocument, VcDocumentDefinition as HVcDocument, VcSubject, VpDocumentDefinition as VpDocument, Wallet, Workers } from '@guardian/common';
import { TokenId, TopicId } from '@hashgraph/sdk';
import { IHederaCredentials, IPolicyUser, PolicyUser, UserCredentials } from '../policy-user.js';
import { DocumentType } from '../interfaces/document.type.js';

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
    public static getHederaAccounts(vc: HVcDocument, defaultAccount: string, schema: Schema): { [x: string]: string } {
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
     * Get Hedera Account Info
     * @param ref Block Ref
     * @param hederaAccountId Hedera Account Identifier
     * @param user Client User
     * @returns Token's map
     */
    public static async getHederaAccountInfo(
        ref: AnyBlockType,
        hederaAccountId: string,
        user: IHederaCredentials
    ): Promise<any> {
        if (ref.dryRun) {
            return await ref.databaseServer.getVirtualHederaAccountInfo(hederaAccountId);
        } else {
            const workers = new Workers();
            return await workers.addNonRetryableTask({
                type: WorkerTaskType.GET_ACCOUNT_INFO,
                data: {
                    userID: user.hederaAccountId,
                    userKey: user.hederaAccountKey,
                    hederaAccountId
                }
            }, 20);
        }
    }

    /**
     * associate
     * @param ref
     * @param token
     * @param user
     */
    public static async associate(
        ref: AnyBlockType,
        token: Token,
        user: IHederaCredentials
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
                    dryRun: ref.dryRun
                }
            }, 20);
            const userProfile = await new Users().getUserByAccount(
                user.hederaAccountId
            );
            await NotificationHelper.info(
                `Associate token`,
                `${token.tokenName} associated`,
                userProfile?.id
            );
            return result;
        }
    }

    /**
     * dissociate
     * @param ref
     * @param token
     * @param user
     */
    public static async dissociate(
        ref: AnyBlockType,
        token: Token,
        user: IHederaCredentials
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
                    dryRun: ref.dryRun
                }
            }, 20);
            const userProfile = await new Users().getUserByAccount(
                user.hederaAccountId
            );
            await NotificationHelper.info(
                `Dissociate token`,
                `${token.tokenName} dissociated`,
                userProfile?.id
            );
            return result
        }
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
        user: IHederaCredentials,
        root: IHederaCredentials
    ): Promise<boolean> {
        if (ref.dryRun) {
            return await ref.databaseServer.virtualFreeze(user.hederaAccountId, token.tokenId);
        } else {
            const workers = new Workers();
            const freezeKey = await PolicyUtils.wallet.getUserKey(token.owner, KeyType.TOKEN_FREEZE_KEY, token.tokenId);
            return await workers.addNonRetryableTask({
                type: WorkerTaskType.FREEZE_TOKEN,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    freezeKey,
                    token,
                    freeze: true,
                    dryRun: ref.dryRun
                }
            }, 20);
        }
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
        user: IHederaCredentials,
        root: IHederaCredentials
    ): Promise<boolean> {
        if (ref.dryRun) {
            return await ref.databaseServer.virtualUnfreeze(user.hederaAccountId, token.tokenId);
        } else {
            const workers = new Workers();
            const freezeKey = await PolicyUtils.wallet.getUserKey(token.owner, KeyType.TOKEN_FREEZE_KEY, token.tokenId);
            return await workers.addRetryableTask({
                type: WorkerTaskType.FREEZE_TOKEN,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    freezeKey,
                    token,
                    freeze: false,
                    dryRun: ref.dryRun
                }
            }, 20);
        }
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
        user: IHederaCredentials,
        root: IHederaCredentials
    ): Promise<boolean> {
        if (ref.dryRun) {
            return await ref.databaseServer.virtualGrantKyc(user.hederaAccountId, token.tokenId);
        } else {
            const workers = new Workers();
            const kycKey = await PolicyUtils.wallet.getUserKey(token.owner, KeyType.TOKEN_KYC_KEY, token.tokenId);
            return await workers.addRetryableTask({
                type: WorkerTaskType.GRANT_KYC_TOKEN,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    userHederaAccountId: user.hederaAccountId,
                    token,
                    kycKey,
                    grant: true,
                    dryRun: ref.dryRun
                }
            }, 20);
        }
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
        user: IHederaCredentials,
        root: IHederaCredentials
    ): Promise<boolean> {
        if (ref.dryRun) {
            return await ref.databaseServer.virtualRevokeKyc(user.hederaAccountId, token.tokenId);
        } else {
            const workers = new Workers();
            const kycKey = await PolicyUtils.wallet.getUserKey(token.owner, KeyType.TOKEN_KYC_KEY, token.tokenId);
            return await workers.addRetryableTask({
                type: WorkerTaskType.GRANT_KYC_TOKEN,
                data: {
                    hederaAccountId: root.hederaAccountId,
                    hederaAccountKey: root.hederaAccountKey,
                    userHederaAccountId: user.hederaAccountId,
                    token,
                    kycKey,
                    grant: false,
                    dryRun: ref.dryRun
                }
            }, 20);
        }
    }

    /**
     * Create token by template
     * @param ref
     * @param tokenTemplate
     * @param user
     * @returns
     */
    public static async createTokenByTemplate(
        ref: AnyBlockType,
        tokenTemplate: any,
        user: UserCredentials
    ): Promise<Token> {
        let tokenId;
        const owner = user.did;
        const policyId = ref.policyId;
        const adminId = user.hederaAccountId;
        if (!ref.dryRun) {
            const workers = new Workers();
            const hederaAccountKey = await user.loadHederaKey(ref);
            const createdToken = await workers.addRetryableTask({
                type: WorkerTaskType.CREATE_TOKEN,
                data: {
                    operatorId: user.hederaAccountId,
                    operatorKey: hederaAccountKey,
                    ...tokenTemplate
                }
            }, 20);
            tokenId = createdToken.tokenId;

            const wallet = new Wallet();
            await Promise.all([
                wallet.setUserKey(
                    user.did,
                    KeyType.TOKEN_TREASURY_KEY,
                    createdToken.tokenId,
                    createdToken.adminKey
                ),
                wallet.setUserKey(
                    user.did,
                    KeyType.TOKEN_ADMIN_KEY,
                    createdToken.tokenId,
                    createdToken.adminKey
                ),
                wallet.setUserKey(
                    user.did,
                    KeyType.TOKEN_FREEZE_KEY,
                    createdToken.tokenId,
                    createdToken.freezeKey
                ),
                wallet.setUserKey(
                    user.did,
                    KeyType.TOKEN_KYC_KEY,
                    createdToken.tokenId,
                    createdToken.kycKey
                ),
                wallet.setUserKey(
                    user.did,
                    KeyType.TOKEN_SUPPLY_KEY,
                    createdToken.tokenId,
                    createdToken.supplyKey
                ),
                wallet.setUserKey(
                    user.did,
                    KeyType.TOKEN_WIPE_KEY,
                    createdToken.tokenId,
                    createdToken.wipeKey
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
     * revokeKyc
     * @param account
     */
    public static async checkAccountId(account: IHederaCredentials): Promise<void> {
        const workers = new Workers();
        return await workers.addNonRetryableTask({
            type: WorkerTaskType.CHECK_ACCOUNT,
            data: {
                hederaAccountId: account.hederaAccountId,
            }
        }, 20);
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
        root: UserCredentials,
        user: UserCredentials,
        memoObj?: any
    ): Promise<TopicConfig> {
        const rootTopic = await TopicConfig.fromObject(
            await ref.databaseServer.getTopic({
                policyId: ref.policyId,
                type: TopicType.InstancePolicyTopic
            }), !ref.dryRun);

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
            }), !ref.dryRun);

        if (!topic) {
            const hederaCred = config.static
                ? (await root.loadHederaCredentials(ref))
                : (await user.loadHederaCredentials(ref));

            const signOptions = config.static
                ? (await root.loadSignOptions(ref))
                : (await user.loadSignOptions(ref));
            const topicHelper = new TopicHelper(
                hederaCred.hederaAccountId, hederaCred.hederaAccountKey, signOptions, ref.dryRun,
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
            });
            if (!ref.dryRun) {
                await topic.saveKeys();
            }
            await topicHelper.twoWayLink(topic, rootTopic, null);
            await ref.databaseServer.saveTopic(topic.toObject());
        }

        return topic;
    }

    /**
     * Get topic
     * @param ref
     * @param topicId
     */
    public static async getPolicyTopic(ref: AnyBlockType, topicId: string | TopicId): Promise<TopicConfig> {
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
        return await TopicConfig.fromObject(topic, !ref.dryRun);
    }

    /**
     * Get topic
     * @param ref
     */
    public static async getInstancePolicyTopic(ref: AnyBlockType): Promise<TopicConfig> {
        const topic = await ref.databaseServer.getTopic({ policyId: ref.policyId, type: TopicType.InstancePolicyTopic });
        if (!topic) {
            throw new Error(`Topic does not exist`);
        }
        return await TopicConfig.fromObject(topic, !ref.dryRun);
    }

    /**
     * Create Policy User
     * @param ref
     * @param did
     */
    public static async createPolicyUser(ref: AnyBlockType, did: string): Promise<IPolicyUser> {
        const user = new PolicyUser(did);
        if (ref.dryRun) {
            const virtualUser = await ref.databaseServer.getVirtualUser(did);
            user.setVirtualUser(virtualUser);
        }
        const group = await ref.databaseServer.getActiveGroupByUser(ref.policyId, did);
        return user.setGroup(group);
    }

    /**
     * Get Policy User
     * @param ref
     * @param did
     */
    public static getPolicyUser(ref: AnyBlockType, did: string, uuid: string): IPolicyUser {
        const user = new PolicyUser(did, !!ref.dryRun);
        if (uuid) {
            return user.setGroup({ role: null, uuid });
        }
        return user;
    }

    /**
     * Get Policy User By Id
     * @param ref
     * @param userId
     */
    public static getPolicyUserById(ref: AnyBlockType, userId: string): IPolicyUser {
        if (userId.startsWith('did:')) {
            const did = userId;
            return (new PolicyUser(did, !!ref.dryRun));
        } else {
            const [uuid, did] = userId.split(/:(.*)/s, 2);
            return (new PolicyUser(did, !!ref.dryRun)).setGroup({ role: null, uuid });
        }
    }

    /**
     * Get Policy User
     * @param ref
     * @param document
     */
    public static getDocumentOwner(ref: AnyBlockType, document: IPolicyDocument): IPolicyUser {
        const user = new PolicyUser(document.owner, !!ref.dryRun);
        if (document.group) {
            return user.setGroup({ role: null, uuid: document.group });
        }
        return user;
    }

    /**
     * Get Policy User
     * @param ref
     * @param document
     */
    public static async getUserByIssuer(ref: AnyBlockType, document: IPolicyDocument): Promise<PolicyUser> {
        const did = PolicyUtils.getDocumentIssuer(document.document) || document.owner;
        const user = new PolicyUser(did, !!ref.dryRun);
        if (document.group) {
            const group = await ref.databaseServer.getUserInGroup(ref.policyId, did, document.group);
            return user.setGroup(group);
        } else {
            if (did !== ref.policyOwner) {
                const group = await ref.databaseServer.getActiveGroupByUser(ref.policyId, did);
                return user.setGroup(group);
            }
        }
        return user;
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
    public static async getUserCredentials(ref: AnyBlockType, did: string): Promise<UserCredentials> {
        return await UserCredentials.create(ref, did);
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
        owner: IPolicyUser,
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
        owner: IPolicyUser,
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
        owner: IPolicyUser,
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
    public static createVC(ref: AnyBlockType, owner: IPolicyUser, document: VcDocument): IPolicyDocument {
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
    public static async getGroupContext(ref: AnyBlockType, user: IPolicyUser): Promise<any> {
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
    public static async loadSchemaByID(ref: AnyBlockType, id: SchemaEntity): Promise<SchemaCollection> {
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
}
