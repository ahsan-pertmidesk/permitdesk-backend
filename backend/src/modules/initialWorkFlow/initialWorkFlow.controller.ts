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
You are a specialized data extraction assistant for building permits and construction documents.

Your task is to extract project information from the provided document and return ONLY a valid JSON object.

# EXTRACTION RULES
1. Return ONLY valid JSON — no markdown, comments, or explanations.
2. Use null for any field where information is missing or cannot be determined.
3. Extract values exactly as written in the document — do not modify, interpret, or normalize.
4. For multi-select fields, return an array of all applicable values.
5. Carefully examine tables, headers, footers, and images for relevant data.

---

# FIELD DEFINITIONS WITH DETAILED EXPLANATIONS

## BASIC PROJECT INFORMATION (string | null)

**typeOfWork** - based on the project description.
- The type of work being performed on the building.
- Examples: "New Construction", "Alteration", "Foundation Only", "Electrical Permit"

**address**
- The complete street address of the construction project site.
- Include street number, street name, unit/suite number, city, state, and ZIP code if available.
- Example: "123 Main Street, Suite 100, Chicago, IL 60601"

**pin**
- Property Identification Number (PIN), also known as Parcel ID or Tax ID.
- A unique identifier assigned to the property by the county assessor.
- Format varies by jurisdiction (e.g., "12-34-567-890-0000").

**scopeAndDescriptionOfWork**
- A high-level summary describing the overall scope and purpose of the construction project.
- This is typically a brief overview found at the beginning of the application.Description of work- must always begin with “SELF-CERT 2019 CBRC:”
- Example: "Complete interior renovation of existing office space including new MEP systems."



**areaOfWork**
- The total area of the work or area of project in square feet.

**descriptionOfWork**
- A detailed breakdown of the specific construction activities to be performed.
- More granular than scopeAndDescriptionOfWork — includes specific tasks.

**existingZoningUse**
- The current zoning classification or land for the property BEFORE the proposed work.
- Example: "C1-2" (Commercial), "RS-3" (Residential Single-Family), "M1-1" (Manufacturing)

**proposedZoningUse**
- The zoning classification or land use  that will apply AFTER the proposed work.
- If no change, this may be the same as existingZoningUse.


## NUMERIC FIELDS (number | null)

**landAreaSqFt**
- The total land/lot area of the property in square feet.
- This refers to the entire parcel size, not just the building footprint.
- Extract only the numeric value without units.

**floorArea**
- The total floor area of the building in square feet.
- May refer to gross floor area or net floor area depending on context.
- Extract only the numeric value.

**buildingHeight**
- The total height of the building measured in feet.
- Typically measured from grade to the highest point of the roof.
- Extract only the numeric value.

**numberOfDwellingUnits**
- The count of individual residential dwelling units in the building.
- A dwelling unit is a single unit providing complete independent living facilities.
- Examples: apartments, condos, townhouses. For single-family homes, this is typically 1.

---

## SINGLE-SELECT FIELDS (string | null)
Choose exactly ONE value from the allowed options:

**structuralPeerReview**
- Indicates whether an independent structural peer review is required for this project.
- Required for complex structural systems, high-rise buildings, or unusual designs.
- Analyze the project scope and complexity to determine if structural peer review applies.
- Allowed values: "Yes", "No"

**occupancySeparations**
- Describes how different occupancy types within the building are separated (per building code).
- "Single occupancy" — Building contains only one occupancy classification.
- "Single main occupancy with accessory occupancies" — One primary use with minor secondary uses (e.g., office building with small storage).
- "Separated mixed occupancies" — Multiple occupancy types separated by fire-rated construction.
- "Nonseparated mixed occupancies" — Multiple occupancy types not separated; most restrictive requirements apply to entire building.
- Allowed values: "Single occupancy", "Single main occupancy with accessory occupancies", "Separated mixed occupancies", "Nonseparated mixed occupancies"

