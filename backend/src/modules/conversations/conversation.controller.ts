import ApiResponse from '../../middlewares/apiResponse';
import { catchAsync } from '../../middlewares/index';
import { DBQuery } from '../../services/dbservices';
import Conversation from './conversation.types';
import { generateTitle } from '../utils/index';

let conversationQuery = new DBQuery('Conversation');
let userQuery = new DBQuery('User');

// Create Conversation (with optional userId

// Reusable function to create a conversation
export async function createConversation(title: string, userId?: string): Promise<Conversation> {
  const generatedTitle = await generateTitle(title);
  const conversation = (await conversationQuery.create({
    title: generatedTitle,
    userId: userId || null,
  })) as Conversation;
  let newConversation:any = {id: conversation.id, title:generatedTitle};
  return newConversation;
}

// Create Conversation without userId
export const createConversationWithoutUserId = catchAsync(async (req, res, next) => {
  const { title, clientId } = req.body;

  const conversation = (await conversationQuery.create({
    title,
    clientId,
    userId: null,
  })) as Conversation;

  return res
    .status(201)
    .json(new ApiResponse(201, 'Conversation created successfully', conversation));
});

// Get all Conversations
export const getAllConversations = catchAsync(async (req, res, next) => {
  let  userId  = req.user?.id;
  const result: Conversation[] = await conversationQuery.findMany({ userId: userId });

  return res
    .status(200)
    .json(new ApiResponse(200, 'Conversations retrieved successfully', result));
});

// Get Conversation by ID
export const getConversationById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const conversation: Conversation = await conversationQuery.findOne(
    { id },
    undefined,
    'Conversation not found',
  );

  return res
    .status(200)
    .json(new ApiResponse(200, 'Conversation retrieved successfully', conversation));
});


// Update Conversation
export const updateConversation = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params as { conversationId: string };
  const userId = req.user?.id?.toString() || null;
  const { title } = req.body;

  await conversationQuery.findOne(
    { id: conversationId, userId: userId || null },
    undefined,
    'Conversation not found'
  );

  const updatedConversation: Conversation = await conversationQuery.findByIdAndUpdate(
    conversationId,
    { title, userId }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, 'Conversation title updated successfully', updatedConversation));
});


// Delete Conversation (soft delete)
export const deleteConversation = catchAsync(async (req, res, next) => {
  const userId = req.user?.id;
  const { conversationId } = req.params;

  const query = { id: conversationId, userId: userId || null };

  await conversationQuery.findOne(query, undefined, 'Conversation not found');

  await conversationQuery.findByIdAndDelete({ id: conversationId });

  return res.status(200).json(
    new ApiResponse(200, 'Conversation deleted successfully', '')
  );
});



// Get conversations by array of IDs (no authentication)
export const getConversationsByIds = catchAsync(async (req, res, next) => {
  let { conversationIds } = req.query as { conversationIds: string | string[] };



  // If it's a JSON string → parse it
  if (typeof conversationIds === "string") {
    try {
      conversationIds = JSON.parse(conversationIds);
    } catch {
      conversationIds = [conversationIds as string];
    }
  }

  const conversations = await conversationQuery.findManyByManyQuery({
    where: {
      id: { in: conversationIds },
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Conversations fetched successfully", conversations));
});
