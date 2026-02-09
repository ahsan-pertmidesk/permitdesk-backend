import Joi from 'joi';

// Reusable email validation rule
const emailValidationRule = Joi.string()
  .email({ minDomainSegments: 2 })
  .required()
  .messages({
    'string.email': 'Email must be a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  });

// Reusable optional email validation rule
const optionalEmailValidationRule = Joi.string()
  .email({ minDomainSegments: 2 })
  .optional()
  .messages({
    'string.email': 'Email must be a valid email address',
  });

// Create Contact schema
export const createContactSchema = Joi.object({
  email: emailValidationRule,

  fullName: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name cannot exceed 100 characters',
    }),

  phoneNumber: Joi.string()
    .pattern(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Phone number must be a valid phone number format',
    }),

  message: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Message cannot exceed 2000 characters',
    }),
});

// Update Contact schema
export const updateContactSchema = Joi.object({
  email: optionalEmailValidationRule,

  fullName: Joi.string()
    .optional()
    .allow('')
    .messages({
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name cannot exceed 100 characters',
    }),

  phoneNumber: Joi.string()
    .pattern(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Phone number must be a valid phone number format',
    }),

  message: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Message cannot exceed 2000 characters',
    }),
});

