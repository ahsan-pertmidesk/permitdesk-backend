import { DBQuery } from '../../services/dbservices';
import { generateAnswerStream, generateQuestionPrompt, getProjectInfoFromFile } from '../utils/index';
import { getCitiesBySateName } from '@mardillu/us-cities-utils';
import { RESPONSE_GENERATOR_MODEL } from '../../config/variables';
import {
  DOCUMENT_EXTRACTION_SYSTEM_PROMPT,
  STATE_CITY_EXTRACTION_PROMPT,
} from './initialWorkFlow.prompts';
import type {
  GetInitialWorkFlowQuestionResult,
  SaveInitialWorkFlowAnsInput,
  CreateWorkFlowInput,
  DocumentExtractionResult,
  StateCityExtractionResult,
  SavedExtractionEntry,
  UploadDocumentResult,
  GetJsonFromClientPromptResult,
  WorkFlowStepResponse,
} from './initialWorkFlow.types';

const WorkFlowQuery = new DBQuery('WorkFlow');
const StepsQuery = new DBQuery('Steps');
const ClientInitialPermitInfoQuery = new DBQuery('ClientInitialPermitInfo');
const QuestionQuery = new DBQuery('Question');
const ConversationQuery = new DBQuery('Conversation');

/**
 * Get the next initial workflow question for a conversation.
 * Streams the AI answer via onChunk when provided.
 */
export async function getInitialWorkFlowQuestionByUserId(
  conversationId: string | null,
  onChunk?: (chunk: string) => void
): Promise<GetInitialWorkFlowQuestionResult> {
  const workflow = await WorkFlowQuery.findOneByQuery({});
  const allWorkFlowSteps = await StepsQuery.findMany(
    { workflowId: workflow.id },
    { no: 'asc' }
  );

  let nextStepId: string | null = null;
  const stepAnswersJson: Record<string, string> = {};

  for (const step of allWorkFlowSteps) {
    const exists = await ClientInitialPermitInfoQuery.findOneByQuery({
      conversationId,
      stepId: step.id,
    });
    if (exists) {
      stepAnswersJson[step.name] = exists.clientAns ?? '';
    }
    if (!exists) {
      nextStepId = step.id;
      break;
    }
  }

  if (!nextStepId) {
    await ConversationQuery.findByQueryAndUpdate(
      { id: conversationId },
      { workFlowStatus: 'sendEndingMessage' }
    );
    const promptText = generateQuestionPrompt({
      originalQuestion:
        "Thanks for submitting your project specifications! We're now working on it, and our agent will reach out to you via email soon.",
      assistantRole: 'virtual assistant',
    });
    const finalAnswer = await generateAnswerStream(promptText, (chunk) => {
      onChunk?.(chunk);
    });
    await QuestionQuery.create({
      conversationId: conversationId as string,
      question: '',
      answer: finalAnswer,
      conversationType: 'AiChat',
    });
    return {
      workflowCompleted: true,
      text: '',
      workflow: true,
    };
  }

  const stepData = await StepsQuery.findOneByQuery(
    { id: nextStepId },
    undefined,
    {
      id: true,
      name: true,
      workflowId: true,
      promptText: true,
      questionOptions: true,
      clientAnswerType: true,
      requiredPreviousStepAns: true,
      no: true,
      stepOption: {
        select: {
          stepOptionArray: true,
        },
      },
    }
  );

  const previousStepAns = stepData.requiredPreviousStepAns
    ? JSON.stringify(stepAnswersJson)
    : '';

  const promptText = generateQuestionPrompt({
    originalQuestion: stepData.promptText,
    previousStepAns,
    assistantRole: 'virtual assistant',
    includeContext: !!previousStepAns,
  });

  const finalAnswer = await generateAnswerStream(promptText, (chunk) => {
    onChunk?.(chunk);
  });

  const workFlowStepResponse: WorkFlowStepResponse = {
    text: finalAnswer,
    stepId: stepData.id,
    workflowId: stepData.workflowId,
    stepName: stepData.name,
    questionOptions: stepData.questionOptions,
    clientAnswerType: stepData.clientAnswerType,
    questionDropDown: stepData.stepOption,
  };

  if (stepData.name === 'city') {
    const stateName = stepAnswersJson['state'];
    if (stateName) {
      const cities = getCitiesBySateName(stateName);
      const cityNames = cities.map((city: { name: string }) => city.name);
      workFlowStepResponse.questionDropDown[0].stepOptionArray = cityNames;
    }
  }

  return { workFlowStepResponse };
}

/**
 * Save a single workflow step answer and create the corresponding question record.
 */
