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

/** Edit project: name required; email and password optional */
export const updateProjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required',
  }),
  email: emailValidationRule.optional(),
  password: Joi.string().trim().optional(),
});

export const projectApplicationStatuses = ['not_started', 'in_progress', 'under_review', 'approved', 'failed'] as const;

const dateFilterPresets = ['today', 'last_7_days', 'last_30_days'] as const;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 9;

/** List projects query: search, dateFilter preset, multi-select status, pagination (limit default 9) */
export const listProjectsQuerySchema = Joi.object({
  search: Joi.string().trim().max(255).optional().allow(''),
  dateFilter: Joi.string()
    .valid(...dateFilterPresets)
    .optional()
    .messages({
      'any.only': `dateFilter must be one of: ${dateFilterPresets.join(', ')}`,
    }),
  status: Joi.alternatives()
    .try(
      Joi.string().valid(...projectApplicationStatuses),
      Joi.string().custom((value: string) => {
        const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
        const invalid = parts.filter((p) => !projectApplicationStatuses.includes(p as any));
        if (invalid.length > 0) throw new Error(`Invalid status: ${invalid.join(', ')}. Must be one of: ${projectApplicationStatuses.join(', ')}`);
        return value;
      }),
      Joi.array().items(Joi.string().valid(...projectApplicationStatuses)).min(1)
    )
    .optional()
    .messages({
      'any.only': `Each status must be one of: ${projectApplicationStatuses.join(', ')}`,
    }),
  page: Joi.number().integer().min(1).optional().default(DEFAULT_PAGE),
  limit: Joi.number().integer().min(1).max(100).optional().default(DEFAULT_LIMIT),
});

export const LIST_PROJECTS_DEFAULT_LIMIT = DEFAULT_LIMIT;
