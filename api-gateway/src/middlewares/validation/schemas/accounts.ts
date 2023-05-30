import * as yup from 'yup';
import fieldsValidation from '../fields-validation'
import { IsNotEmpty } from 'class-validator';
import { UserRole } from '@guardian/interfaces';

export class LoginUserDTO {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;
}

export class RegisterUserDTO {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  // tslint:disable-next-line:variable-name
  password_confirmation: string;

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
