export type GeneratePresignedUrlParams = {
    fileName: string;
    fileExtension: string;
    fileType: string;
};


export type AttachedFileWithQuestion = {
    questionId :string
    fileName: string;
    fileExtension: string;
    fileType: string;
    fileUrl : string ;
};