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
import { TopicType } from 'interfaces';
import { Users } from '@helpers/users';
import { HederaSDKHelper, MessageAction, MessageServer, MessageType, PolicyMessage } from '@hedera-modules';
import { Topic } from '@entity/topic';
import { importSchemaByFiles } from '@api/schema.service';
import { TopicHelper } from '@helpers/topicHelper';

export class PolicyImportExportHelper {
    /**
     * Generate Zip File
     * @param policy policy to pack
     *
     * @returns Zip file
     */
    static async generateZipFile(policy: Policy): Promise<JSZip> {
        const policyObject = { ...policy };
        delete policyObject.id;
        delete policyObject.messageId;
        delete policyObject.registeredUsers;
        delete policyObject.status;
        const tokenIds = findAllEntities(policyObject.config, ['tokenId']);
        const schemesIds = findAllEntities(policyObject.config, SchemaFields);

        const tokens = await getMongoRepository(Token).find({ where: { tokenId: { $in: tokenIds } } });
        const rootSchemes = await getMongoRepository(Schema).find({
            where: { iri: { $in: schemesIds } }
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
            where: { iri: { $in: allSchemesIds } }
        });

        const zip = new JSZip();
        zip.folder('tokens')
        for (let token of tokens) {
            zip.file(`tokens/${token.tokenName}.json`, JSON.stringify(token));
        }
        zip.folder('schemes')
        for (let schema of schemes) {
            const item = { ...schema };
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

        return { policy, tokens, schemes };
    }

    /**
     * Import policy
     * @param policyToImport Policy json
     * @param policyOwner Policy owner
     *
     * @returns Policies by owner
     */
    static async importPolicy(policyToImport: any, policyOwner: string): Promise<Policy> {
        const { policy, tokens, schemes } = policyToImport;

        delete policy.id;
        delete policy.messageId;
        delete policy.version;
        delete policy.previousVersion;
        delete policy.registeredUsers;
        policy.policyTag = 'Tag_' + Date.now();
        policy.uuid = GenerateUUIDv4();
        policy.creator = policyOwner;
        policy.owner = policyOwner;
        policy.status = 'DRAFT';


        const users = new Users();
        const root = await users.getHederaAccount(policyOwner);

        const parent = await getMongoRepository(Topic).findOne({ owner: policyOwner, type: TopicType.UserTopic });
        const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey);
        const topicRow = await topicHelper.create({
            type: TopicType.PolicyTopic,
            name: policy.name || TopicType.PolicyTopic,
            description: policy.topicDescription || TopicType.PolicyTopic,
            owner: policyOwner,
            policyId: null,
            policyUUID: null
        });

        policy.topicId = topicRow.topicId;

        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
        const message = new PolicyMessage(MessageType.Policy, MessageAction.CreatePolicy);
        message.setDocument(policy);
        const messageStatus = await messageServer
            .setTopicObject(parent)
            .sendMessage(message);

        await topicHelper.link(topicRow, parent, messageStatus.getId());

        // Import Tokens
        if (tokens) {
            const client = new HederaSDKHelper(root.hederaAccountId, root.hederaAccountKey);
            const tokenRepository = getMongoRepository(Token);
            for (const token of tokens) {
                const treasury = await client.newAccount(2);
                const treasuryId = treasury.id;
                const treasuryKey = treasury.key;
                const tokenName = token.tokenName;
                const tokenSymbol = token.tokenSymbol;
                const tokenType = token.tokenType;
                const nft = tokenType == 'non-fungible';
                const decimals = nft ? 0 : token.decimals;
                const initialSupply = nft ? 0 : token.initialSupply;
                const adminKey = token.adminKey ? treasuryKey : null;
                const kycKey = token.kycKey ? treasuryKey : null;
                const freezeKey = token.freezeKey ? treasuryKey : null;
                const wipeKey = token.wipeKey ? treasuryKey : null;
                const supplyKey = token.supplyKey ? treasuryKey : null;
                const tokenId = await client.newToken(
                    tokenName,
                    tokenSymbol,
                    nft,
                    decimals,
                    initialSupply,
                    '',
                    treasury,
                    adminKey,
                    kycKey,
                    freezeKey,
                    wipeKey,
                    supplyKey,
                );
                const tokenObject = tokenRepository.create({
                    tokenId,
                    tokenName,
                    tokenSymbol,
                    tokenType,
                    decimals: decimals,
                    initialSupply: initialSupply,
                    adminId: treasuryId ? treasuryId.toString() : null,
                    adminKey: adminKey ? adminKey.toString() : null,
                    kycKey: kycKey ? kycKey.toString() : null,
                    freezeKey: freezeKey ? freezeKey.toString() : null,
                    wipeKey: wipeKey ? wipeKey.toString() : null,
                    supplyKey: supplyKey ? supplyKey.toString() : null,
                    owner: root.did
                });
                await tokenRepository.save(tokenObject);
                replaceAllEntities(policy.config, ['tokenId'], token.tokenId, tokenId);
            }
        }

        // Import Schemes
        const schemesMap = await importSchemaByFiles(policyOwner, schemes, topicRow.topicId);

        // Replace id
        await this.replaceConfig(policy, schemesMap);

        // Save
        const model = getMongoRepository(Policy).create(policy as Policy);
        const result = await getMongoRepository(Policy).save(model);

        topicRow.policyId = result.id.toString();
        topicRow.policyUUID = result.uuid;
        await getMongoRepository(Topic).update(topicRow.id, topicRow);

        return result;
    }

    static async replaceConfig(policy: Policy, schemesMap: any) {
        if (await getMongoRepository(Policy).findOne({ name: policy.name })) {
            policy.name = policy.name + '_' + Date.now();
        }

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
    }
}
