import { UserPermissions, UserRole } from '@guardian/interfaces';

export interface NavbarMenuItem {
    title: string;
    childItems?: NavbarMenuItem[];
    /** Full icon class for the item, e.g. 'pi pi-wallet' or a custom mask icon
     * like 'icon-hbar'. Inherits currentColor. */
    icon?: string;
    /** Optional uppercase group label rendered above this item (vertical layout). */
    section?: string;
    routerLink?: string;
    active?: boolean;
    allowedUserRoles?: UserRole[];
}

const NAVBAR_MENU_STANDARD_REGISTRY: NavbarMenuItem[] = [
    {
        title: 'Manage',
        allowedUserRoles: [UserRole.STANDARD_REGISTRY],
        icon: 'pi pi-objects-column',
        section: 'Workspace',
        active: false,
        childItems: [
            {
                title: 'Policies',
                routerLink: '/policy-viewer'
            },
            {
                title: 'Schemas',
                routerLink: '/schemas'
            },
            {
                title: 'Schema Rules',
                routerLink: '/schema-rules'
            },
            {
                title: 'Schema Templates',
                routerLink: '/schema-templates'
            },
            {
                title: 'Artifacts',
                routerLink: '/artifacts'
            },
            {
                title: 'Tools',
                routerLink: '/tools'
            },
            {
                title: 'Modules',
                routerLink: '/modules'
            },
            {
                title: 'Formulas',
                routerLink: '/formulas'
            },
        ],
    },
    {
        title: 'Hedera',
        icon: 'icon-hbar',
        allowedUserRoles: [UserRole.STANDARD_REGISTRY],
        active: false,
        childItems: [
            {
                title: 'Tokens',
                routerLink: '/tokens'
            },
            {
                title: 'Contracts',
                routerLink: '/contracts'
            },
            {
                title: 'Relayer Accounts',
                routerLink: '/relayer-accounts'
            },
        ],
    },
    {
        title: 'Administration',
        allowedUserRoles: [UserRole.STANDARD_REGISTRY],
        active: false,
        icon: 'pi pi-sliders-h',
        section: 'Administration',
        childItems: [
            {
                title: 'Roles',
                routerLink: '/roles'
            },
            {
                title: 'User Management',
                routerLink: '/user-management'
            },
            {
                title: 'Remote Policy Requests',
                routerLink: '/external-policies'
            },
            {
                title: 'Services Status',
                routerLink: '/admin/status'
            },
            {
                title: 'Worker Tasks',
                routerLink: '/worker-tasks'
            },
            {
                title: 'Logs',
                routerLink: '/admin/logs'
            },
            {
                title: 'Application Branding',
                routerLink: '/branding'
            },
            {
                title: 'Settings',
                routerLink: '/admin/settings'
            },
        ],
    },
];

const NAVBAR_MENU_AUDITOR: NavbarMenuItem[] = [
    {
        title: 'Audit',
        allowedUserRoles: [UserRole.AUDITOR],
        active: false,
        icon: 'pi pi-shield',
        routerLink: '/audit'
    },
    {
        title: 'Trust Chain',
        icon: 'pi pi-sitemap',
        allowedUserRoles: [UserRole.AUDITOR],
        active: false,
        routerLink: '/trust-chain'
    },
];

