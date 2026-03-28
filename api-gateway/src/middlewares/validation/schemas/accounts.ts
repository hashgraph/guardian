import * as yup from 'yup';
import fieldsValidation from '../fields-validation.js'
import { Examples, ObjectExamples } from '../examples.js';
import {
    IsArray,
    IsBoolean,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString
} from 'class-validator';
import { UserRole } from '@guardian/interfaces';
import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '../../../helpers/decorators/match.validator.js';

export class PermissionGroupResponseDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.UUID
    })
    @IsString()
    uuid: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    roleId: string;

    @ApiProperty({
        type: String,
        required: true,
        example: 'Default policy user'
    })
    @IsString()
    roleName: string;

    @ApiProperty({
        type: String,
        nullable: true,
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    owner: string | null;
}

export class AccountsResponseDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    id: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.USER_NAME_SR_1
    })
    @IsString()
    @Expose()
    username: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.ROLE_SR
    })
    @IsString()
    @Expose()
    role: string;

    @ApiProperty({
        type: String,
        isArray: true,
        required: false,
        example: ObjectExamples.PERMISSION_SR
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    permissions?: string[];

    @ApiProperty({
        type: [PermissionGroupResponseDTO],
        required: false
    })
    @IsArray()
    @Type(() => PermissionGroupResponseDTO)
    @IsOptional()
    permissionsGroup?: PermissionGroupResponseDTO[];

    @ApiProperty({
        type: String,
        required: false,
        example: 'local'
    })
    @IsString()
    @IsOptional()
    location?: string;
}

export class AccountsLoginResponseDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.USER_NAME_SR_1
    })
    @IsString()
    @Expose()
    username: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.DID
    })
    @IsString()
    did: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.ROLE_SR
    })
    @IsString()
    @Expose()
    role: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.REFRESH_TOKEN
    })
    @IsString()
    refreshToken: string;

    @ApiProperty({
        type: Boolean,
        required: false,
        example: false
    })
    @IsBoolean()
    @IsOptional()
    weakPassword?: boolean;
}

export class AccountsSessionResponseDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.DB_ID
    })
    @IsString()
    @Expose()
    id: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.USER_NAME_SR_1
    })
    @IsString()
    @Expose()
    username: string;

    @ApiProperty({
        type: String,
        required: false,
        example: Examples.DID
    })
    @IsString()
    @IsOptional()
    did: string;

    @ApiProperty({
        type: String,
        required: false,
        example: Examples.ACCOUNT_ID
    })
    @IsString()
    @IsOptional()
    hederaAccountId?: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.ROLE_SR
    })
    @IsString()
    @Expose()
    role: string;

    @ApiProperty({
        type: String,
        isArray: true,
        example: ObjectExamples.PERMISSION_SR
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    permissions: string[];

    @ApiProperty({
        type: [PermissionGroupResponseDTO],
        required: false
    })
    @IsArray()
    @Type(() => PermissionGroupResponseDTO)
    @IsOptional()
    permissionsGroup?: PermissionGroupResponseDTO[];

    @ApiProperty({
        type: String,
        required: false,
        example: 'local'
    })
    @IsString()
    location?: string;
}

export class LoginSuccessResponseDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.DID
    })
    @IsString()
    did: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.REFRESH_TOKEN
    })
    @IsString()
    refreshToken: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.ROLE_SR
    })
    @IsString()
    role: string

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.USER_NAME_SR_1
    })
    @IsString()
    username: string

    @ApiProperty({
        type: String,
        required: true,
        example: false
    })
    @IsString()
    weakPassword: string
}

export class LoginOTPRequiredResponseDTO {
    @ApiProperty({
        type: Boolean,
        required: true,
        example: false
    })
    @IsBoolean()
    success: boolean;

