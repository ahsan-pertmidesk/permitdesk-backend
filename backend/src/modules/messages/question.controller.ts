import ApiResponse from '../../middlewares/apiResponse';
import { catchAsync } from '../../middlewares/index';
import { DBQuery } from '../../services/dbservices';
import  Question  from './question.types'
import OpenAI from "openai";
import { Response } from 'express';
import getRawBody from "raw-body";
import { createConversation } from '../conversations/conversation.controller';
import { generateAnswerStreamForFileAndText } from '../utils/index';
import {downloadFilePresignedUrl, getFilePresignedUrl} from "../../utils/s3"
import {OPENAI_API_KEY,RESPONSE_GENERATOR_MODEL ,VOICE_TO_TEXT_MODEL,FOLDER_ID,FRONTEND_URL} from "../../config/variables"
import {getInitialWorkFlowQuestionByUserId, saveInitialWorkFlowAns, uploadDocumentAndExtractInfo,
  getJsonResponseFromClientPrompt
} from "../initialWorkFlow/initialWorkFlow.service"
import { createHubSpotTicket, uploadFileFromS3AndAttachToTicket, importFileFromUrlAndAttachToTicket, attachFileToTicket, attachFileIdToTicket, addChatUrlNoteToTicket } from '../hubspot/hubspot.service';
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });


let ConversationQuery = new DBQuery('Conversation');
let QuestionQuery = new DBQuery('Question');
let ClientInitialPermitInfoQuery = new DBQuery('ClientInitialPermitInfo');


// Helper function to send SSE chunk
function sendSSEChunk(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}


