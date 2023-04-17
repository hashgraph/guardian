import * as yup from 'yup';
import fieldsValidation from '../fields-validation'

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
