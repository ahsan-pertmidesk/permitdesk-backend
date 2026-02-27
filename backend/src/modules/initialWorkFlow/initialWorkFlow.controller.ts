import ApiResponse from '../../middlewares/apiResponse';
import { catchAsync } from '../../middlewares/index';
import {
  getInitialWorkFlowQuestionByUserId,
  saveInitialWorkFlowAns,
  createWorkFlow as createWorkFlowService,
  uploadDocumentAndExtractInfo,
} from './initialWorkFlow.service';
import type { CreateWorkFlowInput, SaveInitialWorkFlowAnsInput } from './initialWorkFlow.types';

/**
 * GET /initial-workflow (or /without-auth)
 * Returns the next workflow question for the current user's conversation.
 */
export const getInitialWorkFlowQuestion = catchAsync(async (req, res) => {
  const userId = req.user?.id?.toString() ?? null;
  const data = await getInitialWorkFlowQuestionByUserId(userId, undefined);
  return res
    .status(200)
    .json(new ApiResponse(200, 'Answer generated successfully', data));
});

/**
 * POST /initial-workflow
 * Saves the client's answer for a workflow step.
 */
export const SaveInitialWorkFlowAns = catchAsync(async (req, res) => {
  const userId = req.user?.id?.toString() ?? null;
  const { clientAnswerData, stepId, clientAns, workflowId, aiQuestion } = req.body;

  if (clientAnswerData && stepId && clientAns && workflowId) {
    const input: SaveInitialWorkFlowAnsInput = {
      userId,
      stepId,
      workflowId,
      conversationId: clientAnswerData.conversationId ?? req.body.conversationId,
      clientAnswer: clientAns,
      aiQuestion: aiQuestion ?? '',
      fileUrls: clientAnswerData?.fileUrls ?? null,
    };
    await saveInitialWorkFlowAns(input);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, 'Answer save successfully', ''));
});

/**
 * POST /crete-work-flow-and-step
 * Creates a new workflow with steps (admin/internal).
 */
export const createWorkFlow = catchAsync(async (req, res) => {
  const data: CreateWorkFlowInput = req.body;
  await createWorkFlowService(data);
  return res
    .status(201)
    .json(new ApiResponse(201, 'Work flow created successfully', ''));
});

/**
 * POST /upload-file
 * Uploads a document and extracts project/permit info via AI.
 */
export const uploadDoc = catchAsync(async (req, res) => {
  const userId = req.user?.id?.toString() ?? null;
  const { fileUrl, conversationId, aiQuestion } = req.body;
  const result = await uploadDocumentAndExtractInfo(
    userId,
    fileUrl,
    conversationId ?? '0276bafb-4bc8-446a-b454-05262f396b67',
    aiQuestion ?? ''
  );
  return res
    .status(201)
    .json(new ApiResponse(201, 'Project information extracted successfully', result));
});
