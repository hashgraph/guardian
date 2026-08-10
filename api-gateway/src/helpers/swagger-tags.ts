import { OpenAPIObject } from '@nestjs/swagger';

interface SwaggerTag {
    name: string;
    description?: string;
    'x-page-title'?: string;
    'x-page-description'?: string;
    'x-page-icon'?: string;
    'x-parent'?: string;
}

interface ScalarTag {
    name: string;
    description?: string;
    'x-displayName'?: string;
    parent?: string;
}

interface ScalarTagGroup {
    name: string;
    tags: string[];
}

const swaggerTags: SwaggerTag[] = [
    // --- Guardian Schemas (pure container) ---
    {
        name: 'guardian-schemas',
        'x-page-title': 'Guardian Schemas',
        'x-page-icon': 'table',
    },
    {
        name: 'schemas',
        'x-parent': 'guardian-schemas',
        'x-page-title': 'Schemas',
        'x-page-description': 'Create and manage JSON schemas for policy data structures.',
    },
    {
        name: 'schema',
        'x-parent': 'guardian-schemas',
        'x-page-title': 'Schema',
        'x-page-description': 'Schema operations on individual schema objects.',
    },
    {
        name: 'schema-rules',
        'x-parent': 'guardian-schemas',
        'x-page-title': 'Schema Rules',
        'x-page-description': 'Validation rules and constraints applied to schema fields.',
    },

    // --- Guardian Policies (pure container) ---
    {
        name: 'guardian-policies',
        'x-page-title': 'Guardian Policies',
        'x-page-icon': 'scroll',
    },
    {
        name: 'policies',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Policies',
        'x-page-description': 'Create, publish, and manage environmental policy workflows.',
    },
    {
        name: 'record',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Records',
        'x-page-description': 'Environmental data records submitted through policy workflows.',
    },
    {
        name: 'tools',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Tools',
        'x-page-description': 'Standalone tools that extend policy workflow capabilities.',
    },
    {
        name: 'modules',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Modules',
        'x-page-description': 'Reusable policy logic modules that can be composed into workflows.',
    },
    {
        name: 'formulas',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Formulas',
        'x-page-description': 'Calculation formulas for quantifying environmental impact.',
    },
    {
        name: 'artifacts',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Artifacts',
        'x-page-description': 'Files and documents attached to policies and policy blocks.',
    },
    {
        name: 'policy-labels',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Labels',
        'x-page-description': 'Labels for categorizing and filtering policies.',
    },
    {
        name: 'policy-comments',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Comments',
        'x-page-description': 'Threaded comments and review notes on policies.',
    },
    {
        name: 'policy-repository',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Repository',
        'x-page-description': 'Policy marketplace for discovering and importing published policies.',
    },
    {
        name: 'suggestions',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Suggestions',
        'x-page-description': 'Context-aware suggestions for policy design and configuration.',
    },
    {
        name: 'analytics',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Analytics',
        'x-page-description': 'Query and export usage analytics across the platform.',
    },
    {
        name: 'policy-statistics',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Statistics',
        'x-page-description': 'Usage and execution statistics for policies.',
    },
    {
        name: 'external-policies',
        'x-parent': 'guardian-policies',
        'x-page-title': 'External Policies',
        'x-page-description': 'Integration with externally hosted or managed policies.',
    },
    {
        name: 'wizard',
        'x-parent': 'guardian-policies',
        'x-page-title': 'Wizard',
        'x-page-description': 'Step-by-step guided policy creation workflow.',
    },

    // --- Hedera Tokens (pure container) ---
    {
        name: 'hedera-tokens',
        'x-page-title': 'Hedera',
        'x-page-icon': 'coins',
    },
    {
        name: 'tokens',
        'x-parent': 'hedera-tokens',
        'x-page-title': 'Tokens',
        'x-page-description': 'Manage Hedera tokens representing environmental assets and carbon credits.',
    },
    {
        name: 'contracts',
        'x-parent': 'hedera-tokens',
        'x-page-title': 'Contracts',
        'x-page-description': 'Smart contract interactions for token issuance and retirement.',
    },
    {
        name: 'relayer-accounts',
        'x-parent': 'hedera-tokens',
        'x-page-title': 'Relayer Accounts',
        'x-page-description': 'Hedera relayer account configuration and management.',
    },

    // --- Data & MRV ---
    {
        name: 'data',
        'x-page-title': 'Data & DMRV',
        'x-page-icon': 'leaf',
    },
    {
        name: 'dmrv',
        'x-parent': 'data',
        'x-page-title': 'DMRV',
        'x-page-description': 'Digital Measurement, Reporting and Verification data operations.',
    },
    {
        name: 'ipfs',
        'x-parent': 'data',
        'x-page-title': 'IPFS',
        'x-page-description': 'Decentralized file storage via the InterPlanetary File System.',
    },
    {
        name: 'external',
        'x-parent': 'data',
        'x-page-title': 'External',
        'x-page-description': 'Integration with external data sources and third-party systems.',
    },
    {
        name: 'projects',
        'x-parent': 'data',
        'x-page-title': 'Projects',
        'x-page-description': 'Environmental projects generating verified carbon or ecological credits.',
    },
    {
        name: 'map',
        'x-parent': 'data',
        'x-page-title': 'Map',
        'x-page-description': 'Geospatial data and map visualization for project locations.',
    },

    // --- Identity & Access ---
    {
        name: 'identity',
        'x-page-title': 'Identity & Access',
        'x-page-icon': 'shield-halved',
    },
    {
        name: 'accounts',
        'x-parent': 'identity',
        'x-page-title': 'Accounts',
        'x-page-description': 'Manage user accounts and authentication sessions.',
    },
    {
        name: 'profiles',
        'x-parent': 'identity',
        'x-page-title': 'Profiles',
        'x-page-description': 'User profile configuration and DID management.',
    },
    {
        name: 'permissions',
        'x-parent': 'identity',
        'x-page-title': 'Permissions',
        'x-page-description': 'Role-based access control and permission management.',
    },
    {
        name: 'credentials',
        'x-parent': 'identity',
        'x-page-title': 'Credentials',
        'x-page-description': 'W3C Verifiable Credentials issued and managed within policies.',
    },
    {
        name: 'trust-chains',
        'x-parent': 'identity',
        'x-page-title': 'Trust Chains',
        'x-page-description': 'Chains of verifiable trust linking issuers, verifiers, and holders.',
    },

    // --- Platform ---
    {
        name: 'platform',
        'x-page-title': 'Platform',
        'x-page-icon': 'server',
    },
    {
        name: 'settings',
        'x-parent': 'platform',
        'x-page-title': 'Settings',
        'x-page-description': 'Global application configuration and environment settings.',
    },
    {
        name: 'notifications',
        'x-parent': 'platform',
        'x-page-title': 'Notifications',
        'x-page-description': 'User notifications and alert management.',
    },
    {
        name: 'tags',
        'x-parent': 'platform',
        'x-page-title': 'Tags',
        'x-page-description': 'User-defined tags for organizing platform resources.',
    },
    {
        name: 'logs',
        'x-parent': 'platform',
        'x-page-title': 'Logs',
        'x-page-description': 'Audit logs recording user and system activity.',
    },
    {
        name: 'tasks',
        'x-parent': 'platform',
        'x-page-title': 'Tasks',
        'x-page-description': 'Background task tracking for long-running operations.',
    },
    {
        name: 'worker-tasks',
        'x-parent': 'platform',
        'x-page-title': 'Worker Tasks',
        'x-page-description': 'Worker-level task queue management.',
    },
    {
        name: 'metrics',
        'x-parent': 'platform',
        'x-page-title': 'Metrics',
        'x-page-description': 'Real-time performance and operational metrics.',
    },
    {
        name: 'ai-suggestions',
        'x-parent': 'platform',
        'x-page-title': 'AI Suggestions',
        'x-page-description': 'AI-powered recommendations for policies, schemas, and workflows.',
    },
    {
        name: 'demo',
        'x-parent': 'platform',
        'x-page-title': 'Demo',
        'x-page-description': 'Demo data and sample environment setup.',
    },

    // --- Customization ---
    {
        name: 'customization',
        'x-page-title': 'Customization',
        'x-page-icon': 'palette',
    },
    {
        name: 'themes',
        'x-parent': 'customization',
        'x-page-title': 'Themes',
        'x-page-description': 'UI theme selection and customization.',
    },
    {
        name: 'branding',
        'x-parent': 'customization',
        'x-page-title': 'Branding',
        'x-page-description': 'White-label branding assets and configuration.',
    },
];