function customMenu(user: UserPermissions): NavbarMenuItem[] {
    const menu: NavbarMenuItem[] = [];
    if (
        user.SCHEMAS_SCHEMA_READ ||
        user.SCHEMAS_SYSTEM_SCHEMA_READ ||
        user.ARTIFACTS_FILE_READ ||
        user.MODULES_MODULE_READ ||
        user.POLICIES_POLICY_READ ||
        user.POLICIES_POLICY_EXECUTE ||
        user.POLICIES_POLICY_MANAGE ||
        user.TOOLS_TOOL_READ ||
        // without this a template-only role opens no Manage section at all, so gating
        // the item below on TEMPLATES_TEMPLATE_READ would hide it from the very users
        // who can use it
        user.TEMPLATES_TEMPLATE_READ
    ) {
        const childItems: any = [];
        const canReadPolicies = user.POLICIES_POLICY_READ ||
            user.POLICIES_POLICY_EXECUTE ||
            user.POLICIES_POLICY_MANAGE;
        if (canReadPolicies) {
            if (
                user.POLICIES_POLICY_CREATE ||
                user.POLICIES_POLICY_UPDATE ||
                user.POLICIES_POLICY_DELETE ||
                user.POLICIES_POLICY_REVIEW ||
                user.POLICIES_POLICY_MANAGE
            ) {
                childItems.push({
                    title: 'Policies',
                    routerLink: '/policy-viewer'
                });
            } else {
                childItems.push({
                    title: 'Search for Policies',
                    routerLink: '/policy-search'
                });
                childItems.push({
                    title: 'List of Policies',
                    routerLink: '/policy-viewer'
                });
            }
        }
        if (
            user.SCHEMAS_SCHEMA_READ ||
            user.SCHEMAS_SYSTEM_SCHEMA_READ
        ) {
            childItems.push({
                title: 'Schemas',
                routerLink: '/schemas'
            });
        }
        if (canReadPolicies && user.SCHEMAS_RULE_READ) {
            childItems.push({
                title: 'Schema Rules',
                routerLink: '/schema-rules'
            });
        }
        // gated on the permission the ROUTE requires, not on schema-read
        if (user.TEMPLATES_TEMPLATE_READ) {
            childItems.push({
                title: 'Schema Templates',
                routerLink: '/schema-templates'
            });
        }
        if (user.ARTIFACTS_FILE_READ) {
            childItems.push({
                title: 'Artifacts',
                routerLink: '/artifacts'
            });
        }
        if (user.TOOLS_TOOL_READ) {
            childItems.push({
                title: 'Tools',
                routerLink: '/tools'
            });
        }
        if (user.MODULES_MODULE_READ) {
            childItems.push({
                title: 'Modules',
                routerLink: '/modules'
            });
        }
        if (canReadPolicies && user.FORMULAS_FORMULA_READ) {
            childItems.push({
                title: 'Formulas',
                routerLink: '/formulas'
            });
        }
        if (canReadPolicies && user.STATISTICS_STATISTIC_READ) {
            childItems.push({
                title: 'Statistics',
                routerLink: '/policy-statistics'
            });
        }
        if (canReadPolicies && user.STATISTICS_LABEL_READ) {
            childItems.push({
                title: 'Policy Labels',
                routerLink: '/policy-labels'
            });
        }
        menu.push({
            title: 'Manage',
            allowedUserRoles: [UserRole.STANDARD_REGISTRY],
            icon: 'pi pi-objects-column',
            section: 'Workspace',
            active: false,
            childItems
        });
    }

    if (
        user.TOKENS_TOKEN_READ ||
        user.CONTRACTS_CONTRACT_READ
    ) {
        const childItems: any = [];
        if (user.TOKENS_TOKEN_READ) {
            if (user.TOKENS_TOKEN_EXECUTE) {
                childItems.push({
                    title: 'List of Tokens',
                    routerLink: '/tokens-user'
                });
            }
            if (
                !user.TOKENS_TOKEN_EXECUTE ||
                user.TOKENS_TOKEN_CREATE ||
                user.TOKENS_TOKEN_UPDATE ||
                user.TOKENS_TOKEN_DELETE ||
                user.TOKENS_TOKEN_MANAGE
            ) {
                childItems.push({
                    title: 'Tokens',
                    routerLink: '/tokens'
                });
            }

        }
        if (user.CONTRACTS_CONTRACT_READ) {
            if (
                user.CONTRACTS_CONTRACT_EXECUTE
            ) {
                childItems.push({
                    title: 'Retirement',
                    routerLink: '/retirement-user'
                });
            }
            if (
                user.CONTRACTS_CONTRACT_MANAGE
            ) {
                childItems.push({
                    title: 'Contracts',
                    routerLink: '/contracts'
                });
            }
        }
        menu.push({
            title: 'Hedera',
            icon: 'icon-hbar',
            allowedUserRoles: [UserRole.STANDARD_REGISTRY],
            active: false,
            childItems
        });
    }

    if (
        user.DELEGATION_ROLE_MANAGE ||
        user.PERMISSIONS_ROLE_MANAGE ||
        user.PERMISSIONS_ROLE_CREATE ||
        user.PERMISSIONS_ROLE_UPDATE ||
        user.PERMISSIONS_ROLE_DELETE ||
        user.SETTINGS_SETTINGS_READ ||
        user.POLICIES_EXTERNAL_POLICY_READ ||
        user.LOG_LOG_READ
    ) {
        const childItems: any = [];
        if (
            user.PERMISSIONS_ROLE_CREATE ||
            user.PERMISSIONS_ROLE_UPDATE ||
            user.PERMISSIONS_ROLE_DELETE
        ) {
            childItems.push({
                title: 'Roles',
                routerLink: '/roles'
            });
        }

        if (
            user.DELEGATION_ROLE_MANAGE ||
            user.PERMISSIONS_ROLE_MANAGE
        ) {
            childItems.push({
                title: 'User Management',
                routerLink: '/user-management'
            });
        }

        if (user.POLICIES_EXTERNAL_POLICY_READ) {
            childItems.push({
                title: 'Remote Policy Requests',
                routerLink: '/external-policies'
            });
        }
        if (user.WORKER_TASKS_READ) {
            childItems.push({
                title: 'Worker Tasks',
                routerLink: '/worker-tasks'
            });
        }
        if (user.LOG_LOG_READ) {
            childItems.push({
                title: 'Logs',
                routerLink: '/admin/logs'
            });
        }
        if (user.BRANDING_CONFIG_UPDATE) {
            childItems.push({
                title: 'Application Branding',
                routerLink: '/branding'
            });
        }
        if (user.SETTINGS_SETTINGS_READ) {
            childItems.push({
                title: 'Settings',
                routerLink: '/admin/settings'
            });
        }
        menu.push({
            title: 'Administration',
            allowedUserRoles: [UserRole.STANDARD_REGISTRY],
            active: false,
            icon: 'pi pi-sliders-h',
            section: 'Administration',
            childItems
        });
    }

    return menu;
}

export function getMenuItems(user: UserPermissions): NavbarMenuItem[] {
    if (!user) {
        return [];
    }

    if (user.AUDITOR) {
        return NAVBAR_MENU_AUDITOR;
    }

    if (user.STANDARD_REGISTRY) {
        return NAVBAR_MENU_STANDARD_REGISTRY;
    }

    return customMenu(user);
}
