import * as yup from 'yup';

const fieldsValidation = {
  events: yup.array().of(yup.string().required('String is required')),
  url: yup.string().url().required()
};

export default fieldsValidation;
