import * as yup from 'yup';
import fieldsValidation from '../fields-validation.js'
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '@guardian/interfaces';
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '../../../helpers/decorators/match.validator.js';

export class AccountsResponseDTO {
    @ApiProperty()
    @IsString()
    @Expose()
    username: string;

    @ApiProperty()
    @IsString()
    @Expose()
    role: string;

    @ApiProperty()
    @IsString()
    @Expose()
    did: string
}

export class AccountsSessionResponseDTO {
    @ApiProperty()
    @IsString()
    @Expose()
    username: string;

    @ApiProperty()
    @IsString()
    @Expose()
    role: string;

    @ApiProperty()
    @IsString()
    @Expose()
    accessToken: string
}

export class LoginUserDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string;
}

export class RegisterUserDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string;

    @Match('password', {
        message: 'Passwords must match'
    })
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    // tslint:disable-next-line:variable-name
    password_confirmation: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @IsIn(Object.values(UserRole))
    role: UserRole | string
}

export class CredentialSubjectDTO {
    @ApiProperty()
    geography: string;

    @ApiProperty()
    law: string;

    @ApiProperty()
    tags: string;

    @ApiProperty()
    ISIC: string;

    @ApiProperty()
    '@context': string[];

    @ApiProperty()
    id: string;

    @ApiProperty()
    type: string;
}

export class ProofDTO {
    @ApiProperty()
    type: string;

    @ApiProperty()
    created: Date;

    @ApiProperty()
    verificationMethod: string;

    @ApiProperty()
    proofPurpose: string;

    @ApiProperty()
    jws: string;
}

export class VcDocumentDTO {
    @ApiProperty()
    id: string;

    @ApiProperty()
    type: string[];

    @ApiProperty()
    issuer: string;

    @ApiProperty()
    issuanceDate: Date;

    @ApiProperty()
    '@context': string[]

    @ApiProperty()
    credentialSubject: CredentialSubjectDTO;

    @ApiProperty()
    proof: ProofDTO;
}

export class PolicyDTO {
    @ApiProperty()
    _id: string;

    @ApiProperty()
    createDate: Date;

    @ApiProperty()
    uuid: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    status: string;

    @ApiProperty()
    creator: string;

    @ApiProperty()
    owner: string;

    @ApiProperty()
    topicId: string;

    @ApiProperty()
    policyTag: string;

    @ApiProperty()
    codeVersion: string;

    @ApiProperty()
    userRoles: string[];

    @ApiProperty()
    userGroups: Object[];

    @ApiProperty()
    userRole: string;

    @ApiProperty()
    userGroup: string;

    @ApiProperty()
    id: string;
}

export class AggregatedDTOItem {
    @ApiProperty()
    did: string;

    @ApiProperty()
    hederaAccountId: string;

    @ApiProperty()
    vcDocument: VcDocumentDTO;

    @ApiProperty()
    policies: PolicyDTO;
}

export type AggregatedDTO = AggregatedDTOItem[]

export class UserDTO {
    @ApiProperty()
    username: string;

    @ApiProperty()
    did: string;
}

export class BalanceResponseDTO {
    @ApiProperty()
    balance: number;

    @ApiProperty()
    unit: string;

    @ApiProperty()
    user: UserDTO;
}

export const registerSchema = () => {
    const { username, password, password_confirmation, role } = fieldsValidation
    return yup.object({
        body: yup.object({
            username, password, password_confirmation, role
        }),
    });
}

export const loginSchema = () => {
    const { username, password } = fieldsValidation
    return yup.object({
        body: yup.object({
            username, password
        }),
    });
}
