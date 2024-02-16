/**
 * Validation error object Structure
 */
import { NextFunction, Request, Response } from 'express';

/**
 * Validation error
 */
type ValidationError = string & { errors: string[] };

/**
 * Get validation errors
 * @param err
 */
const getValidationErrors = (err: ValidationError): string[] => {
  return err?.errors || [err];
};

/**
 * Prepare validation structure
 * @param err
 * @param type
 */
export const prepareValidationResponse = (err: any, type: string = 'ValidationError') => {
  return { type, message: getValidationErrors(err) };
};

/**
 * Valedate function
 * @param schema
 */
const validate = (schema: any) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.validate({
      body: req.body,
      query: req.query,
      params: req.params,
    }, { abortEarly: false });
    return next();
  } catch (err: any) {
    return res.status(422).json(prepareValidationResponse(err, err?.name));
  }
};

export default validate;
