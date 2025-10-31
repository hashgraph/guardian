import { BlockType, IFormula, IRootConfig, ModuleStatus, SchemaEntity } from '@guardian/interfaces';
import {
    DatabaseServer,
    IPolicyComponents,
    PinoLogger,
    Policy,
    regenerateIds,
    replaceAllEntities,
    replaceAllVariables,
    replaceArtifactProperties,
    Schema,
    SchemaFields,
    FormulaImportExport,
    PolicyImportExport,
    MessageType,
    PolicyMessage,
    MessageServer,
    INotificationStep
} from '@guardian/common';
import { ImportMode } from '../common/import.interface.js';
import { ImportPolicyError, ImportPolicyOptions, ImportPolicyResult } from './policy-import.interface.js';
import { PolicyImport } from './policy-import.js';
import { ImportSchemaMap } from '../schema/schema-import.interface.js';
import { PolicyConverterUtils } from './policy-converter-utils.js';
import { HashComparator, PolicyLoader } from '../../../analytics/index.js';
import { importPolicyTags } from '../tag/tag-import-helper.js';

/**
 * Policy import export helper
 */
export class PolicyImportExportHelper {
    /**
     * Get system schemas
     *
     * @returns Array of schemas
     */
    public static async getSystemSchemas(): Promise<Schema[]> {
        const schemas = await Promise.all([
            DatabaseServer.getSystemSchema(SchemaEntity.POLICY),
            DatabaseServer.getSystemSchema(SchemaEntity.MINT_TOKEN),
            DatabaseServer.getSystemSchema(SchemaEntity.INTEGRATION_DATA_V2),
            DatabaseServer.getSystemSchema(SchemaEntity.MINT_NFTOKEN),
            DatabaseServer.getSystemSchema(SchemaEntity.WIPE_TOKEN),
            DatabaseServer.getSystemSchema(SchemaEntity.ISSUER),
            DatabaseServer.getSystemSchema(SchemaEntity.USER_ROLE),
            DatabaseServer.getSystemSchema(SchemaEntity.CHUNK),
            DatabaseServer.getSystemSchema(SchemaEntity.ACTIVITY_IMPACT),
            DatabaseServer.getSystemSchema(SchemaEntity.TOKEN_DATA_SOURCE),
            DatabaseServer.getSystemSchema(SchemaEntity.POLICY_COMMENT),
            DatabaseServer.getSystemSchema(SchemaEntity.POLICY_DISCUSSION)
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
     * @param user
     * @param versionOfTopicId
     * @param additionalPolicyConfig
     * @param metadata
     * @param demo
     * @param notifier
     * @param logger
     *
     * @returns import result
     */
    public static async importPolicy(
        mode: ImportMode,
        options: ImportPolicyOptions,
        notifier: INotificationStep,
        userId: string | null
    ): Promise<ImportPolicyResult> {
        const helper = new PolicyImport(mode, notifier);
        return helper.import(options, userId);
    }

    /**
     * Replace config
     * @param policy
     * @param schemasMap
     */
    public static async replaceConfig(
        policy: Policy,
        schemasMap: ImportSchemaMap[],
        artifactsMap: Map<string, string>,
        tokenMap: any[],
        tools: { oldMessageId: string, messageId: string, oldHash: string, newHash?: string }[]
    ) {
        if (await new DatabaseServer().findOne(Policy, { name: policy.name })) {
            policy.name = policy.name + '_' + Date.now();
        }

        for (const item of schemasMap) {
            replaceAllEntities(policy.config, SchemaFields, item.oldIRI, item.newIRI);
            replaceAllVariables(policy.config, 'Schema', item.oldIRI, item.newIRI);

            if (policy.projectSchema === item.oldIRI) {
                policy.projectSchema = item.newIRI
            }
        }

        for (const item of tokenMap) {
            replaceAllEntities(policy.config, ['tokenId'], item.oldTokenID, item.newTokenID);
            replaceAllVariables(policy.config, 'Token', item.oldTokenID, item.newTokenID);
        }

        for (const item of tools) {
            if (!item.newHash || !item.messageId) {
                continue;
            }
            replaceAllEntities(policy.config, ['messageId'], item.oldMessageId, item.messageId);
            replaceAllEntities(policy.config, ['hash'], item.oldHash, item.newHash);
        }

        // compatibility with older versions
        policy = PolicyConverterUtils.PolicyConverter(policy);
        policy.codeVersion = PolicyConverterUtils.VERSION;
        regenerateIds(policy.config);

        replaceArtifactProperties(policy.config, 'uuid', artifactsMap);
    }

    /**
     * Replace config
     * @param policy
     * @param schemasMap
     */
    public static async replaceFormulaConfig(
        formula: IFormula,
        schemasMapping: ImportSchemaMap[],
        toolsMapping: Map<string, string>,
    ) {
        for (const item of schemasMapping) {
            FormulaImportExport.replaceIds(formula.config, item.oldIRI, item.newIRI);
        }
        for (const [oldId, newId] of toolsMapping.entries()) {
            FormulaImportExport.replaceIds(formula.config, oldId, newId);
        }
    }

    /**
     * Convert errors to string
     * @param errors
     */
    public static errorsMessage(errors: ImportPolicyError[]): string {
        const schemas: string[] = [];
        const tools: string[] = [];
        const others: string[] = []
        for (const e of errors) {
            if (e.type === 'schema') {
                schemas.push(e.name);
            } else if (e.type === 'tool') {
                tools.push(e.name);
            } else {
                others.push(e.name);
            }
        }
        let message: string = 'Failed to import components:';
        if (schemas.length) {
            message += ` schemas: ${JSON.stringify(schemas)};`
        }
        if (tools.length) {
            message += ` tools: ${JSON.stringify(tools)};`
        }
        if (others.length) {
            message += ` others: ${JSON.stringify(others)};`
        }
        return message;
    }

    public static findTools(block: any, result: Set<string>) {
        if (!block) {
            return;
        }
        if (block.blockType === BlockType.Tool) {
            if (block.messageId && typeof block.messageId === 'string') {
                result.add(block.messageId);
            }
        } else {
            if (Array.isArray(block.children)) {
                for (const child of block.children) {
                    PolicyImportExportHelper.findTools(child, result);
                }
            }
        }
    }

    /**
     * Update policy components
     * @param policy
     * @param logger
     */
    public static async updatePolicyComponents(
        policy: Policy,
        logger: PinoLogger,
        userId: string
    ): Promise<Policy> {
        try {
            const raw = await PolicyLoader.load(policy.id.toString());
            const compareModel = await PolicyLoader.create(raw, HashComparator.options);
            const { hash, hashMap } = await HashComparator.createHashMap(compareModel);
            policy.hash = hash;
            policy.hashMap = hashMap;
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE, HASH'], userId);
        }
        const toolIds = new Set<string>()
        PolicyImportExportHelper.findTools(policy.config, toolIds);
        const tools = await DatabaseServer.getTools({
            status: { $in: [ModuleStatus.PUBLISHED, ModuleStatus.DRY_RUN]},
            messageId: { $in: Array.from(toolIds.values()) }
        }, { fields: ['name', 'version', 'topicId', 'messageId', 'tools'] });
        const list = [];
        for (const row of tools) {
            list.push({
                name: row.name,
                version: row.version,
                topicId: row.topicId,
                messageId: row.messageId
            })
            if (row.tools) {
                for (const subTool of row.tools) {
                    list.push(subTool);
                }
            }
        }
        policy.tools = list;
        policy = await DatabaseServer.updatePolicy(policy);

        return policy;
    }

    /**
     * Import policy by message
     * @param messageId
     * @param hederaAccount
     * @param notifier
     */
    public static async loadPolicyMessage(
        messageId: string,
        hederaAccount: IRootConfig,
        notifier: INotificationStep,
        userId: string | null
    ): Promise<IPolicyComponents> {
        notifier.start();
        const messageServer = new MessageServer({
            operatorId: hederaAccount.hederaAccountId,
            operatorKey: hederaAccount.hederaAccountKey,
            signOptions: hederaAccount.signOptions
        });
        const message = await messageServer
            .getMessage<PolicyMessage>({
                messageId,
                loadIPFS: true,
                userId,
                interception: null
            });
        if (message.type !== MessageType.InstancePolicy) {
            throw new Error('Invalid Message Type');
        }
        if (!message.document) {
            throw new Error('File in body is empty');
        }

        const policyToImport = await PolicyImportExport.parseZipFile(message.document, true);

        await importPolicyTags(policyToImport, messageId, message.policyTopicId, messageServer, userId);

        notifier.complete();

        return policyToImport;
    }
}
