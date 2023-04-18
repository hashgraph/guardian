/**
 * Validation error object Structure
 */
// tslint:disable-next-line:completed-docs
type ValidationError = string & { errors: string[] }

/**
 * Get validation errors
 * @param err
 */
const getValidationErrors = (err: ValidationError): string[] => {
  return err?.errors || [err]
}

/**
 * Prepare validation structure
 * @param err
 * @param type
 */
export const prepareValidationResponse = (err, type: string = 'ValidationError') => {
  return { type, message: getValidationErrors(err) };
}

/**
 * Valedate function
 * @param schema
 */
const validate = (schema) => async (req, res, next) => {
  try {
    await schema.validate({
      body: req.body,
      query: req.query,
      params: req.params,
    }, { abortEarly: false });
    return next();
  } catch (err) {
    return res.status(422).json(prepareValidationResponse(err, err.name));
  }
};

export default validate
