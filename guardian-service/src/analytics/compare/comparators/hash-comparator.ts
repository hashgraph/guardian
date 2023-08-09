import { DatabaseServer, Logger, Policy } from '@guardian/common';
import { PolicyModel } from '../models/policy.model';
import { SchemaModel } from '../models/schema.model';
import { PropertyType } from '../types/property.type';
import { TokenModel } from '../models/token.model';
import { FileModel } from '../models/file.model';
import { IWeightBlock, IWeightItem } from '../interfaces/weight-tree';
import { CompareUtils } from '../utils/utils';

enum WeightIndex {
    //type + full prop + index + children
    FULL = 0,
    //type + full prop + children
    PROP_AND_CHILDREN = 1,
    //type + full prop
    FULL_PROP = 2,
    //type + prop
    PROP = 3,
    //type
    TYPE = 4
}

/**
 * Component for comparing two policies
 */
export class HashComparator {
    private static readonly options = {
        childLvl: 2,
        eventLvl: 1,
        idLvl: 0,
        propLvl: 2
    };

    public static async createModel(policyId: string): Promise<PolicyModel> {
        try {
            //Policy
            const policy = await DatabaseServer.getPolicyById(policyId);

            if (!policy) {
                throw new Error('Unknown policy');
            }

            const policyModel = (new PolicyModel(policy, HashComparator.options));

            //Schemas
            const schemas = await DatabaseServer.getSchemas({ topicId: policy.topicId });

            const schemaModels: SchemaModel[] = [];
            for (const schema of schemas) {
                const m = new SchemaModel(schema, HashComparator.options);
                m.setPolicy(policy);
                m.update(HashComparator.options);
                schemaModels.push(m);
            }
            policyModel.setSchemas(schemaModels);

            //Tokens
            const tokensIds = policyModel.getAllProp<string>(PropertyType.Token)
                .filter(t => t.value)
                .map(t => t.value);

            const tokens = await DatabaseServer.getTokens({ where: { tokenId: { $in: tokensIds } } });

            const tokenModels: TokenModel[] = [];
            for (const token of tokens) {
                const t = new TokenModel(token, HashComparator.options);
                t.update(HashComparator.options);
                tokenModels.push(t);
            }
            policyModel.setTokens(tokenModels);

            //Artifacts
            const files = await DatabaseServer.getArtifacts({ policyId: policyId });
            const artifactsModels: FileModel[] = [];
            for (const file of files) {
                const data = await DatabaseServer.getArtifactFileByUUID(file.uuid);
                const f = new FileModel(file, data, HashComparator.options);
                f.update(HashComparator.options);
                artifactsModels.push(f);
            }
            policyModel.setArtifacts(artifactsModels);

            //Compare
            policyModel.update();

            return policyModel;
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE, HASH']);
            return null;
        }
    }

    public static async createModelByFile(file: any): Promise<PolicyModel> {
        try {
            if (!file) {
                throw new Error('Invalid file');
            }

            const { policy, schemas, tokens, artifacts } = file;

            //Policy
            const policyModel = (new PolicyModel(policy, HashComparator.options));

            //Schemas
            const schemaModels: SchemaModel[] = [];
            for (const schema of schemas) {
                const m = new SchemaModel(schema, HashComparator.options);
                m.setPolicy(policy);
                m.update(HashComparator.options);
                schemaModels.push(m);
            }
            policyModel.setSchemas(schemaModels);

            //Tokens
            const tokenModels: TokenModel[] = [];
            for (const row of tokens) {
                const token: any = {
                    tokenId: row.tokenId,
                    tokenName: row.tokenName,
                    tokenSymbol: row.tokenSymbol,
                    tokenType: row.tokenType,
                    decimals: row.decimals,
                    initialSupply: row.initialSupply,
                    enableAdmin: !!(row.enableAdmin || row.adminKey),
                    enableFreeze: !!(row.enableFreeze || row.freezeKey),
                    enableKYC: !!(row.enableKYC || row.kycKey),
                    enableWipe: !!(row.enableWipe || row.wipeKey),
                }
                const t = new TokenModel(token, HashComparator.options);
                t.update(HashComparator.options);
                tokenModels.push(t);
            }
            policyModel.setTokens(tokenModels);

            //Artifacts
            const artifactsModels: FileModel[] = [];
            for (const artifact of artifacts) {
                const f = new FileModel(artifact, artifact.data, HashComparator.options);
                f.update(HashComparator.options);
                artifactsModels.push(f);
            }
            policyModel.setArtifacts(artifactsModels);

            //Compare
            policyModel.update();

            return policyModel;
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE, HASH']);
            return null;
        }
    }

