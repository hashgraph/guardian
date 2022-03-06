import { UserRole } from "interfaces";

export interface IAuthUser {
    username: string;
    role: UserRole;
    did?: string;
    hederaAccountId?: string;
    walletToken?: string;
}

interface AdditionalFields {
    user: IAuthUser
}
