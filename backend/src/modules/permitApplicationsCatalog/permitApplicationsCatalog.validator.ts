import Joi from 'joi';

export const createPermitApplicationSchema = Joi.object({
  city: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'City is required',
    'any.required': 'City is required',
  }),
  state: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'State is required',
    'any.required': 'State is required',
  }),
  applicationNames: Joi.array().items(Joi.string().trim().min(1)).min(0).required().messages({
    'array.base': 'Application names must be an array',
    'any.required': 'Application names is required',
  }),
});

export const updatePermitApplicationSchema = Joi.object({
  applicationNames: Joi.array().items(Joi.string().trim().min(1)).min(0).required().messages({
    'array.base': 'Application names must be an array',
    'any.required': 'Application names is required',
  }),
});

export const stateCityQuerySchema = Joi.object({
  state: Joi.string().trim().min(1).required().messages({
    'string.empty': 'State query is required',
    'any.required': 'State is required',
  }),
  city: Joi.string().trim().min(1).required().messages({
    'string.empty': 'City query is required',
    'any.required': 'City is required',
  }),
});
