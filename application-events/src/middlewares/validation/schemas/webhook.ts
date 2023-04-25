import * as yup from 'yup';
import fieldsValidation from '../fields-validation'

export const storeWebhookSchema = () => {
  const { url, events } = fieldsValidation
  return yup.object({
    body: yup.object({
      url,
      events
    }),
  });
}

export const updateWebhookSchema = () => {
  const { url, events } = fieldsValidation
  events.nullable()
  url.nullable()
  return yup.object({
    body: yup.object({
      url,
      events
    }),
  });
}
