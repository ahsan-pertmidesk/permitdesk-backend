import { Request, Response } from "express";
import { catchAsync } from "../../middlewares/index";
import ApiResponse from "../../middlewares/apiResponse";
import { generateText, generateHaikuAboutAI } from "./openai.service";

export const generateTextController = catchAsync(async (req: Request, res: Response) => {
  const { model, input, store } = req.body;

  if (!input) {
    return res.status(400).json(
      new ApiResponse(400, "Input text is required", null, false)
    );
  }

  const result = await generateText({
    model,
    input,
    store,
  });

  return res.status(200).json(
    new ApiResponse(200, "Text generated successfully", result)
  );
});

export const generateHaikuController = catchAsync(async (req: Request, res: Response) => {
  const haiku = await generateHaikuAboutAI();

  return res.status(200).json(
    new ApiResponse(200, "Haiku generated successfully", {
      output_text: haiku,
    })
  );
});