    public static createTree(policy: PolicyModel): any {
        try {
            if (!policy) {
                return null;
            }

            const json: any = {};
            if (policy.roles) {
                json.roles = policy.roles.map(item => item.toWeight(policy.options));
            }
            if (policy.groups) {
                json.groups = policy.groups.map(item => item.toWeight(policy.options));
            }
            if (policy.topics) {
                json.topics = policy.topics.map(item => item.toWeight(policy.options));
            }
            if (policy.tokens) {
                json.tokens = policy.tokens.map(item => item.toWeight(policy.options));
            }
            if (policy.tree) {
                json.tree = policy.tree.toWeight(policy.options);
            }

            return json;
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE, HASH']);
            return null;
        }
    }

    public static createHash(policy: PolicyModel): string {
        try {
            if (!policy) {
                return null;
            }
            const json = HashComparator.createTree(policy);
            return CompareUtils.sha256(JSON.stringify(json));
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE, HASH']);
            return null;
        }
    }

    public static async saveHashMap(policy: Policy): Promise<Policy> {
        try {
            const compareModel = await HashComparator.createModel(policy.id.toString());
            const tree = HashComparator.createTree(compareModel);
            const hash = CompareUtils.sha256(JSON.stringify(tree));
            policy.hash = hash;
            policy.hashMap = tree;
            policy = await DatabaseServer.updatePolicy(policy);
            return policy;
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE, HASH']);
            return policy;
        }
    }

    public static compare(policy1: Policy, policy2: Policy): number {
        try {

            if (!policy1 || !policy1.hashMap) {
                return 0;
            }
            if (!policy2 || !policy2.hashMap) {
                return 0;
            }

            if (policy1.hash === policy2.hash) {
                return 100;
            }

            console.debug('<-------------------------')

            const roles = HashComparator.compareArray(policy1.hashMap.roles, policy2.hashMap.roles);
            const groups = HashComparator.compareArray(policy1.hashMap.groups, policy2.hashMap.groups);
            const topics = HashComparator.compareArray(policy1.hashMap.topics, policy2.hashMap.topics);
            const tokens = HashComparator.compareArray(policy1.hashMap.tokens, policy2.hashMap.tokens);

            const tree = HashComparator.compareTree(policy1.hashMap.tree, policy2.hashMap.tree);

            const k = [
                HashComparator.arrayFactor(2, policy1.hashMap.roles, policy2.hashMap.roles),
                HashComparator.arrayFactor(2, policy1.hashMap.groups, policy2.hashMap.groups),
                HashComparator.arrayFactor(1, policy1.hashMap.topics, policy2.hashMap.topics),
                HashComparator.arrayFactor(1, policy1.hashMap.tokens, policy2.hashMap.tokens),
                HashComparator.treeFactor(14, policy1.hashMap.tree, policy2.hashMap.tree)
            ];

            const rate = Math.round((
                (k[0] * roles) +
                (k[1] * groups) +
                (k[2] * topics) +
                (k[3] * tokens) +
                (k[4] * tree)
            ) / (k[0] + k[1] + k[2] + k[3] + k[4]));

            console.debug(tree, rate);
            console.debug('------------------------->')

            return rate;
        } catch (error) {
            console.debug('----', error);
            new Logger().error(error, ['GUARDIAN_SERVICE, HASH']);
            return 0;
        }
    }

    private static arrayFactor(base: number, array1: IWeightBlock[], array2: IWeightBlock[]): number {
        if (!array1 && !array2) {
            return 0;
        }
        if (!array1?.length && !array2?.length) {
            return 0;
        }
        return base;
    }

    private static treeFactor(base: number, data1: IWeightBlock, data2: IWeightBlock): number {
        if (!data1 && !data2) {
            return 1;
        }
        if (!data1?.children && !data2?.children) {
            return 1;
        }
        if (!data1?.children?.length && !data2?.children?.length) {
            return 1;
        }
        return base;
    }

    private static compareArray(array1: IWeightItem[], array2: IWeightItem[]): number {
        if (!array1 || !array2) {
            return 0;
        }
        if (array1.length === 0 && array2.length === 0) {
            return 100;
        }
        if (array1.length === 0 || array2.length === 0) {
            return 0;
        }
        const map1 = new Map<string, number>();
        const map2 = new Map<string, number>();
        for (const item of array1) {
            if (map1.has(item.weight)) {
                map1.set(item.weight, map1.get(item.weight) + 1);
            } else {
                map1.set(item.weight, 1);
            }
        }
        for (const item of array2) {
            if (map2.has(item.weight)) {
                map2.set(item.weight, map2.get(item.weight) + 1);
            } else {
                map2.set(item.weight, 1);
            }
        }
        for (const key of map1.keys()) {
            if (map2.has(key)) {
                const v1 = map1.get(key);
                const v2 = map2.get(key);
                const min = Math.min(v1, v2);
                map1.set(key, v1 - min);
                map2.set(key, v2 - min);
            }
        }
        let sum1 = 0;
        let sum2 = 0;
        for (const value of map1.values()) {
            sum1 += value;
        }
        for (const value of map2.values()) {
            sum2 += value;
        }
        const rate1 = Math.floor(((array1.length - sum1) / array1.length) * 100);
        const rate2 = Math.floor(((array2.length - sum2) / array2.length) * 100);
        return Math.min(rate1, rate2);
    }

