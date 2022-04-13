import { Token } from "@entity/token";
import { HederaSDKHelper, HederaUtils, VcDocument, VpDocument } from "@hedera-modules";
import * as mathjs from 'mathjs';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { VpDocument as VpDocumentCollection } from '@entity/vp-document';
import { getMongoRepository } from "typeorm";
import { AnyBlockType } from "@policy-engine/policy-engine.interface";
import { IAuthUser } from "@auth/auth.interface";
import { DocumentSignature, DocumentStatus, TopicType } from "interfaces";
import { Topic } from "@entity/topic";
import { TopicHelper } from "@helpers/topicHelper";

export enum DataTypes {
    MRV = 'mrv',
    REPORT = 'report',
    MINT = 'mint',
    RETIREMENT = 'retirement'
}

export class PolicyUtils {
    private static evaluate(formula: string, scope: any) {
        return (function (formula: string, scope: any) {
            try {
                return this.evaluate(formula, scope);
            } catch (error) {
                return 'Incorrect formula';
            }
        }).call(mathjs, formula, scope);
    }

    public static getVCScope(item: VcDocument) {
        return item.getCredentialSubject(0).toJsonTree();
    }

    public static aggregate(rule: string, vcs: VcDocument[]): number {
        let amount = 0;
        for (let i = 0; i < vcs.length; i++) {
            const element = vcs[i];
            const scope = PolicyUtils.getVCScope(element);
            const value = parseFloat(PolicyUtils.evaluate(rule, scope));
            amount += value;
        }
        return amount;
    }

    public static tokenAmount(token: Token, amount: number): [number, string] {
        const decimals = parseFloat(token.decimals) || 0;
        const _decimals = Math.pow(10, decimals);
        const tokenValue = Math.round(amount * _decimals);
        const tokenAmount = (tokenValue / _decimals).toFixed(decimals);
        return [tokenValue, tokenAmount];
    }

    public static splitChunk(array: any[], chunk: number) {
        const res = [];
        let i: number, j: number;
        for (i = 0, j = array.length; i < j; i += chunk) {
            res.push(array.slice(i, i + chunk));
        }
        return res;
    }

    public static getArray<T>(data: T | T[]): T[] {
        if (Array.isArray(data)) {
            return data as T[];
        } else {
            return [data];
        }
    }

    public static async updateVCRecord(row: VcDocumentCollection): Promise<VcDocumentCollection> {
        let item = await getMongoRepository(VcDocumentCollection).findOne({ hash: row.hash });
        if (item) {
            item.owner = row.owner;
            item.assign = row.assign;
            item.option = row.option;
            item.schema = row.schema;
            item.hederaStatus = row.hederaStatus;
            item.signature = row.signature;
            item.type = row.type;
            item.tag = row.tag;
            item.document = row.document;
            await getMongoRepository(VcDocumentCollection).update(item.id, item);
            return item;
        } else {
            item = getMongoRepository(VcDocumentCollection).create(row);
            return await getMongoRepository(VcDocumentCollection).save(item);
        }
    }


    public static async saveVP(row: VpDocumentCollection): Promise<VpDocumentCollection> {
        const doc = getMongoRepository(VpDocumentCollection).create(row);
        return await getMongoRepository(VpDocumentCollection).save(doc);
    }

    public static async mint(token: Token, tokenValue: number, root: any, user: IAuthUser, uuid: string): Promise<void> {
        const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey);

        console.log('Mint: Start');
        const tokenId = token.tokenId;
        const supplyKey = token.supplyKey;
        const adminId = token.adminId;
        const adminKey = token.adminKey;
        if (token.tokenType == 'non-fungible') {
            const metaData: any = HederaUtils.decode(uuid);
            const data = new Array(Math.floor(tokenValue));
            data.fill(metaData);
            const serials: number[] = [];
            const dataChunk = PolicyUtils.splitChunk(data, 10);
            for (let i = 0; i < dataChunk.length; i++) {
                const element = dataChunk[i];
                try {
                    const newSerials = await client.mintNFT(tokenId, supplyKey, element, uuid);
                    for (let j = 0; j < newSerials.length; j++) {
                        serials.push(newSerials[j])
                    }
                } catch (error) {
                    console.log(`Mint: Mint Error (${error.message})`);
                }
                if (i % 100 == 0) {
                    console.log(`Mint: Minting (${i}/${dataChunk.length})`);
                }
            }
            console.log(`Mint: Minted (${serials.length})`);
            const serialsChunk = PolicyUtils.splitChunk(serials, 10);
            for (let i = 0; i < serialsChunk.length; i++) {
                const element = serialsChunk[i];
                try {
                    await client.transferNFT(tokenId, user.hederaAccountId, adminId, adminKey, element, uuid);
                } catch (error) {
                    console.log(`Mint: Transfer Error (${error.message})`);
                }
                if (i % 100 == 0) {
                    console.log(`Mint: Transfer (${i}/${serialsChunk.length})`);
                }
            }
        } else {
            await client.mint(tokenId, supplyKey, tokenValue, uuid);
            await client.transfer(tokenId, user.hederaAccountId, adminId, adminKey, tokenValue, uuid);
        }
        console.log('Mint: End');
    }

    public static async wipe(token: Token, tokenValue: number, root: any, user: IAuthUser, uuid: string): Promise<void> {
        const tokenId = token.tokenId;
        const wipeKey = token.wipeKey;
        const adminId = token.adminId;
        const adminKey = token.adminKey;

        const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey);
        if (token.tokenType == 'non-fungible') {
            throw 'unsupported operation';
        } else {
            await client.wipe(tokenId, user.hederaAccountId, wipeKey, tokenValue, uuid);
        }
    }

    public static async getTopic(topicName: string, root: any, user: any, ref: AnyBlockType): Promise<Topic> {
        const rootTopic = await getMongoRepository(Topic).findOne({
            policyId: ref.policyId,
            type: TopicType.InstancePolicyTopic
        });

        let topic: any;
        if (topicName && topicName !== 'root') {

            const policyTopics = ref.policyInstance.policyTopics || [];
            const config = policyTopics.find(e => e.name == topicName);
            if (!config) {
                throw `Topic "${topicName}" does not exist`;
            }

            const topicOwner = config.static ? root.did : user.did;
            const topicAccountId = config.static ? root.hederaAccountId : user.hederaAccountId;
            const topicAccountKey = config.static ? root.hederaAccountKey : user.hederaAccountKey;

            topic = await getMongoRepository(Topic).findOne({
                policyId: ref.policyId,
                type: TopicType.DynamicTopic,
                name: topicName,
                owner: topicOwner
            });
            if (!topic) {
                const topicHelper = new TopicHelper(topicAccountId, topicAccountKey);
                topic = await topicHelper.create({
                    type: TopicType.DynamicTopic,
                    owner: topicOwner,
                    name: config.name,
                    description: config.description,
                    policyId: ref.policyId,
                    policyUUID: null
                });
                await topicHelper.link(topic, rootTopic, null);
            }
        } else {
            topic = rootTopic;
        }

        return topic;
    }
}