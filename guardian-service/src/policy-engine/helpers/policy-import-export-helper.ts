import { Policy } from '@entity/policy';
import {
    findAllEntities,
    regenerateIds,
    replaceAllEntities,
    replaceValueRecursive,
    SchemaFields
} from '@helpers/utils';
import JSZip from 'jszip';
import { getMongoRepository } from 'typeorm';
import { GenerateUUIDv4 } from '@policy-engine/helpers/uuidv4';
import { Token } from '@entity/token';
import { Schema } from '@entity/schema';
import { ModelHelper, SchemaHelper, SchemaStatus, TopicType } from 'interfaces';
import { Users } from '@helpers/users';
import { HederaSDKHelper } from '@hedera-modules';
import { Topic } from '@entity/topic';

export class PolicyImportExportHelper {
    /**
     * Generate Zip File
     * @param policy policy to pack
     *
     * @returns Zip file
     */
    static async generateZipFile(policy: Policy): Promise<JSZip> {
        const policyObject = {...policy};
        delete policyObject.id;
        delete policyObject.messageId;
        delete policyObject.registeredUsers;
        delete policyObject.status;
        const tokenIds = findAllEntities(policyObject.config, ['tokenId']);
        const schemesIds = findAllEntities(policyObject.config, SchemaFields);

        const tokens = await getMongoRepository(Token).find({where: {tokenId: {$in: tokenIds}}});
        const rootSchemes = await getMongoRepository(Schema).find({
            where: {iri: {$in: schemesIds}}
        });
        const defs: any[] = rootSchemes.map(s => s.document.$defs);
        const map: any = {};
        for (let i = 0; i < rootSchemes.length; i++) {
            const id = rootSchemes[i].iri;
            map[id] = id;
        }
        for (let i = 0; i < defs.length; i++) {
            if (defs[i]) {
                const ids = Object.keys(defs[i]);
                for (let j = 0; j < ids.length; j++) {
                    const id = ids[j];
                    map[id] = id;
                }
            }
        }
        const allSchemesIds = Object.keys(map);
        const schemes = await getMongoRepository(Schema).find({
            where: {iri: {$in: allSchemesIds}}
        });

        const zip = new JSZip();
        zip.folder('tokens')
        for (let token of tokens) {
            zip.file(`tokens/${token.tokenName}.json`, JSON.stringify(token));
        }
        zip.folder('schemes')
        for (let schema of schemes) {
            const item = {...schema};
            delete item.id;
            delete item.status;
            delete item.readonly;
            zip.file(`schemes/${schema.iri}.json`, JSON.stringify(schema));
        }

        zip.file(`policy.json`, JSON.stringify(policyObject));
        return zip;
    }

    /**
     * Parse zip policy file
     * @param zipFile Zip file
     * @returns Parsed policy
     */
    static async parseZipFile(zipFile: any): Promise<any> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        let policyString = await content.files['policy.json'].async('string');
        const tokensStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tokens\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const schemesStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^schemes\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const policy = JSON.parse(policyString);
        const tokens = tokensStringArray.map(item => JSON.parse(item));
        const schemes = schemesStringArray.map(item => JSON.parse(item));

        return {policy, tokens, schemes};
    }

    /**
     * Import policy
     * @param policyToImport Policy json
     * @param policyOwner Policy owner
     *
     * @returns Policies by owner
     */
    static async importPolicy(policyToImport: any, policyOwner: string): Promise<Policy> {
        const {policy, tokens, schemes} = policyToImport;

        policy.policyTag = 'Tag_' + Date.now();
        policy.uuid = GenerateUUIDv4();
        policy.creator = policyOwner;
        policy.owner = policyOwner;
        policy.status = 'DRAFT';
        delete policy.id;
        delete policy.uuid;
        delete policy.messageId;
        delete policy.topicId;
        delete policy.version;
        delete policy.previousVersion;
        delete policy.registeredUsers;

        for (let token of tokens) {
            delete token.id;
            delete token.selected;
        }

        const existingTokens = await getMongoRepository(Token).find();
        const existingTokensMap = {};
        for (let i = 0; i < existingTokens.length; i++) {
            existingTokensMap[existingTokens[i].tokenId] = true;
        }

        const tokenObject = getMongoRepository(Token).create(tokens.filter((token: any) => !existingTokensMap[token.tokenId]));
        await getMongoRepository(Token).save(tokenObject);

        const uuidMap: Map<string, string> = new Map();
        for (let i = 0; i < schemes.length; i++) {
            const file = schemes[i];
            const newUUID = ModelHelper.randomUUID();
            const uuid = file.iri ? file.iri.substring(1) : null;
            if (uuid) {
                uuidMap.set(uuid, newUUID);
            }
            file.uuid = newUUID;
            file.iri = '#' + newUUID;
        }

        for (let i = 0; i < schemes.length; i++) {
            const file = schemes[i];

            file.document = replaceValueRecursive(file.document, uuidMap)
            file.context = replaceValueRecursive(file.context, uuidMap)

            file.messageId = null;
            file.creator = policyOwner;
            file.owner = policyOwner;
            file.status = SchemaStatus.DRAFT;
            SchemaHelper.setVersion(file, '', '');
            const schema = getMongoRepository(Schema).create(file);
            await getMongoRepository(Schema).save(schema);
        }

        const schemesMap = [];
        uuidMap.forEach((v, k) => {
            schemesMap.push({
                oldUUID: k,
                newUUID: v,
                oldIRI: `#${k}`,
                newIRI: `#${v}`
            })
        })

        for (let index = 0; index < schemesMap.length; index++) {
            const item = schemesMap[index];
            replaceAllEntities(policy.config, SchemaFields, item.oldIRI, item.newIRI);
        }
        // compatibility with older versions
        replaceAllEntities(policy.config, ['blockType'], 'interfaceDocumentsSource', 'interfaceDocumentsSourceBlock');
        replaceAllEntities(policy.config, ['blockType'], 'requestVcDocument', 'requestVcDocumentBlock');
        replaceAllEntities(policy.config, ['blockType'], 'sendToGuardian', 'sendToGuardianBlock');
        replaceAllEntities(policy.config, ['blockType'], 'interfaceAction', 'interfaceActionBlock');
        replaceAllEntities(policy.config, ['blockType'], 'mintDocument', 'mintDocumentBlock');
        replaceAllEntities(policy.config, ['blockType'], 'aggregateDocument', 'aggregateDocumentBlock');
        replaceAllEntities(policy.config, ['blockType'], 'wipeDocument', 'retirementDocumentBlock');

        regenerateIds(policy.config);

        if (await getMongoRepository(Policy).findOne({name: policy.name})) {
            policy.name = policy.name + '_' + Date.now();
        }

        const users = new Users();
        const root = await users.getHederaAccount(policyOwner);
        const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey);
        const description = policy.topicDescription || TopicType.PolicyTopic;
        const topicId = await client.newTopic(root.hederaAccountKey, root.hederaAccountKey, description);
        const topic = {
            topicId: topicId,
            description: description,
            owner: policyOwner,
            type: TopicType.PolicyTopic,
            key: root.hederaAccountKey
        };
        const topicObject = getMongoRepository(Topic).create(topic);
        await getMongoRepository(Topic).save(topicObject);
        policy.topicId = topicId;

        const model = getMongoRepository(Policy).create(policy as Policy);
        return await getMongoRepository(Policy).save(model);
    }
}
