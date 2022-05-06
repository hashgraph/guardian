import { IAuthUser } from "@auth/auth.interface";

export interface PolicyEvent<T> {
    type: string; // Event Type;
    target: string; // Block Tag;
    policyId: string; // Policy Id;
    targetId: string; // Block Id;
    user?: IAuthUser;
    data?: T;
}