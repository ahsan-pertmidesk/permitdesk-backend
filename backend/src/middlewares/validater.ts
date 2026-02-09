import { Request, Response, NextFunction, RequestHandler } from 'express';
import status from 'http-status';
import { ObjectSchema, Schema } from 'joi';

export const validate = (schema: Schema): any => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error } = schema.validate(req.body, { abortEarly: false });

      if (error) {  
        console.log('Validation failed');
        res.status(status.BAD_REQUEST).json({
          status: 'error',
          message: 'Validation failed',
          errors: error.details.map((detail) => detail.message),
          success: false,
        });
        return;
      }

      next();
    } catch (err) {
      console.error('Error in validation middleware:', err);
      res
        .status(status.INTERNAL_SERVER_ERROR)
        .json({ status: 'error', message: 'Internal Server Error' });
    }
  };
};

export const validateQueryParams = (schema: ObjectSchema): any => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      console.log('In validation');
      const { error } = schema.validate(req.query, { abortEarly: false });

      if (error) {
        console.log('Validation failed for query params');
        res.status(status.BAD_REQUEST).json({
          status: 'error',
          message: 'Validation failed for query params',
          errors: error.details.map((detail) => detail.message),
          success: false,
        });
        return;
      }

      console.log('Exiting Validation');
      next();
    } catch (err) {
      console.error('Error in validation middleware:', err);
      res
        .status(status.INTERNAL_SERVER_ERROR)
        .json({ status: 'error', message: 'Internal Server Error' });
    }
  };
};
