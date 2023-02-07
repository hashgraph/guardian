import * as yup from 'yup';
import { UserRole, SchemaEntity } from '@guardian/interfaces';

const fieldsValidation = {
  contractId: yup.string().required('The contractId field is required'),
  description: yup.string().required('The description field is required'),
  baseTokenId: yup.string().required('The requestId field is required'),
  oppositeTokenId: yup.string().required('The oppositeTokenId field is required'),
  baseTokenCount: yup.number().required('The baseTokenCount field is required'),
  oppositeTokenCount: yup.number().required('The oppositeTokenCount field is required'),
  baseTokenSerials: yup.array().of(yup.number())
    .min(1, 'The baseTokenSerials field must contains at least 1 item')
    .required('The baseTokenSerials field is required'),
  oppositeTokenSerials: yup.array().of(yup.number())
    .min(1, 'The oppositeTokenSerials field must contains at least 1 item')
    .required('The baseTokenSerials field is required'),
  requestId: yup.string().required('The requestId field is required'),
  name: yup.string().min(1, 'The name field can not be empty').required('The name field is required'),
  username: yup.string().min(1, 'The username field can not be empty').required('The username field is required'),
  entity: yup.mixed<SchemaEntity.STANDARD_REGISTRY | SchemaEntity.USER>()
    .oneOf([SchemaEntity.STANDARD_REGISTRY, SchemaEntity.USER]).required('The entity field is required'),
  password: yup.string().min(1, 'The password field can not be empty').required('The password field is required'),
  messageId: yup.string().required('Schema ID in body is required'),
  password_confirmation: yup.string().min(1, 'The password_confirmation field can not be empty')
    .required('The password_confirmation field is required')
    .oneOf([yup.ref('password'), null], 'Passwords must match'),
  role: yup.mixed<UserRole | 'ROOT_AUTHORITY'>().oneOf([...Object.values(UserRole), 'ROOT_AUTHORITY'])
    .required('The role field is required')
};

export default fieldsValidation;
