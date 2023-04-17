import * as yup from 'yup';
import fieldsValidation from '../fields-validation'

export const schemaSchema = () => {
  const { messageId } = fieldsValidation
  return yup.object({
    body: yup.object({
      messageId
    }),
  });
}

export const systemEntitySchema = () => {
  const { name, entity } = fieldsValidation
  return yup.object({
    body: yup.object({
      name, entity
    }),
  });
}
