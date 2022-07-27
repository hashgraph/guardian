import { Token } from '@entity/token';
import { Topic } from '@entity/topic';
import { HederaSDKHelper, HederaUtils, VcDocument, VcDocument as HVcDocument, TopicHelper } from '@hedera-modules';
import * as mathjs from 'mathjs';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { ExternalMessageEvents, Schema, TopicType } from '@guardian/interfaces';
import { ExternalEventChannel } from '@guardian/common';
import { Schema as SchemaCollection } from '@entity/schema';
import { TopicId } from '@hashgraph/sdk';

/**
 * Data types
 */
export enum DataTypes {
    MRV = 'mrv',
    REPORT = 'report',
    MINT = 'mint',
    RETIREMENT = 'retirement'
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
}

/**
 * Policy engine utils
 */
export class PolicyUtils {
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
        const fields = schema.searchFields((f) => f.customType === 'hederaAccount');
        for (const field of fields) {
            result[field.path] = vc.getField(field.path);
        }
        result.default = defaultAccount;
        return result;
    }

    /**
     * Mint
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
        root: any,
        targetAccount: string,
        uuid: string
    ): Promise<void> {
        const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey, ref.dryRun);

        console.log(`Mint: Start (${tokenValue})`);
        const tokenId = token.tokenId;
        const supplyKey = token.supplyKey;
        const adminId = token.adminId;
        const adminKey = token.adminKey;

        if (token.tokenType === 'non-fungible') {
            const metaData = HederaUtils.decode(uuid);
            const data = new Array<Uint8Array>(Math.floor(tokenValue));
            data.fill(metaData);
            console.log(`Mint: Count (${data.length})`);
            const serials: number[] = [];
            const dataChunk = PolicyUtils.splitChunk(data, 10);
            for (let i = 0; i < dataChunk.length; i++) {
                const element = dataChunk[i];
                console.log(`Mint: Chunk Size (${element.length})`);
                try {
                    const newSerials = await client.mintNFT(tokenId, supplyKey, element, uuid);
                    for (const serial of newSerials) {
                        serials.push(serial)
                    }
                } catch (error) {
                    console.log(`Mint: Mint Error (${error.message})`);
                }
                if (i % 100 === 0) {
                    console.log(`Mint: Minting (${i}/${dataChunk.length})`);
                }
            }
            console.log(`Mint: Minted (${serials.length})`);
            const serialsChunk = PolicyUtils.splitChunk(serials, 10);
            for (let i = 0; i < serialsChunk.length; i++) {
                const element = serialsChunk[i];
                try {
                    await client.transferNFT(tokenId, targetAccount, adminId, adminKey, element, uuid);
                } catch (error) {
                    console.log(`Mint: Transfer Error (${error.message})`);
                }
                if (i % 100 === 0) {
                    console.log(`Mint: Transfer (${i}/${serialsChunk.length})`);
                }
            }
        } else {
            await client.mint(tokenId, supplyKey, tokenValue, uuid);
            await client.transfer(tokenId, targetAccount, adminId, adminKey, tokenValue, uuid);
        }

        new ExternalEventChannel().publishMessage(ExternalMessageEvents.TOKEN_MINTED, { tokenId, tokenValue, memo: uuid })
        console.log('Mint: End');
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
        root: any,
        targetAccount: string,
        uuid: string
    ): Promise<void> {
        const tokenId = token.tokenId;
        const wipeKey = token.wipeKey;

        const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey, ref.dryRun);
        if (token.tokenType === 'non-fungible') {
            throw Error('unsupported operation');
        } else {
            await client.wipe(tokenId, targetAccount, wipeKey, tokenValue, uuid);
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
    public static getDocumentRef(document: any) {
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
        const client = new HederaSDKHelper(user.hederaAccountId, user.hederaAccountKey, ref.dryRun);
        if (!user.hederaAccountKey) {
            throw new Error('Invalid Account Key');
        }
        return await client.associate(token.tokenId, user.hederaAccountId, user.hederaAccountKey);
    }

    /**
     * dissociate
     * @param token
     * @param user
     */
    public static async dissociate(ref: AnyBlockType, token: Token, user: IHederaAccount): Promise<boolean> {
        const client = new HederaSDKHelper(user.hederaAccountId, user.hederaAccountKey, ref.dryRun);
        if (!user.hederaAccountKey) {
            throw new Error('Invalid Account Key');
        }
        return await client.dissociate(token.tokenId, user.hederaAccountId, user.hederaAccountKey);
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
        const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey, ref.dryRun);
        return await client.freeze(token.tokenId, user.hederaAccountId, token.freezeKey);
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
        const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey, ref.dryRun);
        return await client.unfreeze(token.tokenId, user.hederaAccountId, token.freezeKey);
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
        const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey, ref.dryRun);
        return await client.grantKyc(token.tokenId, user.hederaAccountId, token.kycKey);
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
        const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey, ref.dryRun);
        return await client.revokeKyc(token.tokenId, user.hederaAccountId, token.kycKey);
    }

    /**
     * revokeKyc
     * @param account
     */
    public static checkAccountId(account: IHederaAccount): void {
        if (!account || !HederaSDKHelper.checkAccount(account.hederaAccountId)) {
            throw new Error('Invalid Account');
        }
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
        root: any,
        user: any
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
                policyUUID: null
            });
            await topicHelper.twoWayLink(topic, rootTopic, null);
            topic = await ref.databaseServer.createTopic(topic);
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
}
