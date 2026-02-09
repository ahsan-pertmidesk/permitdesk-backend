import { Router } from 'express';
import {
  getAllQuestions,
  getQuestionById,
  getQuestionsByConversationId,
  deleteQuestion,
  createQuestionStream,
  updateQuestionStream,
  audioUpload
} from './question.controller';
import { validate } from '../../middlewares/validater';
import { isAuthenticate } from '../../middlewares/index';
  
import { 
  createQuestionSchema,
  updateQuestionSchema,
} from './question.validator';

export const questionRoutes = Router();

// Create Question
questionRoutes.post('/',isAuthenticate,createQuestionStream);
questionRoutes.post('/without-auth',createQuestionStream);

// Get all Questions
questionRoutes.get('/:conversationId',isAuthenticate, getAllQuestions);
questionRoutes.get('/without-auth/:conversationId',getAllQuestions);

// Get Questions by Conversation ID
questionRoutes.get('/conversation/:conversationId',isAuthenticate, getQuestionsByConversationId);
questionRoutes.get('/conversation/without-auth/:conversationId',getQuestionsByConversationId);

// Get Question by ID
questionRoutes.get('/:id',isAuthenticate, getQuestionById);
questionRoutes.get('/without-auth/:id',getQuestionById);

// Update Question  
questionRoutes.put('/:conversationId/:questionId',isAuthenticate, validate(updateQuestionSchema), updateQuestionStream);
questionRoutes.put('/without-auth/:conversationId/:questionId',validate(updateQuestionSchema), updateQuestionStream);

// Delete Question
questionRoutes.delete('/:id',isAuthenticate,  deleteQuestion);
questionRoutes.delete('/without-auth/:id',deleteQuestion);

questionRoutes.post('/audio/upload',audioUpload);


export default questionRoutes;

