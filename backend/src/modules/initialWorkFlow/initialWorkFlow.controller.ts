import ApiResponse from '../../middlewares/apiResponse';
import { catchAsync } from '../../middlewares/index';
import { DBQuery } from '../../services/dbservices';
import { generateAnswerStream,generateQuestionPrompt,generateText,getProjectInfoFromFile } from '../utils/index';
import {downloadFilePresignedUrl} from "../../utils/s3"
import { Response } from 'express';

import {getCitiesBySateName} from '@mardillu/us-cities-utils';

import {RESPONSE_GENERATOR_MODEL} from "./../../config/variables"
let WorkFlowQuery = new DBQuery('WorkFlow');
let StepsQuery = new DBQuery('Steps');
let ClientInitialPermitInfoQuery = new DBQuery('ClientInitialPermitInfo');
let QuestionQuery = new DBQuery('Question');
let ConversationQuery = new DBQuery('Conversation');


export async function getInitialWorkFlowQuestionByUserId(
  conversationId: string | null,
  onChunk?: (chunk: string) => void
) {
  // Step 1: Find the workFlow that we want to run
  let workflowId = await WorkFlowQuery.findOneByQuery({})

  // find all work flow steps 
  let allWorkFlowSteps = await StepsQuery.findMany({workflowId:workflowId.id},{no:"asc"})

  let nextStepId = null;
  let stepAnswersJson: Record<string, string> = {};
  
  for (const step of allWorkFlowSteps) {
    const exists = await ClientInitialPermitInfoQuery.findOneByQuery({
      conversationId,
      stepId: step.id,
    });
    if (exists) {
      stepAnswersJson[step.name] = exists.clientAns || "";
    }
    if (!exists) {
      nextStepId = step.id;
      break;
    }
  }

   if (!nextStepId) {
    await ConversationQuery.findByQueryAndUpdate({id:conversationId},{
    workFlowStatus:"sendEndingMessage"
    })
     let promptText = generateQuestionPrompt({
     originalQuestion: "Thanks for submitting your project specifications! We're now working on it, and our agent will reach out to you via email soon.",
     assistantRole: "virtual assistant",
     })
    const finalAnswer = await generateAnswerStream(
    promptText,
    (chunk) => {
      if (onChunk) {
        onChunk(chunk);
      }
    }
    );
    await QuestionQuery.create({
    conversationId: conversationId,
    question:"",
    answer: finalAnswer,
    conversationType:"AiChat",
    })

    return {
     workflowCompleted: true,
     text: "",
     workflow: true
    }
  }
  // Step 2: Find the next step from the Steps table
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
          stepOptionArray: true
        }
      }
    }
  );



  //step 3 : Find the previous step id the requiredPreviousStepAns 
  let previousStepAns:any = ""
  if(stepData.requiredPreviousStepAns){
    previousStepAns = JSON.stringify(stepAnswersJson)
  }
  

 let promptText = generateQuestionPrompt({
  originalQuestion: stepData.promptText,
  previousStepAns: previousStepAns,
  assistantRole: "virtual assistant",
  includeContext: !!previousStepAns
})

  // Step 3: Call AI to get the answer using the promptText - stream chunks if callback provided
  const finalAnswer = await generateAnswerStream(
    promptText,
    (chunk) => {
      if (onChunk) {
        onChunk(chunk);
      }
    }
  );

  let workFlowStepResponse = {
    text: finalAnswer,
    stepId: stepData.id,
    workflowId: stepData.workflowId,
    stepName: stepData.name,
    questionOptions: stepData.questionOptions,
    clientAnswerType: stepData.clientAnswerType,
    questionDropDown:stepData.stepOption,
  }
  if(stepData.name === "city"){
    const stateName = stepAnswersJson["state"];
    if(stateName){
      const cities = getCitiesBySateName(stateName);
      // Extract only the city names into an array
      const cityNames = cities.map((city: any) => city.name);
      workFlowStepResponse.questionDropDown[0].stepOptionArray = cityNames;
    }
  }
  // Step 4: Return the AI-generated answer directly
  let data = {
    workFlowStepResponse,
  }
  
  return data;
}


export const getInitialWorkFlowQuestion = catchAsync(async (req, res, next) => {
  const userId = req.user?.id?.toString() || null;
  const data = await getInitialWorkFlowQuestionByUserId(userId);
  return res.status(200).json(
    new ApiResponse(200, "Answer generated successfully", data)
  );
});  






export async function saveInitialWorkFlowAns(
  userId: string | null,
  stepId: string,
  workflowId: string,
  conversationId:string,
  clientAnswer:string,
  aiQuestion:string,
  fileUrls?: any
) {
  // Validate that the step exists
  const step = await StepsQuery.findOneByQuery({ id: stepId });
  if (!step) {
    throw new Error(`Step with id ${stepId} not found`);
  }

  const data = {
    userId,
    stepId,      
    workflowId,
    conversationId,
    clientAns:clientAnswer,
    aiQuestion     
  };

  const savedAnswer = await ClientInitialPermitInfoQuery.create(data);
  await QuestionQuery.create({
    conversationId:conversationId,
    answer:clientAnswer,
    question:aiQuestion,
    stepId,
    conversationType:"workflowChat",
    files: {
      create: fileUrls ? [{
        fileName: fileUrls.fileName,
        fileUrl: fileUrls.fileUrl,
        fileType: fileUrls.fileType,
        fileExtension: fileUrls.fileExtension
      }] : []
    }
  });
  return savedAnswer;
}

