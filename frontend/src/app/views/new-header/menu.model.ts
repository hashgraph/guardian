import { UserPermissions, UserRole } from '@guardian/interfaces';

export interface NavbarMenuItem {
    title: string;
    childItems?: NavbarMenuItem[];
    iconUrl?: string;
    svgIcon?: string;
    routerLink?: string;
    active?: boolean;
    allowedUserRoles?: UserRole[];
}

const NAVBAR_MENU_STANDARD_REGISTRY: NavbarMenuItem[] = [
    {
        title: 'Policies',
        allowedUserRoles: [UserRole.STANDARD_REGISTRY],
        iconUrl: 'table',
        active: false,
        childItems: [
            {
                title: 'Manage Schemas',
                routerLink: '/schemas'
            },
            {
                title: 'Manage Artifacts',
                routerLink: '/artifacts'
            },
            {
                title: 'Manage Modules',
                routerLink: '/modules'
            },
            {
                title: 'Manage Policies',
                routerLink: '/policy-viewer'
            },
            {
                title: 'Manage Tools',
                routerLink: '/tools'
            },
            {
                title: 'Manage Formulas',
                routerLink: '/formulas'
            },
            {
                title: 'Manage Schema Rules',
                routerLink: '/schema-rules'
            },
            {
                title: 'Remote Policies',
                routerLink: '/external-policies'
            },
        ],
    },
    {
        title: 'Tokens',
        iconUrl: 'twoRings',
        allowedUserRoles: [UserRole.STANDARD_REGISTRY],
        active: false,
        childItems: [
            {
                title: 'Manage Tokens',
                routerLink: '/tokens'
            },
            {
                title: 'Manage Contracts',
                routerLink: '/contracts'
            },
        ],
    },
    {
        title: 'Relayer Accounts',
        svgIcon: 'wallet',
        allowedUserRoles: [UserRole.STANDARD_REGISTRY],
        active: false,
        routerLink: '/relayer-accounts'
    },
    {
        title: 'Administration',
        allowedUserRoles: [UserRole.STANDARD_REGISTRY],
        active: false,
        iconUrl: 'stars',
        childItems: [
            {
                title: 'Manage Roles',
                routerLink: '/roles'
            },
            {
                title: 'User Management',
                routerLink: '/user-management'
            },
            {
                title: 'Settings',
                routerLink: '/admin/settings'
            },
            {
                title: 'Application Branding',
                routerLink: '/branding'
            },
            {
                title: 'Logs',
                routerLink: '/admin/logs'
            },
            {
                title: 'Status',
                routerLink: '/admin/status'
            },
            {
                title: 'About',
                routerLink: '/admin/about'
            },
        ],
    },
];

const NAVBAR_MENU_AUDITOR: NavbarMenuItem[] = [
    {
        title: 'Audit',
        allowedUserRoles: [UserRole.AUDITOR],
        active: false,
        iconUrl: 'guard',
        routerLink: '/audit'
    },
    {
        title: 'Trust Chain',
        iconUrl: 'twoRings',
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
        user.TOOLS_TOOL_READ
    ) {
        const childItems: any = [];
        if (user.POLICIES_POLICY_READ ||
            user.POLICIES_POLICY_EXECUTE ||
            user.POLICIES_POLICY_MANAGE
        ) {
            if (
                user.POLICIES_POLICY_CREATE ||
                user.POLICIES_POLICY_UPDATE ||
                user.POLICIES_POLICY_DELETE ||
                user.POLICIES_POLICY_REVIEW ||
                user.POLICIES_POLICY_MANAGE
            ) {
                childItems.push({
                    title: 'Manage Policies',
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
            if (user.STATISTICS_STATISTIC_READ) {
                childItems.push({
                    title: 'Statistics',
                    routerLink: '/policy-statistics'
                });
            }
            if (user.SCHEMAS_RULE_READ) {
                childItems.push({
                    title: 'Schema Rules',
                    routerLink: '/schema-rules'
                });
            }
            if (user.STATISTICS_LABEL_READ) {
                childItems.push({
                    title: 'Policy Labels',
                    routerLink: '/policy-labels'
                });
            }
            if (user.FORMULAS_FORMULA_READ) {
                childItems.push({
                    title: 'Formulas',
                    routerLink: '/formulas'
                });
            }
            if (user.POLICIES_EXTERNAL_POLICY_READ) {
                childItems.push({
                    title: 'Remote Policies',
                    routerLink: '/external-policies'
                });
            }
        }
        if (
            user.SCHEMAS_SCHEMA_READ ||
            user.SCHEMAS_SYSTEM_SCHEMA_READ
        ) {
            childItems.push({
                title: 'Manage Schemas',
                routerLink: '/schemas'
            });
        }
        if (user.ARTIFACTS_FILE_READ) {
            childItems.push({
                title: 'Manage Artifacts',
                routerLink: '/artifacts'
            });
        }
        if (user.MODULES_MODULE_READ) {
            childItems.push({
                title: 'Manage Modules',
                routerLink: '/modules'
            });
        }
        if (user.TOOLS_TOOL_READ) {
            childItems.push({
                title: 'Manage Tools',
                routerLink: '/tools'
            });
        }
        menu.push({
            title: 'Policies',
            allowedUserRoles: [UserRole.STANDARD_REGISTRY],
            iconUrl: 'table',
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
                    title: 'Manage Tokens',
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
                    title: 'Manage Contracts',
                    routerLink: '/contracts'
                });
            }
        }
        menu.push({
            title: 'Tokens',
            iconUrl: 'twoRings',
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
        user.LOG_LOG_READ
    ) {
        const childItems: any = [];
        if (
            user.PERMISSIONS_ROLE_CREATE ||
            user.PERMISSIONS_ROLE_UPDATE ||
            user.PERMISSIONS_ROLE_DELETE
        ) {
            childItems.push({
                title: 'Manage Roles',
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

        if (user.SETTINGS_SETTINGS_READ) {
            childItems.push({
                title: 'Settings',
                routerLink: '/admin/settings'
            });
        }
        if (user.BRANDING_CONFIG_UPDATE) {
            childItems.push({
                title: 'Application Branding',
                routerLink: '/branding'
            });
        }
        if (user.LOG_LOG_READ) {
            childItems.push({
                title: 'Logs',
                routerLink: '/admin/logs'
            });
        }
        menu.push({
            title: 'Administration',
            allowedUserRoles: [UserRole.STANDARD_REGISTRY],
            active: false,
            iconUrl: 'stars',
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
