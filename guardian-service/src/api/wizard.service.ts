import { ApiResponse } from '../api/helpers/api-response.js';
import { DatabaseServer, Logger, MessageError, MessageResponse, RunFunctionAsync, } from '@guardian/common';
import { IOwner, IWizardConfig, MessageAPI, SchemaCategory } from '@guardian/interfaces';
import { emptyNotifier, initNotifier } from '../helpers/notifier.js';
import { PolicyEngine } from '../policy-engine/policy-engine.js';
import { exportSchemas, importSchemaByFiles, } from './helpers/schema-import-export-helper.js';
import { PolicyWizardHelper } from './helpers/policy-wizard-helper.js';

/**
 * Create existing policy schemas
 * @param config Config
 * @param owner Owner
 */
async function createExistingPolicySchemas(
    config: IWizardConfig,
    user: IOwner,
    policyTopicId?: string
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
    const relationships = await exportSchemas(
        schemasToCreate.map((schema) => schema.id),
        user
    );
    const importResult = await importSchemaByFiles(
        SchemaCategory.POLICY,
        user,
        relationships,
        policyTopicId,
        emptyNotifier()
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
export async function wizardAPI(): Promise<void> {
    ApiResponse(MessageAPI.WIZARD_POLICY_CREATE_ASYNC,
        async (msg: { config: any, owner: IOwner, task: any, saveState: boolean }) => {
            // tslint:disable-next-line:prefer-const
            let { config, owner, task, saveState } = msg;
            const notifier = await initNotifier(task);
            RunFunctionAsync(
                async () => {
                    const policyEngine = new PolicyEngine();
                    const wizardHelper = new PolicyWizardHelper();
                    config = await createExistingPolicySchemas(config, owner);
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
                        notifier
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
                    notifier.error(error);
                }
            );
            return new MessageResponse(task);
        });

    ApiResponse(MessageAPI.WIZARD_POLICY_CREATE,
        async (msg: { config: any, owner: IOwner }) => {
            try {
                // tslint:disable-next-line:prefer-const
                let { config, owner } = msg;
                const policyEngine = new PolicyEngine();
                const wizardHelper = new PolicyWizardHelper();
                config = await createExistingPolicySchemas(config, owner);
                const policyConfig = wizardHelper.createPolicyConfig(config);
                const policy = await policyEngine.createPolicy(
                    Object.assign(config.policy, {
                        config: policyConfig,
                        policyRoles: config.roles.filter(
                            (role: string) => role !== 'OWNER'
                        ),
                    }),
                    owner,
                    emptyNotifier()
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
        async (msg: { policyId: string, config: any, owner: IOwner }) => {
            try {
                // tslint:disable-next-line:prefer-const
                let { policyId, config, owner } = msg;
                const policyEngine = new PolicyEngine();
                const wizardHelper = new PolicyWizardHelper();
                const policy = await DatabaseServer.getPolicy({
                    owner: owner.owner,
                    _id: policyId,
                });
                if (!policy) {
                    throw new Error(`Can not found policy with id: ${policyId}`);
                }
                config = await createExistingPolicySchemas(
                    config,
                    owner,
                    policy.topicId
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
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}
