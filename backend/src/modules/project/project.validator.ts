import Joi from 'joi';

/** Password: required only, no format/length rules */
const passwordRequired = Joi.string().trim().required().messages({
  'string.empty': 'Password is required',
  'any.required': 'Password is required',
});

export const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required',
  }),
  platformName: Joi.string().trim().max(255).optional().allow('').default(''),
  email: Joi.string()
    .email({ minDomainSegments: 2 })
    .trim()
    .required()
    .messages({
      'string.email': 'Email must be a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),
  password: passwordRequired,
  state: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'State is required',
    'any.required': 'State is required',
  }),
  city: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'City is required',
    'any.required': 'City is required',
  }),
});

const emailValidationRule = Joi.string()
  .email({ minDomainSegments: 2 })
  .trim()
  .messages({
    'string.email': 'Email must be a valid email address',
  });

/** Edit project: name required; platformName, email and password optional */
export const updateProjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required',
  }),
  platformName: Joi.string().trim().max(255).optional().allow(''),
  email: emailValidationRule.optional(),
  password: Joi.string().trim().optional(),
});

const projectApplicationStatuses = ['not_started', 'in_progress', 'under_review', 'approved', 'failed'];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 9;

/** List projects query: search, date range, status filter, pagination (limit default 9) */
export const listProjectsQuerySchema = Joi.object({
  search: Joi.string().trim().max(255).optional().allow(''),
  dateFrom: Joi.date().iso().optional().messages({
    'date.format': 'dateFrom must be a valid ISO date (e.g. YYYY-MM-DD)',
  }),
  dateTo: Joi.date().iso().optional().messages({
    'date.format': 'dateTo must be a valid ISO date (e.g. YYYY-MM-DD)',
  }),
  status: Joi.string()
    .valid(...projectApplicationStatuses)
    .optional()
    .messages({
      'any.only': `status must be one of: ${projectApplicationStatuses.join(', ')}`,
    }),
  page: Joi.number().integer().min(1).optional().default(DEFAULT_PAGE),
  limit: Joi.number().integer().min(1).max(100).optional().default(DEFAULT_LIMIT),
});

export const LIST_PROJECTS_DEFAULT_LIMIT = DEFAULT_LIMIT;
