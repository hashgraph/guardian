import * as yup from 'yup';

const validate = (schema) => async (req, res, next) => {
  try {
    await schema.validate({
      body: req.body,
      query: req.query,
      params: req.params,
    }, { abortEarly: false });
    return next();
  } catch (err) {
    return res.status(422).json({type: err.name, message: err.message});
  }
};

export default validate
