
import { ConfigType, GenerateUUIDv4, SchemaEntity, TagType, TopicType, } from '@guardian/interfaces';
import { publishSystemSchemas } from '@api/helpers/schema-publish-helper';
import { importSchemaByFiles } from '@api/helpers/schema-import-export-helper';
import { PolicyConverterUtils } from '@policy-engine/policy-converter-utils';
import { INotifier } from '@helpers/notifier';
import {
    DataBaseHelper,
    DatabaseServer,
    getArtifactType,
    MessageAction,
    MessageServer,
    MessageType,
    Policy,
    PolicyMessage,
    regenerateIds,
    replaceAllEntities,
    replaceAllVariables,
    replaceArtifactProperties,
    Schema,
    SchemaFields,
    Token,
    Topic,
    TopicConfig,
    TopicHelper,
    Users
} from '@guardian/common';
import { importTag } from '@api/tag.service';
import { SchemaImportResult } from '@api/helpers/schema-helper';
import { HashComparator } from '@analytics';

/**
 * Policy import export helper
 */
export class PolicyImportExportHelper {
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
        additionalPolicyConfig?: Partial<Policy>,
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

        policy.topicId = topicRow.topicId;

        if (!versionOfTopicId) {
            notifier.completedAndStart('Publish Policy in Hedera');
            const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
            const message = new PolicyMessage(MessageType.Policy, MessageAction.CreatePolicy);
            message.setDocument(policy);
            const messageStatus = await messageServer
                .setTopicObject(parent)
                .sendMessage(message);
            notifier.completedAndStart('Link topic and policy');
            await topicHelper.twoWayLink(
                topicRow,
                parent,
                messageStatus.getId()
            );

            notifier.completedAndStart('Publishing schemas');
            const systemSchemas = await PolicyImportExportHelper.getSystemSchemas();
            notifier.info(`Found ${systemSchemas.length} schemas`);
            messageServer.setTopicObject(topicRow);
            await publishSystemSchemas(systemSchemas, messageServer, policyOwner, notifier);
        } else {
            notifier.completedAndStart('Skip publishing policy in Hedera');
            notifier.completedAndStart('Skip publishing schemas');
        }

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
                replaceAllEntities(policy.config, ['tokenId'], token.tokenId, tokenObject.tokenId);
                replaceAllVariables(policy.config, 'Token', token.tokenId, tokenObject.tokenId);

                tokenMap.set(token.id, tokenObject.id.toString());
                tokenMap.set(token.tokenId, tokenObject.id.toString());
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
                map3.set(item.oldMessageID, item.newID);
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

        const suggestionsConfig = await DatabaseServer.getSuggestionsConfig(
            policyOwner
        );
        if (!suggestionsConfig) {
            await DatabaseServer.setSuggestionsConfig({
                user: policyOwner,
                items: [
                    {
                        id: result.id,
                        type: ConfigType.POLICY,
                        index: 0,
                    },
                ],
            });
        }

        notifier.completedAndStart('Updating hash');
        await HashComparator.saveHashMap(result);

        notifier.completed();
        return { policy: result, errors };
    }

    /**
     * Replace config
     * @param policy
     * @param schemasMap
     */
    static async replaceConfig(policy: Policy, schemasMap: SchemaImportResult[], artifactsMap: any) {
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
