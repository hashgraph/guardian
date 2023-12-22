import { UserRole } from '@guardian/interfaces';

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
                routerLink: '/retirement'
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

export function getMenuItems(userRole: UserRole): NavbarMenuItem[] {
    switch (userRole) {
        case UserRole.STANDARD_REGISTRY:
        default: {
            return NAVBAR_MENU_STANDARD_REGISTRY;
        }
        case UserRole.USER: {
            return NAVBAR_MENU_USER;
        }
        case UserRole.AUDITOR: {
            return NAVBAR_MENU_AUDITOR;
        }
    }
}
