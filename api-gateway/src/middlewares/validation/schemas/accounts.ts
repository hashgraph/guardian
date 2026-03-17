import * as yup from 'yup';
import fieldsValidation from '../fields-validation.js'
import { IsIn, IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { UserRole } from '@guardian/interfaces';
import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '../../../helpers/decorators/match.validator.js';
import { Examples } from '../../../middlewares/validation/examples.js';

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
    did?: string
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

export class ChangePasswordDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    oldPassword: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    newPassword: string;
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

    @ApiProperty()
    @IsString()
    @IsOptional()
    otp: string;
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
    role: UserRole;
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

class UserAccountDTO {
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
    user: UserAccountDTO;
}

export class OTPConfigDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.OTPAlgo
    })
    @IsString()
    algo: string;

    @ApiProperty({
        type: Number,
        required: true,
        example: Examples.Number
    })
    @IsNumber()
    digits: number;

    @ApiProperty({
        type: Number,
        required: true,
        example: Examples.Number
    })
    @IsNumber()
    period: number;

    @ApiProperty({
        type: Number,
        required: true,
        example: Examples.Number
    })
    @IsNumber()
    secretSize: number;
}

export class GenerateOPTResponseDTO {
    @ApiProperty({
        type: String,
        required: true,
        example: Examples.OTPName
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
        example: Examples.OTPSecret
    })
    @IsString()
    secret: string;

    @ApiProperty({
        type: String,
        required: true,
        example: Examples.OTPAuthURL
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
        example: Examples.OTPCode
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
