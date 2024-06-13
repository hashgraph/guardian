import { User } from '@entity/user';
import { IUser } from '@guardian/interfaces';

export function getRequiredProps(user: User, requiredProps: Record<string, string>): IUser {
    const userRequiredProps: IUser = {}
    for (const prop of Object.values(requiredProps)) {
        userRequiredProps[prop] = user[prop];
    }
    return userRequiredProps;
}