export async function saveInitialWorkFlowAns(
  input: SaveInitialWorkFlowAnsInput
): Promise<unknown> {
  const {
    userId,
    stepId,
    workflowId,
    conversationId,
    clientAnswer,
    aiQuestion,
    fileUrls,
  } = input;

  const step = await StepsQuery.findOneByQuery({ id: stepId });
  if (!step) {
    throw new Error(`Step with id ${stepId} not found`);
  }

  const savedAnswer = await ClientInitialPermitInfoQuery.create({
    userId,
    stepId,
    workflowId,
    conversationId,
    clientAns: clientAnswer,
    aiQuestion,
  });

  await QuestionQuery.create({
    conversationId,
    answer: clientAnswer,
    question: aiQuestion,
    stepId,
    conversationType: 'workflowChat',
    files: {
      create: fileUrls
        ? [
            {
              fileName: fileUrls.fileName,
              fileUrl: fileUrls.fileUrl,
              fileType: fileUrls.fileType,
              fileExtension: fileUrls.fileExtension,
            },
          ]
        : [],
    },
  });

  return savedAnswer;
}

/**
 * Create a new workflow with steps.
 */
export async function createWorkFlow(data: CreateWorkFlowInput): Promise<void> {
  await WorkFlowQuery.create({
    name: data.name,
    status: data.status ?? 'active',
    steps: {
      create: data.steps.map((step) => ({
        no: step.no,
        name: step.name,
        promptText: step.promptText,
        questionOptions: step.questionOptions,
        clientAnswerType: step.clientAnswerType,
        ...(step.stepOptionArray &&
          Array.isArray(step.stepOptionArray) &&
          step.stepOptionArray.length > 0 && {
            stepOption: {
              create: step.stepOptionArray.map((stepOption) => ({
                stepOptionArray: stepOption,
              })),
            },
          }),
      })),
    },
  });
}

/**
 * Upload a document, extract permit/project info via AI, and optionally persist by workflow step.
 */
export async function uploadDocumentAndExtractInfo(
  userId: string | null,
  fileUrl: string,
  conversationId: string,
  aiQuestion: string
): Promise<UploadDocumentResult> {
  const workflow = await WorkFlowQuery.findOneByQuery({});
  const workflowId = workflow.id;

  const response = await getProjectInfoFromFile(
    DOCUMENT_EXTRACTION_SYSTEM_PROMPT,
    RESPONSE_GENERATOR_MODEL,
    '',
    fileUrl
  );

  const parsedResponse = JSON.parse(response) as DocumentExtractionResult;
  const savedData: SavedExtractionEntry[] = [];

  for (const [key, value] of Object.entries(parsedResponse)) {
    try {
      const step = await StepsQuery.findOneByQuery({
        workflowId,
        name: key.trim(),
      });
      await QuestionQuery.create({
        conversationId,
        answer: value,
        question: `Your project ${step?.name ?? key} was extracted from your uploaded file.`,
        conversationType: 'workflowChat',
      });

      if (step && value !== null && value !== undefined) {
        savedData.push({ key, saved: true });
      } else {
        if (step) {
          await ClientInitialPermitInfoQuery.create({
            stepId: step.id,
            clientAns: value,
            aiQuestion,
            workflowId,
            conversationId,
            userId,
          });
        }
        savedData.push({ key, saved: false, reason: 'Step not found' });
      }
    } catch (dbError) {
      savedData.push({ key, saved: false, reason: 'Database error' });
    }
  }

  return {
    extractedData: parsedResponse,
  };
}

/**
 * Extract state and city from document via AI and persist to workflow steps.
 */
export async function getJsonResponseFromClientPrompt(
  userId: string | null,
  fileUrl: string,
  conversationId: string,
  aiQuestion: string
): Promise<GetJsonFromClientPromptResult> {
  const workflow = await WorkFlowQuery.findOneByQuery({});
  const workflowId = workflow.id;

  const response = await getProjectInfoFromFile(
    STATE_CITY_EXTRACTION_PROMPT,
    RESPONSE_GENERATOR_MODEL,
    aiQuestion,
    fileUrl
  );

  const parsedResponse = JSON.parse(response) as StateCityExtractionResult;
  const savedData: SavedExtractionEntry[] = [];

  for (const [key, value] of Object.entries(parsedResponse)) {
    try {
      const step = await StepsQuery.findOneByQuery({
        workflowId,
        name: key.trim(),
      });

      if (step && value !== null && value !== undefined) {
        await ClientInitialPermitInfoQuery.create({
          stepId: step.id,
          clientAns: value,
          aiQuestion,
          workflowId,
          conversationId,
          userId,
        });
        savedData.push({ key, saved: true });
      } else {
        savedData.push({ key, saved: false, reason: 'Step not found' });
      }
    } catch (dbError) {
      savedData.push({ key, saved: false, reason: 'Database error' });
    }
  }

  await QuestionQuery.create({
    conversationId,
    answer: '',
    question: aiQuestion,
    conversationType: 'AiChat',
  });

  return {
    extractedData: parsedResponse,
    savedResults: savedData,
  };
}
