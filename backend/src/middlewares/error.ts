import { NextFunction, Request, Response } from "express";
import { CustomError } from './customError'

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const errorHandler: any = (err:any, req:any, res:any, next:any) => {
  console.log("🚀 ~ err:", err)
  // Log the error stack or message

  // Check if the error is an instance of CustomError
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      status: err.statusCode,
      message: err.message,
      success: err.success,
      data: null,
    });
  }

  // Handle generic errors
  res.status(500).json({
    status: 500,
    message: 'Internal Server Error',
    success: false,
    data: null,
    error: err.message
  });
};