export const createQuestionStream = catchAsync(async (req, res, next) => {
  let userId = req.user?.id.toString() || null;
  let { conversationId, question,fileUrl,workFlowStepData } = req.body;
  let hubSpotContactId = req.user?.hubSpotContactId || req.body.hubSpotContactId;
  if (!conversationId) {
      const newConversation = await createConversation(question, userId as string);
      await ConversationQuery.findOne({ id: newConversation?.id }, undefined, 'Conversation not found');
      conversationId = newConversation?.id;
     } 
    else {
      await ConversationQuery.findOne({ id: conversationId }, undefined, 'Conversation not found');
      conversationId = conversationId;
    }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx
  
  
  let {workflowId,stepId,clientAnswer,aiQuestion} = workFlowStepData?.clientAnswerData || {}
  let fileData:any = workFlowStepData?.fileData
  
  if(workFlowStepData?.clientAnswerData){
    await saveInitialWorkFlowAns({
      userId,
      stepId,
      workflowId,
      conversationId,
      clientAnswer,
      aiQuestion: aiQuestion ?? '',
      fileUrls: fileData ?? undefined,
    })
  }

  if(question){
    await getJsonResponseFromClientPrompt(userId,fileUrl,conversationId,question)
  }

  if(workFlowStepData?.fileData){
        await ClientInitialPermitInfoQuery.create({
            stepId: workFlowStepData?.clientAnswerData?.stepId,
            clientAns: "fileUpload",
            aiQuestion:aiQuestion,
            workflowId: workflowId,   
            conversationId:conversationId,
            userId:userId
          });
          let conversation = await ConversationQuery.findOneByQuery({id:conversationId})
          if (hubSpotContactId) {
            let ticketData = {
              subject: conversation.title,
              content: "",
              hs_pipeline: '0',
              hs_pipeline_stage: '1',
              source_type: 'CHAT',
             // category: 'General',
              priority: 'MEDIUM',
            };
            const ticketResult = await createHubSpotTicket(hubSpotContactId, ticketData);
            
            // Update Conversation with ticket ID if ticket was created successfully
            if (ticketResult.ok && ticketResult.ticketId) {
              await ConversationQuery.findByIdAndUpdate(conversationId, {
                ticketId: ticketResult.ticketId
              });
            }
          }
    let getTicketId = await ConversationQuery.findOneByQuery({id:conversationId})

   
    await attachFileIdToTicket(getTicketId.ticketId,fileData.fileId);
    let conversationPublickUrl = `${FRONTEND_URL}/share/?conversationId=${conversationId}`
    await addChatUrlNoteToTicket(getTicketId.ticketId,conversationPublickUrl);

   
      try {
        // Get conversation to retrieve ticketId
        const conversation = await ConversationQuery.findOneByQuery({ id: conversationId });
        
        if (conversation?.ticketId) {          
          for (const file of fileData) {
            try {
              const result = await uploadFileFromS3AndAttachToTicket(
                file.url, // S3 key
                file.name,
                conversation.ticketId
              );
              
              if (result.ok) {
                console.log(`✅ File ${file.fileName} attached to ticket ${conversation.ticketId}`);
              } else {
                console.error(`❌ Failed to attach file ${file.fileName}:`, result.error);
              }
            } catch (fileErr: any) {
              console.error(`❌ Error attaching file ${file.fileName}:`, fileErr.message);
              // Continue with other files even if one fails
            }
          }
        } else {
          console.log(`⚠️ No ticketId found for conversation ${conversationId}. Skipping file attachment.`);
        }
      } catch (err: any) {
        console.error(`❌ Error processing file attachments:`, err.message);
        // Don't fail the request if file attachment fails
      }
    }  
  
  

  let checkTheWorkFlowStatus = await ConversationQuery.findOneByQuery({id:conversationId})
  if(checkTheWorkFlowStatus?.workFlowStatus === "started"){
    const stepData:any = await getInitialWorkFlowQuestionByUserId(
      conversationId,
      (chunk: string) => {
        sendSSEChunk(res, {
          type: 'chunk',
          content: chunk,
        });
      }
    );
    //stepData.conversationId = conversationId;
     
    if(stepData?.workflowCompleted){
      // Stream workflow completed message in chunks
      const completionText = stepData.text;
      for (const char of completionText) {
        sendSSEChunk(res, {
          type: 'chunk',
          content: char,
        });
      }
      sendSSEChunk(res, {
        type: 'done',
        text: completionText,
        workflow: true,
        conversationId
      });
      res.end();
      return;
    }
    
    if(stepData?.workFlowStepResponse){
      // Send workflow step metadata after streaming is done
      sendSSEChunk(res, {
        type: 'done',
        stepData,
        conversationId
      });
      res.end();
      return;
    }
  }
  
  
  try {
  
      // Stream the answer
      const answer = await generateAnswerStreamForFileAndText(
      question,
      (chunk: string) => {
        // Send each chunk to the client as it arrives
        sendSSEChunk(res, {
          type: 'chunk',
          content: chunk,
        });
      },
      RESPONSE_GENERATOR_MODEL,
      fileUrl||undefined
    );

    // Save the complete question and answer to database
    let  fileUrls = req.body.fileUrl
    await QuestionQuery.create({
    conversationId: conversationId,
    question,
    answer,
    conversationType:"AiChat",
    ...(fileUrls?.length && {
      files: {
        create: fileUrls.map((file: any) => ({
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileType: file.fileType,
          fileExtension: file.fileExtension
        }))
      }
    })
   });

 //console.log("🚀 ~ data:", data)


    // Send completion signal
    sendSSEChunk(res, {
      type: 'done',
      conversationId: conversationId,
      answer: answer,
    });

    res.end();
  } catch (error: any) {
    // Send error to client
    sendSSEChunk(res, {
      type: 'error',
      message: error.message || 'An error occurred while generating the answer',
    });
    res.end();
  }
});

