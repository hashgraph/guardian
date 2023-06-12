import * as yup from 'yup';
import fieldsValidation from '../fields-validation'
import { IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '@guardian/interfaces';
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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
  @IsNotEmpty()
  username: string;

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

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
      // tslint:disable-next-line:variable-name
  password_confirmation: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  role: UserRole | string
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