    private static mapChildren(
        buffer1: IWeightBlock[],
        buffer2: IWeightBlock[],
        result: any[],
        index: WeightIndex
    ): void {
        for (let i = 0; i < buffer1.length; i++) {
            const left = buffer1[i];
            if (left && left.weights) {
                for (let j = 0; j < buffer2.length; j++) {
                    const right = buffer2[j];
                    if (right && right.weights) {
                        if (left.weights[index] === right.weights[index]) {
                            result.push([left, right, index]);
                            buffer1[i] = null;
                            buffer2[j] = null;
                        }
                    }
                }
            }
        }
    }

    private static compareChildren(array1: IWeightBlock[], array2: IWeightBlock[]): number {
        if (array1.length === 0 && array2.length === 0) {
            return 1;
        }
        if (array1.length === 0 || array2.length === 0) {
            return 0;
        }

        const result: any = [];
        const buffer1 = array1.slice();
        const buffer2 = array2.slice();

        let length1 = 0;
        let length2 = 0;
        for (const left of buffer1) {
            length1 += left.length + 1;
        }
        for (const right of buffer2) {
            length2 += right.length + 1;
        }

        HashComparator.mapChildren(buffer1, buffer2, result, WeightIndex.FULL);
        HashComparator.mapChildren(buffer1, buffer2, result, WeightIndex.PROP_AND_CHILDREN);
        HashComparator.mapChildren(buffer1, buffer2, result, WeightIndex.FULL_PROP);
        HashComparator.mapChildren(buffer1, buffer2, result, WeightIndex.PROP);
        HashComparator.mapChildren(buffer1, buffer2, result, WeightIndex.TYPE);
        let sum1 = 0;
        let sum2 = 0;
        for (const row of result) {
            const left = row[0];
            const right = row[1];
            const index = row[2];
            if (index === WeightIndex.FULL) {
                sum1 += left.length + 1;
                sum2 += right.length + 1;
            }
            if (index === WeightIndex.PROP_AND_CHILDREN) {
                sum1 += left.length + 0.95;
                sum2 += right.length + 0.95;
            }
            if (index === WeightIndex.FULL_PROP) {
                const k = HashComparator.compareChildren(left.children, right.children);
                sum1 += (k * left.length) + 1;
                sum2 += (k * right.length) + 1;
            }
            if (index === WeightIndex.PROP) {
                const k = HashComparator.compareChildren(left.children, right.children);
                sum1 += (k * left.length) + 0.75;
                sum2 += (k * right.length) + 0.75;
            }
            if (index === WeightIndex.TYPE) {
                const k = HashComparator.compareChildren(left.children, right.children);
                sum1 += (k * left.length) + 0.5;
                sum2 += (k * right.length) + 0.5;
            }
        }
        const rate1 = sum1 / length1;
        const rate2 = sum2 / length2;
        return Math.min(rate1, rate2);
    }

    private static compareTree(tree1: IWeightBlock, tree2: IWeightBlock): number {

        if (!tree1 || !tree2 || !tree1.weights || !tree2.weights) {
            return 0;
        }

        if (tree1.weights[WeightIndex.FULL] === tree2.weights[WeightIndex.FULL]) {
            return 100;
        }

        if (tree1.weights[WeightIndex.TYPE] !== tree2.weights[WeightIndex.TYPE]) {
            return 0;
        }

        const k = HashComparator.compareChildren(tree1.children, tree2.children);

        if (tree1.weights[WeightIndex.PROP] === tree2.weights[WeightIndex.PROP]) {
            return Math.floor(k * 100);
        } else {
            const rate1 = Math.floor((k * tree1.length + 0.5) / (tree1.length + 1) * 100);
            const rate2 = Math.floor((k * tree2.length + 0.5) / (tree2.length + 1) * 100);
            return Math.min(rate1, rate2);
        }
    }

    public static async search(policy: Policy, threshold: number = 0): Promise<any[]> {
        const result = [];
        if (!policy || !policy.hashMap) {
            return result;
        }
        const policies = await DatabaseServer.getPolicies({
            $or: [{
                owner: policy.owner,
                hash: { $exists: true, $ne: null }
            }, {
                status: 'PUBLISH',
                hash: { $exists: true, $ne: null },
                owner: { $ne: policy.owner }
            }]
        });
        for (const item of policies) {
            if (policy.id !== item.id) {
                const rate = HashComparator.compare(policy, item);
                if (rate >= threshold) {
                    result.push({
                        id: item.id,
                        uuid: item.uuid,
                        name: item.name,
                        description: item.description,
                        version: item.version,
                        status: item.status,
                        topicId: item.topicId,
                        messageId: item.messageId,
                        owner: item.owner,
                        rate
                    })
                }
            }
        }
        return result;
    }
}