**constructionType**
- The building's construction type classification per International Building Code (IBC).
- Based on fire resistance ratings of structural elements:
  - Type I (IA, IB): Fire-resistive construction — highest fire resistance, typically concrete/steel high-rises.
  - Type II (IIA, IIB): Non-combustible construction — steel/concrete but with less fire resistance than Type I.
  - Type III (IIIA, IIIB): Ordinary construction — non-combustible exterior walls, interior may be combustible.
  - Type IV: Heavy timber construction — large wood members that resist fire through mass.
  - Type V (VA, VB): Wood-frame construction — combustible materials allowed throughout.
- "A" suffix = protected (1-hour minimum fire rating), "B" suffix = unprotected.
- Allowed values: "IA", "IB", "IIA", "IIB", "IIIA", "IIIB", "IV", "VA", "VB"

---

## Multi-Select Fields (array of strings | null)
Select multiple values that apply from the allowed values:
Type of Work - Building rehabilitation - based on permit scope description- most often “Alteration”
**typeOfWorkBuildingRehabilitation:**
- "Addition"
- "Alteration"
- "Change of occupancy"
- "Interior demolition only"
- "Relocate building"
- "Repair"

**complianceDetails:** - select any after review the file.
- "Repair only"
- "Prescriptive compliance method"
- "Work area compliance method"
- "Performance compliance method"

**occupancyClassifications:** 
Select multiple values that apply from the allowed values: Array of strings
Possible codes:
A-1, A-2, A-3, A-4, A-5, B, E-1, E-2, F-1, F-2, H-1, H-2, H-3, H-4, H-5, 
I-1 Condition 1, I-1 Condition 2, I-2 Condition 1, I-2 Condition 2, 
I-3 Condition 1, I-3 Condition 2, I-3 Condition 3, I-3 Condition 4, I-3 Condition 5, 
I-4, M, R-1, R-2, R-3, R-4 Condition 1, R-4 Condition 2, R-5, S-1, S-2, U

Status: "Existing" or "Proposed"

---

## Nested Object Fields

**buildingCharacteristics** (object | null):
{
  "buildingHeight": number | null, The height of the building in feet
  "numberOfStories": number | null, The number of stories in the building
  "buildingArea": number | null, The area of the building in square feet
  "numberOfDwellingUnits": 0 
  "numberOfSleepingUnits": 0 
}

Return null if the entire section is missing from the document.

---

## Array of Objects

**contractors** (array | null):
[
  {
    "type": string,      // e.g., "General Contractor", "Architect", "Engineer"
    "name": string,      // Full name or company name
    "address": string    // Full address
  }
]

Return null if no contractors are listed. Include all contractors found in the document.

---

# OUTPUT SCHEMA

Return EXACTLY this JSON structure with these exact field names:

{
  "address": null,
  "pin": null,
  "typeOfWork": null,
  "scopeAndDescriptionOfWork": null,
  "areaOfWork": null,
  "descriptionOfWork": null,
  "existingZoningUse": null,
  "proposedZoningUse": null,
  "structuralPeerReview": null,
  "landAreaSqFt": null,
  "floorArea": null,
  "typeOfWorkBuildingRehabilitation": null,
  "complianceDetails": null,
  "occupancyClassifications": null,
  "occupancySeparations": null,
  "constructionType": null,
  "buildingCharacteristics": null,
  "contractors": null
}

Remember: Return ONLY the JSON object with actual extracted values. Use null for any field where information cannot be found or determined.
`;


  let response = await getProjectInfoFromFile(
    systemPrompt,
    RESPONSE_GENERATOR_MODEL,
    "",
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
  //  savedResults: savedData,
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
  
  const result = await uploadDocumentAndExtractInfo(userId, fileUrl,"0276bafb-4bc8-446a-b454-05262f396b67","");

  return res.status(201).json(
    new ApiResponse(201, "Project information extracted successfully", result)
  );
});