/**
 * Attaches Scalar-ready tag metadata to an OpenAPI document, derived from the
 * curated {@link swaggerTags} hierarchy (`x-parent` / `x-page-*` extensions):
 *  - `document.tags`: the leaf tags actually attached to operations, each with a
 *    display-friendly `x-displayName` and its description.
 *  - `document['x-tagGroups']`: one group per top-level container, listing its
 *    child tags in declaration order.
 *
 * Container tags carry no operations, so they only surface as group headers.
 * Owning the attachment here keeps the OpenAPI extension keys and the required
 * cast in one place instead of leaking them into service bootstrap code.
 */
export function applyScalarTagMetadata(document: OpenAPIObject): void {
    const groups = new Map<string, ScalarTagGroup>();
    const tags: ScalarTag[] = [];

    // Register containers (tags without a parent) as groups and real tags, preserving order.
    for (const tag of swaggerTags) {
        if (!tag['x-parent']) {
            groups.set(tag.name, { name: tag['x-page-title'] ?? tag.name, tags: [] });
            tags.push({
                name: tag.name,
                'x-displayName': tag['x-page-title'],
            });
        }
    }

    // Expose each leaf tag as a real tag and assign it to its parent group.
    for (const tag of swaggerTags) {
        const parent = tag['x-parent'];
        if (!parent) {
            continue;
        }
        groups.get(parent)?.tags.push(tag.name);
        tags.push({
            name: tag.name,
            description: tag['x-page-description'],
            'x-displayName': tag['x-page-title'],
            parent,
        });
    }

    // Drop empty groups (containers that ended up without any children).
    const xTagGroups = [...groups.values()].filter((group) => group.tags.length > 0);

    const target = document as OpenAPIObject & {
        tags?: ScalarTag[];
        'x-tagGroups'?: ScalarTagGroup[];
    };
    target.tags = tags;
    target['x-tagGroups'] = xTagGroups;
}
