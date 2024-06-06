import { ApiResponse } from '../api/helpers/api-response.js';
import {
    DatabaseServer,
    Logger,
    MessageError,
    MessageResponse,
    Policy,
    VcDocument,
    VcDocumentDefinition
} from '@guardian/common';
import { MessageAPI, Schema, SchemaField } from '@guardian/interfaces';

export const CompanyNameField = 'AccountableImpactOrganization.name';
export const SectoralScopeField = 'ActivityImpactModule.projectScope';
export const ProjectTitleField = 'ActivityImpactModule.name';

function extractFieldValue(field: SchemaField, document: VcDocument) {
    const vc = VcDocumentDefinition.fromJsonTree(document.document);
    return vc.getField(field?.path);
}

export async function getProjectSchema(iri: string, schemas: Map<string, any>): Promise<any> {
    if (schemas.has(iri)) {
        return schemas.get(iri);
    } else {
        const schema = await new DatabaseServer().getSchemaByIRI(iri);
        if (schema) {
            const fieldCompanyName = (new Schema(schema)).searchFields((f) => f.title === CompanyNameField);
            const fieldSectoralScope = (new Schema(schema)).searchFields((f) => f.title === SectoralScopeField);
            const fieldTitle = (new Schema(schema)).searchFields((f) => f.title === ProjectTitleField);
            schemas.set(iri, {
                fieldCompanyName,
                fieldSectoralScope,
                fieldTitle
            });
        } else {
            schemas.set(iri, {});
        }
        return schemas.get(iri);
    }
}

export async function getProjectsData(documents: VcDocument[], allPolicies: Policy[]) {
    const foundProjects = [];

    const schemas: Map<string, any> = new Map<string, any>();
    for (const document of documents) {
        const policyName = allPolicies.find((policy: Policy) => policy.id === document.policyId)?.name ?? '';

        const project: any = {
            id: document.id,
            policyId: document.policyId,
            registered: document.createDate,
            policyName
        };
        const {
            fieldCompanyName,
            fieldSectoralScope,
            fieldTitle
        } = await getProjectSchema(document.schema, schemas);

        if (fieldCompanyName && fieldCompanyName.length) {
            project.companyName = extractFieldValue(fieldCompanyName[0], document)
        }

        if (fieldSectoralScope && fieldSectoralScope.length) {
            project.sectoralScope = extractFieldValue(fieldSectoralScope[0], document)
        }

        if (fieldTitle && fieldTitle.length) {
            project.title = extractFieldValue(fieldTitle[0], document)
        }

        foundProjects.push(project);
    }

    return foundProjects;
}

/**
 * Connect to the message broker methods of working with projects.
 */
export async function projectsAPI(): Promise<void> {
    ApiResponse(MessageAPI.SEARCH_PROJECTS,
        async (msg: { categoryIds: string[], policyIds: string[] }) => {
            try {
                const { categoryIds, policyIds } = msg;

                if (!categoryIds?.length && !policyIds?.length) {
                    return new MessageResponse([]);
                }

                let policies: Policy[] = [];
                if (categoryIds?.length) {
                    policies = await DatabaseServer.getFilteredPolicies(categoryIds, '');
                }

                const fetchedPolicies = await DatabaseServer.getPolicies({
                    id: { $in: msg.policyIds },
                    status: { $eq: 'PUBLISH' }
                });
                const allPolicies = policies.concat(fetchedPolicies);

                const resultSchemas: Set<string> = new Set<string>();
                for (const policy of allPolicies) {
                    if (policy.projectSchema) {
                        resultSchemas.add(policy.projectSchema);
                    }
                }

                const documents: VcDocument[] = await DatabaseServer.getVCs({
                    policyId: { $in: allPolicies.map((policy: Policy) => policy.id) },
                    schema: { $in: Array.from(resultSchemas) },
                    messageId: { $exists: true, $ne: null }
                });

                const documentIds: Set<string> = new Set<string>();
                for (const vc of documents) {
                    documentIds.add(vc.messageId);
                }
                const filteredDocuments = documents.filter(vc => {
                    if (!vc.relationships) {
                        return true;
                    }
                    for (const messageId of vc.relationships) {
                        if (documentIds.has(messageId)) {
                            return false;
                        }
                    }
                    return true;
                })

                const projects = await getProjectsData(filteredDocuments, allPolicies);

                return new MessageResponse(projects);
            } catch (error) {
                new Logger().error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_POLICY_CATEGORIES, async () => {
        try {
            const policyCategories = await DatabaseServer.getPolicyCategories();
            return new MessageResponse(policyCategories);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.GET_POLICY_PROPERTIES, async () => {
        try {
            const policyProperties = await DatabaseServer.getPolicyProperties();
            return new MessageResponse(policyProperties);
        } catch (error) {
            console.log(error);
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
