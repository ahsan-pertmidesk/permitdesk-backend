import Joi from 'joi';

// Create Conversation schema with userId (optional)
export const editConversationTitle = Joi.object({
  title: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title cannot exceed 500 characters',
      'any.required': 'Title is required',
    }),

});

// Create Conversation schema without userId (explicitly no userId)
export const createConversationWithoutUserIdSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 1 character long',
      'string.max': 'Title cannot exceed 500 characters',
      'any.required': 'Title is required',
    }),
  clientId: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.empty': 'Client ID is required',
      'any.required': 'Client ID is required',
    }),
});

