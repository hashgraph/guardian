import { ApiResponse } from '@api/helpers/api-response';
import {
    MessageResponse,
    MessageError,
    RunFunctionAsync,
    DatabaseServer,
    Logger,
} from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';
import { emptyNotifier, initNotifier } from '@helpers/notifier';
import { PolicyEngine } from '@policy-engine/policy-engine';
import {
    exportSchemas,
    importSchemaByFiles,
} from './helpers/schema-import-export-helper';
import { PolicyWizardHelper } from './helpers/policy-wizard-helper';

/**
 * Create existing policy schemas
 * @param config Config
 * @param owner Owner
 */
async function createExistingPolicySchemas(
    config: any,
    owner: string,
    policyTopicId?: string
) {
    const schemas = await DatabaseServer.getSchemas({ owner });
    const schemaIris = config.schemas.map((schema: any) => schema.iri);
    const schemasToCreate = schemas.filter(
        (schema) =>
            schemaIris.includes(schema.iri) &&
            (schema.topicId &&
            schema.topicId !== policyTopicId)
    );
    const schemaToCreateIris = schemasToCreate.map((schema) => schema.iri);
    const relationships = await exportSchemas(
        schemasToCreate.map((schema) => schema.id)
    );
    const importResult = await importSchemaByFiles(
        owner,
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
    ApiResponse(MessageAPI.WIZARD_POLICY_CREATE_ASYNC, async (msg) => {
        // tslint:disable-next-line:prefer-const
        let { config, owner, taskId } = msg;
        const notifier = initNotifier(taskId);
        RunFunctionAsync(
            async () => {
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
                    notifier
                );
                await policyEngine.setupPolicySchemas(
                    config.schemas.map(
                        (schema: any) => schema.iri
                    ),
                    policy.topicId,
                    owner
                );
                notifier.result({
                    policyId: policy.id,
                    wizardConfig: config,
                });
            },
            async (error) => {
                notifier.error(error);
            }
        );
        return new MessageResponse({ taskId });
    });

    ApiResponse(MessageAPI.WIZARD_POLICY_CREATE, async (msg) => {
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
                config.schemas.map(
                    (schema: any) => schema.iri
                ),
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

    ApiResponse(MessageAPI.WIZARD_GET_POLICY_CONFIG, async (msg) => {
        try {
            // tslint:disable-next-line:prefer-const
            let { policyId, config, owner } = msg;
            const policyEngine = new PolicyEngine();
            const wizardHelper = new PolicyWizardHelper();
            const policy = await DatabaseServer.getPolicy({
                owner,
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
                config.schemas.map(
                    (schema: any) => schema.iri
                ),
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
