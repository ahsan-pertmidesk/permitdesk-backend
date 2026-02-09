import { catchAsync } from "../../middlewares/index"; 
import ApiResponse from "../../middlewares/apiResponse";
import { Request, Response } from "express";
import {generatePresignedUrl,getFilePresignedUrl,deleteFileFromS3,getObjectMetadata,downloadFilePresignedUrl } from "../../utils/s3";
import {GeneratePresignedUrlParams,AttachedFileWithQuestion} from './presignedUrl.types'
import { DBQuery } from '../../services/dbservices';
let    FilesQuery = new DBQuery('Files');


import {BUCKET_NAME} from '../../config/variables';
import { uploadFileToHubSpot } from "../hubspot/hubspot.service";

export const getFileURlcreate = catchAsync(async (req: Request, res: Response) => {
  const { fieldName } = req.query as { fieldName: string };
  if (!fieldName) {
    return res.status(400).json(new ApiResponse(400, "field Name is required", null));
  }
  const presignedUrl = await getFilePresignedUrl(fieldName);
  return res.status(200).json(new ApiResponse(200, 'Get presigned URL successfully', presignedUrl));
  
});  

export const createPresignedUrl = catchAsync(async (req: Request, res: Response) => {
  const { fileName, fileExtension, fileType  }: GeneratePresignedUrlParams = req.body;
  const response = await generatePresignedUrl({ fileName, fileExtension, fileType });
  res.status(201).json(new ApiResponse(201, "Presigned URL created successfully", response));
});



export const deleteContent = catchAsync(async (req: Request, res: Response) => {
  const { fieldName } = req.body;

  if (!fieldName) {
    return res.status(400).json(new ApiResponse(400, "fileKey is required", null));
  }
  
   let data =  await deleteFileFromS3(fieldName);
   return res.status(200).json(new ApiResponse(200, 'Delete content successfully', data));

});

export const getObjectMeta = catchAsync(async (req: Request, res: Response) => {
  const { fieldName } = req.query as { fieldName: string };
      
  if (!fieldName) {
    return res.status(400).json(new ApiResponse(400, "fileKey is required", null));
  }
  
   let data =  await getObjectMetadata(BUCKET_NAME??'',fieldName);
  return res.status(200).json(new ApiResponse(200, 'getObjectMetadata successfully', data));

});




export const downloadFilePresignedUrlController = catchAsync(async (req: Request, res: Response) => {
  const { fieldName } = req.query as { fieldName: string };
  if (!fieldName) {
    return res.status(400).json(new ApiResponse(400, "fileKey is required", null));
  }
  const presignedUrl = await downloadFilePresignedUrl(fieldName);
  return res.status(200).json(new ApiResponse(200, 'downloadFilePresignedUrl successfully', presignedUrl));
});



export const attechFileWithQuestion = catchAsync(async (req: Request, res: Response) => {
  const { fileName, fileExtension, fileType ,questionId,fileUrl }: AttachedFileWithQuestion = req.body;
  let data = req.body
  await FilesQuery.create(data)
    res.status(201).json(new ApiResponse(201, "File attached to question successfully",""));
});

export const uplodeFileOnHubspot = catchAsync(async (req: Request, res: Response) => {
  // Get file from multer middleware (req.file, not req.body.file)
  const file = req.file;
  
  if (!file) {
    return res.status(400).json(
      new ApiResponse(400, "File is required. Please upload a file.", null, false)
    );
  }

  try {
    // Get file buffer - multer diskStorage saves to file.path
    let fileBuffer: Buffer;
    
    if (file.buffer) {
      // Memory storage - buffer is directly available
      fileBuffer = file.buffer;
    } else if (file.path) {
      // Disk storage - read from path
      const { readFileSync, existsSync } = await import('fs');
      
      // Check if file exists
      if (!existsSync(file.path)) {
        console.error(`File not found at path: ${file.path}`);
        return res.status(500).json(
          new ApiResponse(500, "File was not saved properly", `File path does not exist: ${file.path}`, false)
        );
      }
      
      fileBuffer = readFileSync(file.path);
    } else {
      return res.status(500).json(
        new ApiResponse(500, "File buffer not available", "Unable to access file data. File object: " + JSON.stringify({ path: file.path, buffer: !!file.buffer }), false)
      );
    }
     
    // Upload to HubSpot
    const response = await uploadFileToHubSpot(
      fileBuffer,
      file.originalname || file.filename,
      file.mimetype || 'application/octet-stream',
      { 
        access: 'PUBLIC_INDEXABLE',
        folderPath: '/uploads' // Upload to /uploads folder
      }
    );

    if (!response.ok) {
      return res.status(500).json(
        new ApiResponse(500, "Failed to upload file to HubSpot", response.error, false)
      );
    }

    return res.status(201).json(
      new ApiResponse(201, "File uploaded on HubSpot successfully", {
        fileId: response.fileId,
        fileName: file.originalname || file.filename,
      })
    );
  } catch (error: any) {
    console.error('Error uploading file to HubSpot:', error);
    return res.status(500).json(
      new ApiResponse(500, "Error uploading file to HubSpot", error.message, false)
    );
  }
});