import ApiResponse from '../../../middlewares/apiResponse';
import { catchAsync } from '../../../middlewares/index';
import { DBQuery } from '../../../services/dbservices';

let SuggestedQuestionsQuery = new DBQuery('SuggestedQuestions');

// Create SuggestedQuestions
export const createSuggestedQuestions = catchAsync(async (req, res, next) => {
  const { question } = req.body;

  const SuggestedQuestions = await SuggestedQuestionsQuery.create({
    question,
  });  

  return res
    .status(201)
    .json(new ApiResponse(201, 'Suggested Questions created successfully', SuggestedQuestions));
});

// Get all SuggestedQuestionss
export const getAllSuggestedQuestions = catchAsync(async (req, res, next) => {

  const result = await SuggestedQuestionsQuery.findMany({});

  return res
    .status(200)
    .json(new ApiResponse(200, 'Suggested Questions retrieved successfully', result));
});

// Get SuggestedQuestions by ID
export const getSuggestedQuestionsById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const SuggestedQuestions = await SuggestedQuestionsQuery.findOne({ id }, undefined, 'Suggested Questions not found');

  return res
    .status(200)
    .json(new ApiResponse(200, 'Suggested Questions retrieved successfully', SuggestedQuestions));
});

// Update SuggestedQuestions
export const updateSuggestedQuestions = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { question } = req.body;

  // Check if SuggestedQuestions exists
  await SuggestedQuestionsQuery.findOne({ id }, undefined, 'Suggested Questions not found');

  const updatedSuggestedQuestions = await SuggestedQuestionsQuery.findByIdAndUpdate(id, {
    question,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, 'Suggested Questions updated successfully', ""));
});

// Delete SuggestedQuestions (soft delete)
export const deleteSuggestedQuestions = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Check if SuggestedQuestions exists
  await SuggestedQuestionsQuery.findOne({ id }, undefined, 'Suggested Questions not found');

  await SuggestedQuestionsQuery.findByIdAndDelete({ id });

  return res
    .status(200)
    .json(new ApiResponse(200, 'Suggested Questions deleted successfully', ''));
});

