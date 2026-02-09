import { Router } from 'express';
import {
  createConversation,
  createConversationWithoutUserId,
  getAllConversations,
  getConversationById,
  updateConversation,
  deleteConversation,
  getConversationsByIds,
} from './conversation.controller';
import { validate } from '../../middlewares/validater';
import { isAuthenticate ,isAuthorize} from '../../middlewares/index';

import {
  editConversationTitle,
} from './conversation.validator';

export const conversationRoutes = Router();



// Get all Conversations
conversationRoutes.get('/without-auth', getConversationsByIds);

conversationRoutes.get('/',isAuthenticate, getAllConversations);

conversationRoutes.get('/',isAuthenticate, getAllConversations);

// Get Conversation by ID
conversationRoutes.get('/:conversationId', getConversationById);

// Get conversations by array of IDs (no authentication)

// Update Conversation
conversationRoutes.patch('/:conversationId',isAuthenticate, validate(editConversationTitle), updateConversation);
conversationRoutes.patch('/without-auth/:conversationId', validate(editConversationTitle), updateConversation);

// Delete Conversation
conversationRoutes.delete('/:conversationId',isAuthenticate, deleteConversation);
conversationRoutes.delete('/without-auth/:conversationId', deleteConversation);

export default conversationRoutes;

