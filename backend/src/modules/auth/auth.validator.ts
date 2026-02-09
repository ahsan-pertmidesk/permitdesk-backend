import Joi from 'joi';

// Reusable strong password rule
const passwordValidationRule = Joi.string()
  .min(8)
  .max(30)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password cannot exceed 30 characters',
    'string.pattern.base':
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  });
// Reusable email validation rule
const emailValidationRule = Joi.string()
  .email({ minDomainSegments: 2 })
  .required()
  .messages({
    'string.email': 'Email must be a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  });


// Register schema
export const registerSchema = Joi.object({
  email: emailValidationRule,

  password: passwordValidationRule,

  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()   
    .messages({
      'any.only': 'Passwords and confirm password do not match',
      'string.empty': 'Confirm password is required',
      'any.required': 'Confirm password is required',
    }),

  userName: Joi.string()
    .allow('')
    .optional()
    .messages({
      'string.empty': 'User name is required',
      'string.min': 'User name must be at least 2 characters long',
      'string.max': 'User name cannot exceed 50 characters',
      'any.required': 'User name is required',
    }),



  accessToken: Joi.array().items(Joi.string()).default([]).messages({
    'array.base': 'Access tokens must be an array of strings',
  }),

  refreshToken: Joi.array().items(Joi.string()).default([]).messages({
    'array.base': 'Refresh tokens must be an array of strings',
  }),
  hubSpotContactId: Joi.string()
  .optional()
  .messages({
    'string.base': 'HubSpot contact ID must be a string',
    'string.empty': 'HubSpot contact ID cannot be empty',
  }),

});

export const loginSchema = Joi.object({
  email: emailValidationRule,
  password: passwordValidationRule,
  fcmToken: Joi.string().optional(),
});



export const sendOtpSchema = Joi.object({
  email: emailValidationRule,
});

export const verifyOtpSchema = Joi.object({
  email: emailValidationRule,
  otp: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'OTP must be a 6-digit number',
      'string.empty': 'OTP is required',
      'any.required': 'OTP is required',
    }),
});

export const reSetPasswordSchema = Joi.object({
  email: emailValidationRule,
  password: passwordValidationRule,
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()   
    .messages({
      'any.only': 'Passwords and confirm password do not match',
      'string.empty': 'Confirm password is required',
      'any.required': 'Confirm password is required',
    }),
});