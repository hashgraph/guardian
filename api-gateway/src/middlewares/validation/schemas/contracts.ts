import * as yup from 'yup';
import fieldsValidation from '../fields-validation'

export const retireSchema = () => {
  const { requestId } = fieldsValidation
  return yup.object({
    body: yup.object({
      requestId
    }),
  });
}

export const importSchema = () => {
  const { contractId, description } = fieldsValidation
  return yup.object({
    body: yup.object({
      contractId, description
    }),
  });
}

export const retireRequestSchema = () => {
  const {
    baseTokenId,
    oppositeTokenId,
    baseTokenCount,
    oppositeTokenCount,
    baseTokenSerials,
    oppositeTokenSerials
  } = fieldsValidation
  return yup.object({
    body: yup.object({
      baseTokenId,
      oppositeTokenId,
      baseTokenCount,
      oppositeTokenCount,
      baseTokenSerials,
      oppositeTokenSerials
    }),
  });
}
