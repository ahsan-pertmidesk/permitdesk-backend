// src/utils/CustomError.ts
export class CustomError extends Error {
    statusCode: number;
    success: boolean;
  
    constructor(message: string, statusCode: number, success: boolean) {
      super(message);
      this.statusCode = statusCode;
      this.success = success;
    }
  }