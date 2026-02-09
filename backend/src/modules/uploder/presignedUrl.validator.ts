import Joi from "joi";

// For generating a presigned URL for upload
export const presignedUrlSchema = Joi.object({

  fileName: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.base': '"fileName" must be a string.',
      'string.empty': '"fileName" cannot be an empty string.',
      'any.required': '"fileName" is required.',
    }),

  fileType: Joi.string()
    .required()
    .messages({
      'string.base': '"fileType" must be a string.',
      'any.required': '"fileType" is required.',
    }),

  fileExtension: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.base': '"fileExtension" must be a string.',
      'string.empty': '"fileExtension" cannot be an empty string.',
      'any.required': '"fileExtension" is required.',
    }),
});


export const attechFileWithQuestionSchema = Joi.object({
  questionId: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.base': '"questionId" must be a string.',
      'string.empty': '"questionId" cannot be an empty string.',
      'any.required': '"questionId" is required.',
    }),
  fileName: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.base': '"fileName" must be a string.',
      'string.empty': '"fileName" cannot be an empty string.',
      'any.required': '"fileName" is required.',
    }),

  fileType: Joi.string()
    .valid('videos', 'audios', 'documents', 'images')
    .required()
    .messages({
      'string.base': '"fileType" must be a string.',
      'any.only': '"fileType" must be one of [videos, audios, documents, images].',
      'any.required': '"fileType" is required.',
    }),

  fileExtension: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.base': '"fileExtension" must be a string.',
      'string.empty': '"fileExtension" cannot be an empty string.',
      'any.required': '"fileExtension" is required.',
    }),
    fileUrl: Joi.array()
    .items(
      Joi.string()
        .uri()
        .messages({
          'string.base': 'Each file URL must be a string',
          'string.uri': 'Each file URL must be a valid URI',
          'string.empty': 'File URL cannot be empty',
        })
    )
    .optional()
    .messages({
      'array.base': '"fileUrl" must be an array of strings',
    }),

});


// For operations that work with an existing S3 key
export const fieldNameSchema = Joi.object({
  fieldName: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.base': '"fieldName" must be a string.',
      'string.empty': '"fieldName" cannot be an empty string.',
      'any.required': '"fieldName" is required.',
    }),
});
