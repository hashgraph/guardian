import { Policy } from '@entity/policy';
import {
    findAllEntities,
    getArtifactType,
    regenerateIds,
    replaceAllEntities,
    replaceAllVariables,
    replaceArtifactProperties,
    SchemaFields
} from '@helpers/utils';
import JSZip from 'jszip';
import { Token } from '@entity/token';
import { Schema } from '@entity/schema';
import { SchemaEntity, TopicType, GenerateUUIDv4, TagType } from '@guardian/interfaces';
import { Users } from '@helpers/users';
import { MessageAction, MessageServer, MessageType, PolicyMessage, TopicConfig, TopicHelper } from '@hedera-modules';
import { Topic } from '@entity/topic';
import { importSchemaByFiles, publishSystemSchemas } from '@api/schema.service';
import { PolicyConverterUtils } from '@policy-engine/policy-converter-utils';
import { INotifier } from '@helpers/notifier';
import { DatabaseServer } from '@database-modules';
import { DataBaseHelper } from '@guardian/common';
import { Artifact } from '@entity/artifact';
import { exportTag, importTag } from '@api/tag.service';

/**
 * Policy import export helper
 */
export class PolicyImportExportHelper {
    /**
     * Policy filename
     */
    static policyFileName = 'policy.json';

    /**
     * Generate Zip File
     * @param policy policy to pack
     *
     * @returns Zip file
     */
    static async generateZipFile(policy: Policy): Promise<JSZip> {
        const tagTargets: string[] = [];
        tagTargets.push(policy.id.toString());

        const policyObject = { ...policy };
        const topicId = policyObject.topicId;

        delete policyObject._id;
        delete policyObject.id;
        delete policyObject.messageId;
        delete policyObject.status;
        delete policyObject.topicId;
        delete policyObject.createDate;

        const tokenIds = findAllEntities(policyObject.config, ['tokenId']);

        const tokens = await new DataBaseHelper(Token).find({ where: { tokenId: { $in: tokenIds } } });
        const schemas = await new DataBaseHelper(Schema).find({
            topicId,
            readonly: false
        });

        const zip = new JSZip();
        const artifacts = await new DataBaseHelper(Artifact).find({
            policyId: policy.id
        })
        zip.folder('artifacts');
        for (const artifact of artifacts) {
            zip.file(`artifacts/${artifact.uuid}`, await DatabaseServer.getArtifactFileByUUID(artifact.uuid));
        }
        zip.file(`artifacts/metadata.json`, JSON.stringify(artifacts.map(item => {
            return {
                name: item.name,
                uuid: item.uuid,
                extention: item.extention
            }
        })));
        zip.folder('tokens');
        for (const token of tokens) {
            tagTargets.push(token.id.toString());
            const item = { ...token };
            delete item._id;
            delete item.id;
            delete item.adminId;
            delete item.owner;
            item.id = token.id.toString();
            zip.file(`tokens/${item.tokenName}.json`, JSON.stringify(item));
        }
        zip.folder('schemas');
        for (const schema of schemas) {
            tagTargets.push(schema.id.toString());
            const item = { ...schema };
            delete item._id;
            delete item.id;
            delete item.status;
            delete item.readonly;
            item.id = schema.id.toString();
            zip.file(`schemas/${item.iri}.json`, JSON.stringify(item));
        }

        zip.folder('tags');
        const tags = await exportTag(tagTargets)
        for (let index = 0; index < tags.length; index++) {
            const tag = tags[index];
            zip.file(`tags/${index}.json`, JSON.stringify(tag));
        }

        zip.file(PolicyImportExportHelper.policyFileName, JSON.stringify(policyObject));
        return zip;
    }

