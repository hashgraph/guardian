/**
 * Permissions a role within an Organization grants when acting on behalf of that org.
 * Distinct from the system-wide `Permissions` enum (which gates the management API).
 */
export enum OrgRolePermission {
    TOKEN_MINTING     = 'TOKEN_MINTING',
    TOKEN_RETIREMENT  = 'TOKEN_RETIREMENT',
    TOKEN_TRANSFER    = 'TOKEN_TRANSFER',
    TOKEN_ASSOCIATE   = 'TOKEN_ASSOCIATE',
    TOKEN_DISSOCIATE  = 'TOKEN_DISSOCIATE',
    /**
     * Org self-management: enroll/remove/re-role NON-admin members of the member's own
     * organization. Granting/revoking MEMBER_MANAGE itself is always SR-only.
     */
    MEMBER_MANAGE     = 'MEMBER_MANAGE',
}

/**
 * Subset of `OrgRolePermission` that gates token operations. Kept distinct from the
 * full enum so exhaustive `Record<OrgTokenPermission, ...>` maps (e.g. the token-guard
 * error table) don't need an entry for management-only values like `MEMBER_MANAGE`.
 */
export type OrgTokenPermission =
    | OrgRolePermission.TOKEN_MINTING
    | OrgRolePermission.TOKEN_RETIREMENT
    | OrgRolePermission.TOKEN_TRANSFER
    | OrgRolePermission.TOKEN_ASSOCIATE
    | OrgRolePermission.TOKEN_DISSOCIATE;