    @ApiProperty({
        type: Boolean,
        required: true,
        example: true
    })
    @IsBoolean()
    otprequired: boolean;
}
export class ChangePasswordDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.USER_NAME_SR_1
    })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({
        type: String,
        required: true,
        example: 'test'
    })
    @IsString()
    @IsNotEmpty()
    oldPassword: string;

    @ApiProperty({
        type: String,
        required: true,
        example: 'AnotherStrongPassword3#'
    })
    @IsString()
    @IsNotEmpty()
    newPassword: string;
}

export class LoginUserDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.USER_NAME_SR_1
    })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({
        type: String,
        required: true,
        example: 'test'
    })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    otp: string;
}

export class RegisterUserDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: 'NewStandardRegistry'
    })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({
        type: String,
        required: true,
        example: 'StrongPassword3#'
    })
    @IsString()
    @IsNotEmpty()
    password: string;

    @Match('password', {
        message: 'Passwords must match'
    })
    @ApiProperty({
        type: String,
        required: true,
        example: 'StrongPassword3#'
    })
    @IsString()
    @IsNotEmpty()
    // tslint:disable-next-line:variable-name
    password_confirmation: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.ROLE_SR
    })
    @IsString()
    @IsNotEmpty()
    @IsIn(Object.values(UserRole))
    role: UserRole;
}

export class UserAccountDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: 'Installer'
    })
    @IsString()
    username: string;

    @ApiProperty({
        type: String,
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    parent?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: Examples.DID_2
    })
    @IsOptional()
    @IsString()
    did?: string;
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

export class StandardRegistryAccountDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.USER_NAME_SR_1
    })
    @IsString()
    username: string;

    @ApiProperty({
        type: String,
        required: false,
        example: Examples.DID
    })
    @IsOptional()
    @IsString()
    did?: string;
}

export class AccessTokenRequestDTO {
    @ApiProperty({
        description: 'Refresh token',
        example: Examples.REFRESH_TOKEN
    })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

export class AccessTokenResponseDTO {
    @ApiProperty({
        description: 'Access token',
        example: Examples.ACCESS_TOKEN
    })
    accessToken: string;
}

export class BalanceResponseDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: '833.88244301 ℏ'
    })
    @IsString()
    balance: string;

    @ApiProperty({
        type: String,
        required: true,
        example: 'HBar'
    })
    unit: string;

    @ApiProperty({
        type: StandardRegistryAccountDTO,
        required: true
    })
    user: StandardRegistryAccountDTO;
}

export class OTPConfigDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.OTP_ALGO
    })
    @IsString()
    algo: string;

    @ApiProperty({
        type: Number,
        required: true,
        example: Examples.NUMBER
    })
    @IsNumber()
    digits: number;

    @ApiProperty({
        type: Number,
        required: true,
        example: Examples.NUMBER
    })
    @IsNumber()
    period: number;

    @ApiProperty({
        type: Number,
        required: true,
        example: Examples.NUMBER
    })
    @IsNumber()
    secretSize: number;
}

export class GenerateOPTResponseDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.OTP_NAME
    })
    @IsString()
    issuer: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.USER_NAME_SR_1
    })
    @IsString()
    user: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.OTP_SECRET
    })
    @IsString()
    secret: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.OTP_AUTH_URL
    })
    @IsString()
    url: string;

    @ApiProperty({
        type: OTPConfigDTO,
        required: true,
    })
    @Type(() => OTPConfigDTO)
    config: OTPConfigDTO;
}

export class OTPConfirmDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.OTP_CODE
    })
    @IsString()
    token: string;
}

export class OTPConfirmResponseDTO {
    @ApiProperty({
        type: Boolean,
        required: true,
        example: true
    })
    @IsBoolean()
    success: boolean;

    @ApiProperty({
        type: String,
        required: true,
        isArray: true,
        example: ['000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999']
    })
    @IsArray()
    @IsString({ each: true })
    backupCodes: string[];
}

export class OTPStatusResponseDTO {
    @ApiProperty({
        type: Boolean,
        required: true,
        example: true
    })
    @IsBoolean()
    enabled: boolean;
}

export class EmptyResponseDTO {
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
