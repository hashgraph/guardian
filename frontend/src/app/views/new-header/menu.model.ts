import { UserPermissions, UserRole } from '@guardian/interfaces';

export interface NavbarMenuItem {
    title: string;
    childItems?: NavbarMenuItem[];
    iconUrl?: string;
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
                title: 'Schemas',
                routerLink: '/schemas'
            },
            {
                title: 'Artifacts',
                routerLink: '/artifacts'
            },
            {
                title: 'Modules',
                routerLink: '/modules'
            },
            {
                title: 'Policies',
                routerLink: '/policy-viewer'
            },
            {
                title: 'Tools',
                routerLink: '/tools'
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
                title: 'Tokens',
                routerLink: '/tokens'
            },
            {
                title: 'Retirement',
                routerLink: '/contracts'
            },
        ],
    },
    {
        title: 'Administration',
        allowedUserRoles: [UserRole.STANDARD_REGISTRY],
        active: false,
        iconUrl: 'stars',
        childItems: [
            {
                title: 'Roles',
                routerLink: '/roles'
            },
            {
                title: 'Users',
                routerLink: '/users'
            },
            {
                title: 'Settings',
                routerLink: '/admin/settings'
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

const NAVBAR_MENU_USER: NavbarMenuItem[] = [
    {
        title: 'Policies',
        allowedUserRoles: [UserRole.USER],
        active: false,
        iconUrl: 'table',
        childItems: [
            {
                title: 'Search for Policies',
                routerLink: '/policy-search'
            },
            {
                title: 'List of Policies',
                routerLink: '/policy-viewer'
            },
        ],
    },
    {
        title: 'Tokens',
        iconUrl: 'twoRings',
        allowedUserRoles: [UserRole.USER],
        active: false,
        childItems: [
            {
                title: 'List of Tokens',
                routerLink: '/tokens-user'
            },
            {
                title: 'Retirement',
                routerLink: '/retirement-user'
            },
        ]
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
        user.TOOLS_TOOL_READ
    ) {
        const childItems: any = [];
        if (
            user.SCHEMAS_SCHEMA_READ ||
            user.SCHEMAS_SYSTEM_SCHEMA_READ
        ) {
            childItems.push({
                title: 'Schemas',
                routerLink: '/schemas'
            });
        }
        if (user.ARTIFACTS_FILE_READ) {
            childItems.push({
                title: 'Artifacts',
                routerLink: '/artifacts'
            });
        }
        if (user.MODULES_MODULE_READ) {
            childItems.push({
                title: 'Modules',
                routerLink: '/modules'
            });
        }
        if (user.POLICIES_POLICY_READ) {
            childItems.push({
                title: 'Policies',
                routerLink: '/policy-viewer'
            });
        }
        if (user.TOOLS_TOOL_READ) {
            childItems.push({
                title: 'Tools',
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
            childItems.push({
                title: 'Tokens',
                routerLink: '/tokens'
            });
        }
        if (user.CONTRACTS_CONTRACT_READ) {
            childItems.push({
                title: 'Retirement',
                routerLink: '/contracts'
            });
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
        user.SETTINGS_SETTINGS_READ ||
        user.LOG_LOG_READ
    ) {
        const childItems: any = [];
        if (user.SETTINGS_SETTINGS_READ) {
            childItems.push({
                title: 'Settings',
                routerLink: '/admin/settings'
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

    if (user.USER) {
        return NAVBAR_MENU_USER;
    }

    if (user.STANDARD_REGISTRY) {
        return NAVBAR_MENU_STANDARD_REGISTRY;
    }

    return customMenu(user);
}
