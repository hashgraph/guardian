export enum UserRole {
    ROOT_AUTHORITY = 'ROOT_AUTHORITY',
    INSTALLER = 'INSTALLER',
    AUDITOR = 'AUDITOR',
    ORIGINATOR = 'ORIGINATOR'
}

export type PolicyRole = 'NO_ROLE' | 'OWNER' | 'ANY_ROLE' | 'ROOT_AUTHORITY' | string;
