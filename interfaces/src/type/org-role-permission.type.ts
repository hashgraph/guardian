/**
 * Permissions a role within an Organization grants when acting on behalf of that org.
 * Distinct from the system-wide `Permissions` enum (which gates the management API).
 */
export enum OrgRolePermission {
    TOKEN_MINTING    = 'TOKEN_MINTING',
    TOKEN_RETIREMENT = 'TOKEN_RETIREMENT',
    TOKEN_TRANSFER   = 'TOKEN_TRANSFER',
}
