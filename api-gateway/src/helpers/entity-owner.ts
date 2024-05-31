import { IAuthUser } from '@guardian/common';
import { EntityOwner as Owner } from '@guardian/interfaces';
import { HttpException, HttpStatus } from '@nestjs/common';

export class EntityOwner extends Owner {
    constructor(user?: IAuthUser) {
        if (user && !user.did) {
            throw new HttpException('User is not registered.', HttpStatus.UNPROCESSABLE_ENTITY);
        }
        super(user);
    }
}