import { Router } from 'express';
import { getFileURlcreate,attechFileWithQuestion, deleteContent, getObjectMeta,createPresignedUrl,downloadFilePresignedUrlController,uplodeFileOnHubspot} from './presignedUrl.controller';
import { validate } from '../../middlewares/validater';
import { fileUploader } from '../../middlewares/multer';
import { presignedUrlSchema, fieldNameSchema,attechFileWithQuestionSchema } from './presignedUrl.validator';

export const storageRoutes = Router();

// Generate presigned URL for upload (uses fileName, fileType, fileExtension)
storageRoutes.get('/get-presigned-url', getFileURlcreate);
storageRoutes.get('/download-file-presigned-url', downloadFilePresignedUrlController);

storageRoutes.post('/create-presigned-url', validate(presignedUrlSchema), createPresignedUrl);
storageRoutes.post('/attech-file-with-question', validate(attechFileWithQuestionSchema), attechFileWithQuestion);
storageRoutes.post('/uplode-file-on-hubspot',   fileUploader("file", "files"), uplodeFileOnHubspot);



