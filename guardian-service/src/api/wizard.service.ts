import { ApiResponse } from '../api/helpers/api-response.js';
import { DatabaseServer, MessageError, MessageResponse, NewNotifier, PinoLogger, Policy, RunFunctionAsync } from '@guardian/common';
import { IOwner, IWizardConfig, MessageAPI, SchemaCategory } from '@guardian/interfaces';
import { PolicyEngine } from '../policy-engine/policy-engine.js';
import { PolicyWizardHelper } from './helpers/policy-wizard-helper.js';
import { FilterObject } from '@mikro-orm/core';
import { SchemaImportExportHelper } from '../helpers/import-helpers/index.js'

/**
 * Create existing policy schemas
 * @param config Config
 * @param owner Owner
 */
async function createExistingPolicySchemas(
    config: IWizardConfig,
    user: IOwner,
    policyTopicId: string | null,
    userId: string | null
) {
    const schemas = await DatabaseServer.getSchemas({ owner: user.owner });
    const schemaIris = config.schemas.map((schema: any) => schema.iri);
    const schemasToCreate = schemas.filter(
        (schema) =>
            schemaIris.includes(schema.iri) &&
            schema.topicId !== 'draft' &&
            schema.topicId !== policyTopicId
    );
    const schemaToCreateIris = schemasToCreate.map((schema) => schema.iri);
    const relationships = await SchemaImportExportHelper.exportSchemas(
        schemasToCreate.map((schema) => schema.id)
    );
    const importResult = await SchemaImportExportHelper.importSchemaByFiles(
        relationships,
        user,
        {
            category: SchemaCategory.POLICY,
            topicId: policyTopicId || 'draft'
        },
        NewNotifier.empty(),
        userId
    );
    const schemasMap = importResult.schemasMap;
    for (const schema of config.schemas) {
        if (schemaToCreateIris.includes(schema.iri)) {
            const schemaMap = schemasMap.find(
                (item) => item.oldIRI === schema.iri
            );
            schema.iri = schemaMap.newIRI;
        }
        if (schemaToCreateIris.includes(schema.dependencySchemaIri)) {
            const schemaMap = schemasMap.find(
                (item) => item.oldIRI === schema.dependencySchemaIri
            );
            schema.dependencySchemaIri = schemaMap.newIRI;
        }
        if (schemaToCreateIris.includes(schema.relationshipsSchemaIri)) {
            const schemaMap = schemasMap.find(
                (item) => item.oldIRI === schema.relationshipsSchemaIri
            );
            schema.relationshipsSchemaIri = schemaMap.newIRI;
        }
    }
    for (const trustChainConfig of config.trustChain) {
        if (schemaToCreateIris.includes(trustChainConfig.mintSchemaIri)) {
            const schemaMap = schemasMap.find(
                (item) => item.oldIRI === trustChainConfig.mintSchemaIri
            );
            trustChainConfig.mintSchemaIri = schemaMap.newIRI;
        }
    }
    return config;
}

/**
 * Connect to the message broker methods of working with wizard.
 */
export async function wizardAPI(logger: PinoLogger): Promise<void> {
    ApiResponse(MessageAPI.WIZARD_POLICY_CREATE_ASYNC,
        async (msg: {
            config: any,
            owner: IOwner,
            task: any,
            saveState: boolean
        }) => {
            // tslint:disable-next-line:prefer-const
            let { config, owner, task, saveState } = msg;
            const notifier = await NewNotifier.create(task);
            RunFunctionAsync(
                async () => {
                    const policyEngine = new PolicyEngine(logger);
                    const wizardHelper = new PolicyWizardHelper();
                    config = await createExistingPolicySchemas(config, owner, null, owner.id);
                    const categories = [];
                    for (const elem of [
                        config.policy.projectScale,
                        config.policy.migrationActivityType,
                        config.policy.subType,
                        config.policy.appliedTechnologyType,
                        config.policy.sectoralScope
                    ]) {
                        if (Array.isArray(elem)) {
                            for (const _el of elem) {
                                categories.push(_el)
                            }
                        } else if (elem !== undefined) {
                            categories.push(elem);
                        }
                    }
                    const policyConfig = wizardHelper.createPolicyConfig(config);
                    const policy = await policyEngine.createPolicy(
                        Object.assign(config.policy, {
                            config: policyConfig,
                            policyRoles: config.roles.filter(
                                (role: string) => role !== 'OWNER'
                            ),
                            categories
                        }),
                        owner,
                        notifier,
                        logger
                    );
                    await policyEngine.setupPolicySchemas(
                        config.schemas.map((schema: any) => schema.iri),
                        policy.topicId,
                        owner
                    );
                    notifier.result({
                        policyId: policy.id,
                        wizardConfig: config,
                        saveState,
                    });
                },
                async (error) => {
                    notifier.fail(error);
                }
            );
            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.WIZARD_POLICY_CREATE,
        async (msg: {
            config: any,
            owner: IOwner
        }) => {
            try {
                // tslint:disable-next-line:prefer-const
                let { config, owner } = msg;
                const policyEngine = new PolicyEngine(logger);
                const wizardHelper = new PolicyWizardHelper();
                config = await createExistingPolicySchemas(config, owner, null, owner.id);
                const policyConfig = wizardHelper.createPolicyConfig(config);
                const policy = await policyEngine.createPolicy(
                    Object.assign(config.policy, {
                        config: policyConfig,
                        policyRoles: config.roles.filter(
                            (role: string) => role !== 'OWNER'
                        ),
                    }),
                    owner,
                    NewNotifier.empty(),
                    logger
                );
                await policyEngine.setupPolicySchemas(
                    config.schemas.map((schema: any) => schema.iri),
                    policy.topicId,
                    owner
                );
                return new MessageResponse({
                    policyId: policy.id,
                    wizardConfig: config,
                });
            } catch (error) {
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.WIZARD_GET_POLICY_CONFIG,
        async (msg: {
            policyId: string,
            config: any,
            owner: IOwner
        }) => {
            try {
                // tslint:disable-next-line:prefer-const
                let { policyId, config, owner } = msg;
                const policyEngine = new PolicyEngine(logger);
                const wizardHelper = new PolicyWizardHelper();
                const policy = await DatabaseServer.getPolicy({
                    owner: owner.owner,
                    _id: policyId,
                } as FilterObject<Policy>);
                if (!policy) {
                    throw new Error(`Can not found policy with id: ${policyId}`);
                }
                config = await createExistingPolicySchemas(
                    config,
                    owner,
                    policy.topicId,
                    owner.id
                );
                const policyConfig = wizardHelper.createPolicyConfig(config);
                await policyEngine.setupPolicySchemas(
                    config.schemas.map((schema: any) => schema.iri),
                    policy.topicId,
                    owner
                );
                return new MessageResponse({
                    policyConfig,
                    wizardConfig: config,
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.owner?.id);
                return new MessageError(error);
            }
        });
}
