export enum UserRole {
    ROOT_AUTHORITY = 'ROOT_AUTHORITY',
    USER = 'USER',
    AUDITOR = 'AUDITOR'
}

export type PolicyRole = 'NO_ROLE' | 'OWNER' | 'ANY_ROLE' | 'ROOT_AUTHORITY' | string;