    /**
     * Parse zip policy file
     * @param zipFile Zip file
     * @returns Parsed policy
     */
    static async parseZipFile(zipFile: any, includeArtifactsData: boolean = false): Promise<any> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (!content.files[PolicyImportExportHelper.policyFileName] || content.files[PolicyImportExportHelper.policyFileName].dir) {
            throw new Error('Zip file is not a policy');
        }
        const policyString = await content.files[PolicyImportExportHelper.policyFileName].async('string');
        const tokensStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tokens\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const schemasStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^schem[a,e]s\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const artifactsMetaDataFile = await (Object.entries(content.files)
            .find(file => file[0] === 'artifacts/metadata.json'));
        const artifactsMetaDataString = artifactsMetaDataFile && await artifactsMetaDataFile[1].async('string') || '[]';
        const artifactsMetaData = JSON.parse(artifactsMetaDataString);
        const artifacts = includeArtifactsData ? await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^artifacts\/.+/.test(file[0]) && file[0] !== 'artifacts/metadata.json')
            .map(async file => {
                const uuid = file[0].split('/')[1];
                const artifactMetaData = artifactsMetaData.find(item => item.uuid === uuid);
                return {
                    name: artifactMetaData.name,
                    extention: artifactMetaData.extention,
                    uuid: artifactMetaData.uuid,
                    data: await file[1].async('nodebuffer')
                }
            })) : artifactsMetaDataFile;

        const tagsStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tags\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const policy = JSON.parse(policyString);
        const tokens = tokensStringArray.map(item => JSON.parse(item));
        const schemas = schemasStringArray.map(item => JSON.parse(item));
        const tags = tagsStringArray.map(item => JSON.parse(item));

        return { policy, tokens, schemas, artifacts, tags };
    }

    /**
     * Get system schemas
     *
     * @returns Array of schemas
     */
    static async getSystemSchemas(): Promise<Schema[]> {
        const schemas = await Promise.all([
            DatabaseServer.getSystemSchema(SchemaEntity.POLICY),
            DatabaseServer.getSystemSchema(SchemaEntity.MINT_TOKEN),
            DatabaseServer.getSystemSchema(SchemaEntity.MINT_NFTOKEN),
            DatabaseServer.getSystemSchema(SchemaEntity.WIPE_TOKEN),
            DatabaseServer.getSystemSchema(SchemaEntity.ISSUER),
            DatabaseServer.getSystemSchema(SchemaEntity.USER_ROLE),
            DatabaseServer.getSystemSchema(SchemaEntity.CHUNK),
            DatabaseServer.getSystemSchema(SchemaEntity.ACTIVITY_IMPACT),
            DatabaseServer.getSystemSchema(SchemaEntity.TOKEN_DATA_SOURCE)
        ]);

        for (const schema of schemas) {
            if (!schema) {
                throw new Error('One of system schemas is not exist');
            }
        }
        return schemas;
    }

    /**
     * Import policy
     * @param policyToImport
     * @param policyOwner
     * @param versionOfTopicId
     * @param notifier
     * @param additionalPolicyConfig
     *
     * @returns Policies by owner
     */
    static async importPolicy(
        policyToImport: any,
        policyOwner: string,
        versionOfTopicId: string,
        notifier: INotifier,
        additionalPolicyConfig?: Partial<Policy>
    ): Promise<{
        /**
         * New Policy
         */
        policy: Policy,
        /**
         * Errors
         */
        errors: any[]
    }> {
        const {
            policy,
            tokens,
            schemas,
            artifacts,
            tags
        } = policyToImport;

        delete policy._id;
        delete policy.id;
        delete policy.messageId;
        delete policy.version;
        delete policy.previousVersion;
        delete policy.createDate;

        policy.policyTag = additionalPolicyConfig?.policyTag || 'Tag_' + Date.now();
        policy.uuid = GenerateUUIDv4();
        policy.creator = policyOwner;
        policy.owner = policyOwner;
        policy.status = 'DRAFT';
        policy.instanceTopicId = null;
        policy.synchronizationTopicId = null;
        policy.name = additionalPolicyConfig?.name || policy.name;
        policy.topicDescription = additionalPolicyConfig?.topicDescription || policy.topicDescription;
        policy.description = additionalPolicyConfig?.description || policy.description;

        const users = new Users();
        notifier.start('Resolve Hedera account');
        const root = await users.getHederaAccount(policyOwner);
        notifier.completedAndStart('Resolve topic');
        const parent = await TopicConfig.fromObject(
            await DatabaseServer.getTopicByType(policyOwner, TopicType.UserTopic), true
        );
        const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey);

        let topicRow: TopicConfig;
        if (versionOfTopicId) {
            topicRow = await TopicConfig.fromObject(await DatabaseServer.getTopicById(versionOfTopicId), true);
        } else {
            topicRow = await topicHelper.create({
                type: TopicType.PolicyTopic,
                name: policy.name || TopicType.PolicyTopic,
                description: policy.topicDescription || TopicType.PolicyTopic,
                owner: policyOwner,
                policyId: null,
                policyUUID: null
            });
            await topicRow.saveKeys();
            await DatabaseServer.saveTopic(topicRow.toObject());
        }

        notifier.completed();
        policy.topicId = topicRow.topicId;
        notifier.start('Publish Policy in Hedera');
        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
        const message = new PolicyMessage(MessageType.Policy, MessageAction.CreatePolicy);
        message.setDocument(policy);
        const messageStatus = await messageServer
            .setTopicObject(parent)
            .sendMessage(message);
        notifier.completedAndStart('Link topic and policy');
        await topicHelper.twoWayLink(topicRow, parent, messageStatus.getId());
        notifier.completedAndStart('Publishing schemas');
        const systemSchemas = await PolicyImportExportHelper.getSystemSchemas();
        notifier.info(`Found ${systemSchemas.length} schemas`);
        messageServer.setTopicObject(topicRow);

        await publishSystemSchemas(systemSchemas, messageServer, policyOwner, notifier);

        notifier.completed();

        // Import Tokens
        const tokenMap = new Map<string, string>();
        if (tokens) {
            notifier.start('Import tokens');
            const tokenRepository = new DataBaseHelper(Token);
            for (const token of tokens) {
                const tokenObject = tokenRepository.create({
                    tokenId: GenerateUUIDv4(),
                    tokenName: token.tokenName,
                    tokenSymbol: token.tokenSymbol,
                    tokenType: token.tokenType,
                    decimals: token.decimals,
                    initialSupply: token.initialSupply,
                    adminId: null,
                    changeSupply: !!(token.changeSupply || token.supplyKey),
                    enableAdmin: !!(token.enableAdmin || token.adminKey),
                    enableFreeze: !!(token.enableFreeze || token.freezeKey),
                    enableKYC: !!(token.enableKYC || token.kycKey),
                    enableWipe: !!(token.enableWipe || token.wipeKey),
                    owner: root.did,
                    policyId: null,
                    draftToken: true
                });
                await tokenRepository.save(tokenObject);
                console.log(tokenObject);
                replaceAllEntities(policy.config, ['tokenId'], token.tokenId, tokenObject.tokenId);
                replaceAllVariables(policy.config, 'Token', token.tokenId, tokenObject.tokenId);

                tokenMap.set(token.id, tokenObject.id.toString());
            }
            notifier.completed();
        }

        // Import Schemas
        const { schemasMap, errors } = await importSchemaByFiles(policyOwner, schemas, topicRow.topicId, notifier);

        // Upload Artifacts
        notifier.start('Upload Artifacts');
        const artifactsMap = new Map<string, string>();
        const addedArtifacts = [];
        for (const artifact of artifacts) {
            delete artifact._id;
            delete artifact.id;
            const newArtifactUUID = GenerateUUIDv4();
            artifactsMap.set(artifact.uuid, newArtifactUUID);
            artifact.owner = policyOwner;
            artifact.uuid = newArtifactUUID;
            artifact.type = getArtifactType(artifact.extention);
            addedArtifacts.push(await DatabaseServer.saveArtifact(artifact));
            await DatabaseServer.saveArtifactFile(newArtifactUUID, artifact.data);
        }

        notifier.completedAndStart('Saving in DB');
        // Replace id
        await PolicyImportExportHelper.replaceConfig(policy, schemasMap, artifactsMap);

        // Save
        const model = new DataBaseHelper(Policy).create(policy as Policy);
        const result = await new DataBaseHelper(Policy).save(model);

        if (tags) {
            notifier.start('Import tags');
            const policyTags = tags.filter((t: any) => t.entity === TagType.Policy);
            const tokenTags = tags.filter((t: any) => t.entity === TagType.Token);
            const schemaTags = tags.filter((t: any) => t.entity === TagType.Schema);

            await importTag(policyTags, result.id.toString());

            await importTag(tokenTags, tokenMap);

            const map3: Map<string, string> = new Map();
            for (const item of schemasMap) {
                map3.set(item.oldID, item.newID);
            }
            await importTag(schemaTags, map3);
            notifier.completed();
        }

        const _topicRow = await new DataBaseHelper(Topic).findOne({ topicId: topicRow.topicId })
        _topicRow.policyId = result.id.toString();
        _topicRow.policyUUID = result.uuid;
        await new DataBaseHelper(Topic).update(_topicRow);

        for (const addedArtifact of addedArtifacts) {
            addedArtifact.policyId = result.id;
            await DatabaseServer.saveArtifact(addedArtifact);
        }

        notifier.completed();
        return { policy: result, errors };
    }

    /**
     * Replace config
     * @param policy
     * @param schemasMap
     */
    static async replaceConfig(policy: Policy, schemasMap: any, artifactsMap: any) {
        if (await new DataBaseHelper(Policy).findOne({ name: policy.name })) {
            policy.name = policy.name + '_' + Date.now();
        }

        for (const item of schemasMap) {
            replaceAllEntities(policy.config, SchemaFields, item.oldIRI, item.newIRI);
            replaceAllVariables(policy.config, 'Schema', item.oldIRI, item.newIRI);
        }

        // compatibility with older versions
        policy = PolicyConverterUtils.PolicyConverter(policy);
        policy.codeVersion = PolicyConverterUtils.VERSION;
        regenerateIds(policy.config);

        replaceArtifactProperties(policy.config, 'uuid', artifactsMap);
    }
}
