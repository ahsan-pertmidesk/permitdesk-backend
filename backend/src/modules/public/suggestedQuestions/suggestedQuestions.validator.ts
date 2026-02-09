import Joi from 'joi';

// Create FAQ schema
export const createSuggestedQuestionsSchema = Joi.object({
  question: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Question is required',
      'string.min': 'Question must be at least 1 character long',
      'string.max': 'Question cannot exceed 500 characters',
      'any.required': 'Question is required',
    }),
});



