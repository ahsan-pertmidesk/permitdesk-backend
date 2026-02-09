import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import {
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  BUCKET_NAME,
  BUCKET_FOLDER,
  PRESIGNED_URL_EXPIRATION,
} from '../config/variables';
import { config } from 'dotenv';

const s3Client = new S3Client({
  region: AWS_REGION?.trim() ?? '',
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID || '',
    secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
  },
});

const PRESIGNED_URL_TTL = Number(PRESIGNED_URL_EXPIRATION) || 3600;

export const generatePresignedUrl = async ({
  fileName,
  fileExtension,
  fileType,
}: GeneratePresignedUrlParams): Promise<{
  presignedUrl: string;
  s3Url: string;
}> => {
  const uniqueFileName = `${fileName}-${uuidv4()}.${fileExtension}`;
  const s3Url = `${BUCKET_FOLDER}/${fileType}/${uniqueFileName}`;
  const contentType = mime.lookup(fileExtension) || 'application/octet-stream';

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Url,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_TTL });

  return { presignedUrl, s3Url };
};

export const deleteFileFromS3 = async (fileKey: string): Promise<void> => {
  if (!fileKey) throw new Error('File key is required');

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  try {
    await s3Client.send(command);
    console.log(`File deleted successfully: ${fileKey}`);
  } catch (error: any) {
    throw new Error(`Error deleting file from S3: ${error.message}`);
  }
};

export const getObjectMetadata = async (bucketName: string, key: string) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return await s3Client.send(command);
  } catch (error) {
    console.error('Error fetching metadata:', error);
  }
};


// export const getPresignedUrl = async (fieldName: string): Promise<string> => {
//   const command = new GetObjectCommand({
//     Bucket: BUCKET_NAME,
//     Key: fieldName,
//   });
//   return await getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_TTL });
// };

export const getFilePresignedUrl = async (fileKey: string): Promise<string> => {
  if (!fileKey) throw new Error("File key is required");

  const fileType = mime.lookup(fileKey) || "application/octet-stream";

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ResponseContentType: fileType, 
  
  });

  return await getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_TTL });
};


export type GeneratePresignedUrlParams = {
  fileName: string;
  fileExtension: string;
  fileType: string;
};

export type S3ClientConfig = {
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
};


export const downloadFilePresignedUrl = async (fileKey: string): Promise<string> => {
  if (!fileKey) throw new Error("File key is required");

  const fileType = mime.lookup(fileKey) || "application/octet-stream";
  
  // Extract filename from the key (last part after /)
  const fileName = fileKey.split('/').pop() || fileKey;

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ResponseContentType: fileType,
    ResponseContentDisposition: `attachment; filename="${fileName}"`, // Forces download
  });

  return await getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_TTL }); 
};