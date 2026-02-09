import Joi from 'joi';

// Create Question schema


export const createQuestionSchema = Joi.object({
  conversationId: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      "string.uuid": "Conversation ID must be a valid UUID"
    }),

  question: Joi.string()
    .min(1)
    .max(5000)
    .required()
    .messages({
      "string.empty": "Question is required",
      "string.min": "Question must be at least 1 character long",
      "string.max": "Question cannot exceed 5000 characters",
      "any.required": "Question is required"
    }),

  fileUrl: Joi.array()
    .items(
      Joi.object({
        fileName: Joi.string().required().messages({
          "string.empty": "File name is required"
        }),

        fileType: Joi.string()
          .valid("videos", "audios", "documents", "images")
          .required()
          .messages({
            "any.only": "File type must be one of videos, audios, documents, images",
            "string.empty": "File type is required"
          }),

        fileExtension: Joi.string().required().messages({
          "string.empty": "File extension is required"
        }),

        fileUrl: Joi.string().required().messages({
          "string.empty": "File URL is required"
        })
      })
    )
    .optional()
    .messages({
      "array.base": "fileUrl must be an array of file objects"
    })
});



// Update Question schema
export const updateQuestionSchema = Joi.object({  
  question: Joi.string()
    .min(1)
    .max(5000)
    .required()
    .messages({
      'string.empty': 'Question is required',
      'string.min': 'Question must be at least 1 character long',
      'string.max': 'Question cannot exceed 5000 characters',
      'any.required': 'Question is required',
    }),
  
  fileUrl: Joi.array()
    .items(
      Joi.object({
        fileName: Joi.string().required().messages({
          "string.empty": "File name is required"
        }),

        fileType: Joi.string()
          .valid("videos", "audios", "documents", "images")
          .required()
          .messages({
            "any.only": "File type must be one of videos, audios, documents, images",
            "string.empty": "File type is required"
          }),

        fileExtension: Joi.string().required().messages({
          "string.empty": "File extension is required"
        }),

        fileUrl: Joi.string().required().messages({
          "string.empty": "File URL is required"
        })
      })
    )
    .optional()
    .messages({
      "array.base": "fileUrl must be an array of file objects"
    })
});

