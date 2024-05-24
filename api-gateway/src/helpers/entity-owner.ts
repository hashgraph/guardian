import { IAuthUser } from '@guardian/common';
import { IOwner, Permissions, UserPermissions, UserRole } from '@guardian/interfaces';
import { HttpException, HttpStatus } from '@nestjs/common';

export class EntityOwner implements IOwner {
    public readonly parent: string;
    public readonly creator: string;
    public readonly owner: string;
    public readonly assigned: boolean;
    public readonly published: boolean;

    constructor(user?: IAuthUser) {
        if (user) {
            if (!user.did) {
                throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
            }
            this.parent = this.parent;
            if (user.role === UserRole.USER) {
                this.creator = user.did;
                this.owner = user.parent;
                this.assigned = UserPermissions.has(user, Permissions.ACCESS_POLICY_ASSIGNED);
                this.published = UserPermissions.has(user, Permissions.ACCESS_POLICY_PUBLISHED);
            } else if (user.role === UserRole.STANDARD_REGISTRY) {
                this.creator = user.did;
                this.owner = user.did;
                this.assigned = false;
                this.published = false;
            } else {
                this.creator = null;
                this.owner = null;
                this.assigned = true;
                this.published = true;
            }
        } else {
            this.creator = null;
            this.owner = null;
            this.assigned = true;
            this.published = true;
        }
    }

    public static sr(did: string): IOwner {
        return {
            creator: did,
            owner: did,
            assigned: false,
            published: false
        }
    }
}