export const SaveInitialWorkFlowAns = catchAsync(async (req, res, next) => {
  const userId = req.user?.id?.toString() || null;
  const { clientAnswerData, stepId, clientAns, workflowId, aiQuestion } = req.body;

  if (clientAnswerData && stepId && clientAns && workflowId) {
   // await saveInitialWorkFlowAns(userId, stepId, clientAns, workflowId, aiQuestion);
  }

  return res.status(201).json(
    new ApiResponse(201, "Answer save successfully", "")
  );
});


export const createWorkFlow = catchAsync(async (req, res, next) => {
  const data = req.body;
   
  await WorkFlowQuery.create({
      name: data.name,
      status: data.status || "active",
      steps: {
        create: data.steps.map((step:any)  => ({
          no: step.no,
          name: step.name,
          promptText: step.promptText,
          questionOptions: step.questionOptions,
          clientAnswerType: step.clientAnswerType,
          ...(step.stepOptionArray && Array.isArray(step.stepOptionArray) && step.stepOptionArray.length > 0 && {
            stepOption: {
              create: step.stepOptionArray.map((stepOption:any)  => ({
                stepOptionArray: stepOption,
              }))
            }
          })
        })),
      },
    }
  );

  return res.status(201).json(
    new ApiResponse(201, "Work flow created successfully", "")
  );
}); 




export async function uploadDocumentAndExtractInfo(
  userId: string | null,
  fileUrl: string,
  conversationId:string,
  aiQuestion:string
) {
  let workflow = await WorkFlowQuery.findOneByQuery({});
  //let stepObj = await StepsQuery.findMany({workflowId:workflow.id})

  const workflowId = workflow.id;
  const systemPrompt = `
You are a data extraction assistant. Extract the following project information from the provided document and return it in valid JSON format.

Required fields (use null if information is not provided):
- state: The state  where the project is located
- city:  The city  where the project is located


Return ONLY a valid JSON object with this exact structure:
{
  "state": <string or null>,
  "city": <string or null>,
}`;

  let response = await getProjectInfoFromFile(
    systemPrompt,
    RESPONSE_GENERATOR_MODEL,
    fileUrl
  );

  const parsedResponse = JSON.parse(response);
 
  const savedData = [];
   for (let [key, value] of Object.entries(parsedResponse)) {
     
     try {
       let stepId = await StepsQuery.findOneByQuery({
         workflowId: workflowId,
         name: key.trim(),
       });
       await QuestionQuery.create({
          conversationId:conversationId,
          answer:value,
          question: `Your project ${stepId.name} was extracted from your uploaded file.`,
          conversationType:"workflowChat",
       });
       
       if (stepId && value !== null && value !== undefined) {
         savedData.push({ key, saved: true });
        } else {
         await ClientInitialPermitInfoQuery.create({
            stepId: stepId.id,
            clientAns: value,
            aiQuestion:aiQuestion,
            workflowId: workflowId,
            conversationId:conversationId,
            userId:userId
          });
         savedData.push({ key, saved: false, reason: 'Step not found' });
       }
     } catch (dbError) {
       savedData.push({ key, saved: false, reason: 'Database error' });
     }
   }
 

  return {
    extractedData: parsedResponse,
    savedResults: savedData,
  };
}

export async function getJsonResponseFromClientPrompt(
  userId: string | null,
  fileUrl: string,
  conversationId:string,
  aiQuestion:string
) {
  let workflow = await WorkFlowQuery.findOneByQuery({});
  //let stepObj = await StepsQuery.findMany({workflowId:workflow.id})

  const workflowId = workflow.id;
  const systemPrompt = `
You are a data extraction assistant. Extract the following project information from the provided document and return it in valid JSON format.

Required fields (use null if information is not provided):
- state: The state  where the project is located
- city:  The city  where the project is located

Return ONLY a valid JSON object with this exact structure:
{
  "state": <string or null>,
  "city": <string or null>,
}`;

let response = await getProjectInfoFromFile(
  systemPrompt,
  RESPONSE_GENERATOR_MODEL,
  aiQuestion,
  fileUrl
);

const parsedResponse = JSON.parse(response);

const savedData = [];
for (let [key, value] of Object.entries(parsedResponse)) {
  
  try {
    let stepId = await StepsQuery.findOneByQuery({
      workflowId: workflowId,
      name: key.trim(),
    });
    
    if (stepId && value !== null && value !== undefined) {
      await ClientInitialPermitInfoQuery.create({
        stepId: stepId.id,
        clientAns: value,
        aiQuestion:aiQuestion,
        workflowId: workflowId,
        conversationId:conversationId,
        userId:userId
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
   conversationId:conversationId,
   answer:"",
   question: aiQuestion,
   conversationType:"AiChat",
});

  return {
    extractedData: parsedResponse,
    savedResults: savedData,
  };
}


export const uploadDoc = catchAsync(async (req, res, next) => {
  const userId = req.user?.id?.toString() || null;
  const fileUrl = req.body.fileUrl;
  
  // const result = await uploadDocumentAndExtractInfo(userId, fileUrl,"");

  // return res.status(201).json(
  //   new ApiResponse(201, "Project information extracted successfully", result)
  // );
});