// Get all Questions
export const getAllQuestions = catchAsync(async (req, res, next) => {
  const userId = req.user?.id?.toString();
  const conversationId = req.params.conversationId;


  // Verify conversation belongs to the user
  await ConversationQuery.findOne(
    { id: conversationId, userId },
    undefined,
    'Conversation not found'
  );

// Fetch all questions for the conversation
const result = await QuestionQuery.findMany(
  { conversationId },   // query
  { createdAt: "asc" },          // sort
  { 
    id:true,
    question:true,
    answer:true,
    questionType:true,
    createdAt:true, 
    conversationId:true,
    conversationType:true,
    // include
    files: {
      select: {
        fileName: true,
        fileUrl: true,
      },
    },
    step:{
        select: {
          questionOptions:true
        }
    }
  }
);

  // Generate presigned URLs for each file
  for (const question of result) {
    if (question.files && question.files.length > 0) {
      question.files = await Promise.all(
        question.files.map(async (file:any) => {
          const presignedUrl = await getFilePresignedUrl(file.fileUrl);
          return {
            ...file,
            presignedUrl,
          };
        })
      );
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, 'Questions retrieved successfully', result)
    );
});


// Get Question by ID
export const getQuestionById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const question: Question = await QuestionQuery.findOne(
    { id },
    undefined,
    'Question not found',
  );

  return res
    .status(200)
    .json(new ApiResponse(200, 'Question retrieved successfully', question));
});

// Get Questions by Conversation ID
export const getQuestionsByConversationId = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;

  // Verify conversation exists
  await ConversationQuery.findOne({ id: conversationId }, undefined, 'Conversation not found');

  const questions: Question[] = await QuestionQuery.findMany({
    conversationId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, 'Questions retrieved successfully', questions));
});


// Update Question with Streaming (SSE)
export const updateQuestionStream = catchAsync(async (req, res) => {
  const userId = req.user?.id?.toString() || null;
  const { conversationId, questionId } = req.params;
  const { question, fileUrl } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    await ConversationQuery.findOne(
      { id: conversationId, userId },
      undefined,
      "Conversation not found"
    );

    const oldQuestion = await QuestionQuery.findOne(
      { id: questionId },
      undefined,
      "Question not found"
    );

    sendSSEChunk(res, {
      type: "metadata",
      conversationId,
      questionId,
    });

    const answer = await generateAnswerStreamForFileAndText(
      question,
      (chunk: string) => {
        sendSSEChunk(res, {
          type: "chunk",
          content: chunk,
        });
      },
      RESPONSE_GENERATOR_MODEL,
      fileUrl || undefined
    );

      await QuestionQuery.findByIdAndUpdate(questionId, {
      question,
      answer,
      files:[]
    });

    await QuestionQuery.findByIdAndUpdate(questionId, {
      question,
      answer,
      ...(fileUrl?.length && {
        files: {
          create: fileUrl.map((file: any) => ({
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            fileType: file.fileType,
            fileExtension: file.fileExtension,
          })),
        },
      }),
    });

    await QuestionQuery.softDeleteMany(
      { createdAt: { gt: oldQuestion.createdAt } },
      { deletedAt: new Date() }
    );

    sendSSEChunk(res, {
      type: "done",
      conversationId,
      questionId,
      answer,
    });

    res.end();
  } catch (error: any) {
    sendSSEChunk(res, {
      type: "error",
      message: error.message || "An error occurred while updating the question",
    });
    res.end();
  }
});

// Delete Question (soft delete)
export const deleteQuestion = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Check if Question exists
  await QuestionQuery.findOne({ id }, undefined, 'Question not found');

  await QuestionQuery.findByIdAndDelete({ id });

  return res
    .status(200)
    .json(new ApiResponse(200, 'Question deleted successfully', ''));
}); 




export const audioUpload = catchAsync(async (req, res, next) => {
  // Read raw binary body
  const buffer = await getRawBody(req);

  // Convert Buffer to File-like object
  const file = new File([buffer as any], "audio.webm", { type: "audio/webm" });

  const response = await openai.audio.transcriptions.create({
    model: VOICE_TO_TEXT_MODEL||"whisper-1",
    file: file,
    language: "en",
    prompt: "Transcribe clearly.",
  });

  const text = response.text?.trim() || "";

  return res.status(200).json(
    new ApiResponse(200, "Transcription successful", text)
  );
});




